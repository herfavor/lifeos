/**
 * Agent Action Parser
 *
 * Extracts structured action payloads from assistant replies without
 * relying on provider-native function calling, keeping the agent loop
 * identical across all 9 AI providers.
 *
 * Protocol: the model appends a fenced ```json block:
 *
 *   ```json
 *   { "actions": [ { "tool": "create_task", "params": { "title": "…" } } ] }
 *   ```
 *
 * Blocks whose JSON does not contain an `actions` array are treated as
 * ordinary code samples and left untouched in the display text.
 *
 * Models frequently emit slightly invalid JSON when a payload carries long
 * Markdown (note bodies): literal newlines inside string values, embedded
 * ``` fences that terminate the outer fence early, or trailing commas.
 * The extractor therefore repairs common defects before giving up, so
 * write proposals still render as confirmation cards instead of being
 * silently swallowed as "code samples".
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../logger';
import type {
  AgentChatMessage,
  AgentToolId,
  ParsedAgentReply,
  ProposedAction,
  RawAgentAction,
} from './types';
import { buildActionSummary, AGENT_TOOLS, validateRawAction } from './tools';

const log = logger.module('AIAgent');

const FENCED_BLOCK_RE = /```([a-zA-Z]*)[ \t]*\n([\s\S]*?)```/g;

interface ExtractedPayload {
  /** Absolute span of the consumed region in the source text. */
  start: number;
  end: number;
  actions: RawAgentAction[];
}

/** Pull every `actions` array out of an already-parsed payload value. */
function harvestActions(parsed: unknown): RawAgentAction[] | null {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const maybe = (parsed as { actions?: unknown }).actions;
    if (Array.isArray(maybe)) {
      return maybe.filter(
        (a): a is RawAgentAction =>
          Boolean(a) && typeof a === 'object' && typeof (a as RawAgentAction).tool === 'string'
      );
    }
    return null;
  }
  // A plain array of {tool,...} objects is also accepted.
  if (Array.isArray(parsed)) {
    return parsed.filter(
      (a): a is RawAgentAction =>
        Boolean(a) && typeof a === 'object' && typeof (a as RawAgentAction).tool === 'string'
    );
  }
  return null;
}

/**
 * Repair common model-emitted JSON defects without touching string
 * contents beyond escaping: literal control characters inside string
 * values are escaped, and trailing commas before `}`/`]` are dropped.
 * Returns null when the text ends inside an unterminated string.
 */
function repairJsonCandidate(input: string): string | null {
  const out: string[] = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        out.push(ch);
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        out.push(ch);
        continue;
      }
      if (ch === '"') {
        inString = false;
        out.push(ch);
        continue;
      }
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        out.push(
          code === 0x0a
            ? '\\n'
            : code === 0x0d
              ? '\\r'
              : code === 0x09
                ? '\\t'
                : `\\u${code.toString(16).padStart(4, '0')}`
        );
        continue;
      }
      out.push(ch);
      continue;
    }
    if (ch === '"') {
      inString = true;
      out.push(ch);
      continue;
    }
    if (ch === ',') {
      // Drop a trailing comma when the next significant char closes a scope.
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) j++;
      if (j < input.length && (input[j] === '}' || input[j] === ']')) continue;
      out.push(ch);
      continue;
    }
    out.push(ch);
  }
  return inString ? null : out.join('');
}

/**
 * Find the end of the balanced JSON object/array that opens at `openIdx`.
 * Backticks and other prose characters are inert here — only strings and
 * bracket depth matter — so payloads truncated by embedded ``` fences can
 * still be recovered from the surrounding full text.
 */
function scanBalancedJsonEnd(text: string, openIdx: number): number | null {
  const open = text[openIdx];
  if (open !== '{' && open !== '[') return null;
  const closeCh = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0 && ch === closeCh) return i + 1;
    }
  }
  return null;
}

interface ParsedCandidate {
  actions: RawAgentAction[];
}

/**
 * Attempt strict parse → repair parse on a candidate JSON substring.
 */
function parseCandidate(candidate: string): ParsedCandidate | null {
  try {
    const actions = harvestActions(JSON.parse(candidate.trim()));
    if (actions) return { actions };
  } catch {
    /* fall through to repair */
  }
  const repaired = repairJsonCandidate(candidate);
  if (repaired === null) return null;
  try {
    const actions = harvestActions(JSON.parse(repaired));
    if (actions) return { actions };
  } catch {
    return null;
  }
  return null;
}

/**
 * Recover an actions payload starting at/near `from` by balanced-scanning
 * the FULL text (immune to embedded ``` fences), then repairing it.
 * Returns the recovered actions plus the absolute end index to consume.
 */
function recoverFromPosition(
  text: string,
  from: number
): { actions: RawAgentAction[]; end: number } | null {
  for (let idx = text.indexOf('{', from); idx !== -1; idx = text.indexOf('{', idx + 1)) {
    const end = scanBalancedJsonEnd(text, idx);
    if (end === null) return null; // unbalanced rest-of-text: no point scanning on
    const candidate = parseCandidate(text.slice(idx, end));
    if (candidate) return { actions: candidate.actions, end };
    // Bound the scan so a huge non-JSON document doesn't trigger O(n²) work.
    if (end - idx > 64_000) return null;
  }
  return null;
}

function overlaps(start: number, end: number, spans: Array<{ start: number; end: number }>): boolean {
  return spans.some((s) => start < s.end && end > s.start);
}

/** Pull every action payload out of an assistant reply. */
export function extractActionPayloads(text: string): ExtractedPayload[] {
  const payloads: ExtractedPayload[] = [];
  const taken: Array<{ start: number; end: number }> = [];

  FENCED_BLOCK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FENCED_BLOCK_RE.exec(text)) !== null) {
    const body = match[2];
    const bodyStart = match.index + 3 + match[1].length + 1; // fence + lang + newline
    if (overlaps(match.index, match.index + match[0].length, taken)) continue;

    const direct = parseCandidate(body);
    if (direct) {
      const end = match.index + match[0].length;
      payloads.push({ start: match.index, end, actions: direct.actions });
      taken.push({ start: match.index, end });
      continue;
    }

    // Malformed/truncated payload — attempt recovery via balanced scan.
    // Blocks that stay unrecoverable are left untouched as ordinary
    // code samples, consistent with the documented protocol.
    const recovered = recoverFromPosition(text, bodyStart - 1);
    if (!recovered) continue;
    // Consume through the next closing fence after the recovered object
    // so no raw JSON residue is left in the display text.
    const nextFence = text.indexOf('```', recovered.end);
    const end =
      nextFence !== -1 ? Math.max(nextFence + 3, match.index + match[0].length) : recovered.end;
    if (overlaps(match.index, end, taken)) continue;
    payloads.push({ start: match.index, end, actions: recovered.actions });
    taken.push({ start: match.index, end });
  }

  // Models sometimes emit the payload without any fencing at all.
  const UNFENCED_RE = /\{\s*"actions"\s*:/g;
  let unfenced: RegExpExecArray | null;
  while ((unfenced = UNFENCED_RE.exec(text)) !== null) {
    if (overlaps(unfenced.index, unfenced.index + 1, taken)) continue;
    const end = scanBalancedJsonEnd(text, unfenced.index);
    if (end === null) break;
    const candidate = parseCandidate(text.slice(unfenced.index, end));
    if (candidate) {
      payloads.push({ start: unfenced.index, end, actions: candidate.actions });
      taken.push({ start: unfenced.index, end });
    }
    UNFENCED_RE.lastIndex = end;
  }

  payloads.sort((a, b) => a.start - b.start);
  return payloads;
}

/**
 * Parse a completed assistant reply into display text plus validated
 * proposed actions ready for the confirmation UI.
 *
 * options.strictToolSweep   tools mode: strip any residual `actions` JSON
 *                           (fenced or not) that fails to parse, so the
 *                           transcript never shows raw tool-contract noise.
 * options.suppressFailedReads  tools mode: dropped instead of rendering a
 *                           failed card when a READ query has bad params.
 */
export function parseAgentReply(
  text: string,
  options: { strictToolSweep?: boolean; suppressFailedReads?: boolean } = {}
): ParsedAgentReply {
  const payloads = extractActionPayloads(text);
  if (payloads.length === 0) {
    return {
      cleanedText: options.strictToolSweep ? sweepResidualActionJson(text) : text.trim(),
      actions: [],
    };
  }

  // Rebuild display text from the regions not consumed by action payloads.
  let cleanedText = '';
  let cursor = 0;
  for (const payload of payloads) {
    cleanedText += text.slice(cursor, payload.start);
    cursor = Math.max(cursor, payload.end);
  }
  cleanedText += text.slice(cursor);
  if (options.strictToolSweep) {
    cleanedText = sweepResidualActionJson(cleanedText);
  }

  const actions: ProposedAction[] = [];
  for (const payload of payloads) {
    for (const raw of payload.actions) {
      const validation = validateRawAction(raw);
      if (validation.ok) {
        actions.push({
          id: uuidv4(),
          tool: validation.action.tool,
          params: validation.action.params,
          status: 'pending',
          summary: buildActionSummary(validation.action.tool, validation.action.params),
          createdAt: Date.now(),
        });
      } else if (AGENT_TOOLS[raw.tool as AgentToolId]) {
        // Query probes with bad params: drop quietly in tools mode — the
        // model will re-ask without the offending key on the next round.
        const risk = AGENT_TOOLS[raw.tool as AgentToolId].risk;
        if (risk === 'read' && options.suppressFailedReads && raw.tool.startsWith('list_')) {
          log.info('Dropping invalid read query', { tool: raw.tool, error: validation.error });
          continue;
        }
        // Known tool with bad params — surface as a failed card so the user
        // can see what the model tried and re-ask.
        actions.push({
          id: uuidv4(),
          tool: raw.tool as AgentToolId,
          params: raw.params ?? {},
          status: 'failed',
          summary: buildActionSummary(raw.tool as AgentToolId, raw.params ?? {}),
          result: { success: false, message: `参数无效：${validation.error}` },
          createdAt: Date.now(),
        });
      } else {
        log.warn('Dropping action with unknown tool', { tool: raw.tool });
      }
    }
  }

  return { cleanedText: cleanedText.replace(/\n{3,}/g, '\n\n').trim(), actions };
}

/**
 * Remove leftover action-contract JSON from display text (tools mode only).
 * Runs after extraction, so only code that FAILED to become a card survives
 * the sweep — it is never legitimate display content in tools mode.
 */
function sweepResidualActionJson(text: string): string {
  let out = text;

  // 1. Fenced blocks that look like a tool payload.
  const FENCE_SWEEP_RE = /```[a-zA-Z]*[ \t]*\n([\s\S]*?)```/g;
  out = out.replace(FENCE_SWEEP_RE, (whole, body: string) => {
    if (body.includes('"actions"') && /"tool"\s*:/.test(body)) return '';
    if (body.trimStart().startsWith('{') && body.includes('"actions"')) return '';
    return whole;
  });

  // 2. Unfenced balanced objects that mention actions + a known tool id.
  const UNFENCED_SWEEP_RE = /\{\s*"actions"\s*:/g;
  let match: RegExpExecArray | null;
  const re = new RegExp(UNFENCED_SWEEP_RE.source, 'g');
  const removals: Array<{ start: number; end: number }> = [];
  while ((match = re.exec(out)) !== null) {
    const end = scanBalancedJsonEnd(out, match.index);
    if (end === null) break;
    const candidate = out.slice(match.index, end);
    if (candidate.includes('"tool"') && /"(list_|create_|update_|delete_|complete_|archive_|restore_|toggle_|add_|start_|stop_|log_|append_|pin_)/.test(candidate)) {
      removals.push({ start: match.index, end });
    }
    re.lastIndex = end;
  }
  for (const removal of removals.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, removal.start) + out.slice(removal.end);
  }
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Build the conversation history sent back to the provider. Executed /
 * rejected actions are folded into compact bracket notes so follow-up turns
 * know what already happened without leaking raw JSON noise.
 */
export function historyForProvider(messages: AgentChatMessage[]): Array<{
  role: 'user' | 'assistant' | 'system';
  content: string;
}> {
  return messages.map((m) => {
    if (m.role !== 'assistant' || !m.actions?.length) {
      return { role: m.role, content: m.content };
    }
    const notes = m.actions
      .map((a) => {
        switch (a.status) {
          case 'executed':
            return `[已执行 ${a.summary}${a.result?.message ? `：${a.result.message}` : ''}]`;
          case 'failed':
            return `[执行失败 ${a.summary}：${a.result?.message ?? ''}]`;
          case 'rejected':
            return `[用户拒绝 ${a.summary}]`;
          case 'pending':
            return `[待确认 ${a.summary}]`;
          default:
            return null;
        }
      })
      .filter(Boolean)
      .join(' ');
    const suffix = notes ? `\n${notes}` : '';
    return { role: m.role, content: `${m.content}${suffix}`.trim() };
  });
}
