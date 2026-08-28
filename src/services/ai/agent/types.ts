/**
 * Agent Types
 *
 * Shared type definitions for the conversational management layer
 * ("AI 指挥中心"). The agent lets the model *propose* structured actions
 * (create/update/delete tasks, events and notes); every write action is
 * rendered as a confirmation card and only executed after explicit user
 * approval — consistent with LifeOS's local-first, confirm-first posture.
 *
 * The protocol is intentionally provider-agnostic: models emit a fenced
 * ```json block containing an `actions` array instead of relying on native
 * function calling, so all 9 configured providers work identically.
 */

/** Every tool the agent model may call. */
export type AgentToolId =
  // Tasks
  | 'list_tasks'
  | 'create_task'
  | 'update_task'
  | 'complete_task'
  | 'delete_task'
  | 'archive_task'
  | 'restore_task'
  | 'add_checklist_item'
  | 'toggle_checklist_item'
  | 'delete_checklist_item'
  | 'add_comment'
  | 'add_subtask'
  | 'toggle_subtask'
  // Calendar
  | 'list_events'
  | 'create_event'
  | 'update_event'
  | 'delete_event'
  // Notes
  | 'create_note'
  | 'append_note'
  | 'update_note'
  | 'archive_note'
  | 'delete_note'
  | 'restore_note'
  | 'pin_note'
  | 'list_notes'
  // Project contexts
  | 'list_projects'
  | 'create_project'
  | 'update_project'
  | 'archive_project'
  // Link library
  | 'list_links'
  | 'create_link'
  | 'update_link'
  | 'delete_link'
  // Automations
  | 'list_automations'
  | 'create_automation'
  | 'toggle_automation'
  | 'delete_automation'
  // Habits
  | 'list_habits'
  | 'create_habit'
  | 'complete_habit'
  | 'archive_habit'
  // Energy
  | 'list_energy'
  | 'log_energy'
  // Time tracking
  | 'list_time_entries'
  | 'start_timer'
  | 'stop_timer'
  | 'add_time_entry'
  | 'delete_time_entry'
  // Focus mode
  | 'start_focus'
  | 'end_focus'
  // Daily planning
  | 'add_goal'
  | 'toggle_goal'
  // Routines
  | 'list_routines'
  | 'create_routine'
  | 'delete_routine'
  // Resources
  | 'list_resources'
  | 'create_resource'
  | 'update_resource'
  // Task templates
  | 'list_templates'
  | 'create_template';

/** Risk classification used by the UI and confirmation policy. */
export type AgentToolRisk = 'read' | 'write';

/** Raw action emitted by the model (pre-validation). */
export interface RawAgentAction {
  tool: string;
  params?: Record<string, unknown>;
}

/** A validated action ready for confirmation/execution. */
export interface ValidatedAction {
  tool: AgentToolId;
  params: Record<string, unknown>;
}

/** Outcome of executing one action against the local stores. */
export interface ActionResult {
  success: boolean;
  /** Human-readable (zh-CN) outcome description shown on the action card. */
  message: string;
  /** ID of the created/affected entity, when applicable. */
  refId?: string;
  /** Present on write actions: how to reverse this execution (audit log undo). */
  undo?: UndoDescriptor;
}

/** Entity kinds that support one-click undo. */
export type UndoKind =
  | 'task'
  | 'event'
  | 'note'
  | 'project'
  | 'link'
  | 'automation'
  | 'habit'
  | 'energy'
  | 'time'
  | 'focus'
  | 'goal'
  | 'routine'
  | 'resource'
  | 'template';

/** What happened to the entity; paired with kind to select the inverse op. */
export type UndoAction =
  | 'created'
  | 'updated'
  | 'completed'
  | 'archived'
  | 'deleted'
  | 'checked'
  | 'logged'
  | 'started'
  | 'stopped'
  | 'toggled';

/** Serialisable description of how to reverse one executed action. */
export interface UndoDescriptor {
  kind: UndoKind;
  action: UndoAction;
  /** Entity id created/affected by the action. */
  refId?: string;
  /** Operation-specific before-data (field values, dates, etc.). */
  detail?: Record<string, unknown>;
  /** zh-CN one-liner shown in the audit log, e.g. 撤销「创建任务」. */
  label: string;
}

/** Lifecycle of a proposed action card. */
export type ProposedActionStatus =
  | 'pending' // awaiting user confirmation
  | 'executing'
  | 'executed'
  | 'failed'
  | 'rejected' // user dismissed the card
  | 'blocked'; // read-only mode intercepted the write

/** One actionable proposal rendered as a card in the chat transcript. */
export interface ProposedAction {
  id: string;
  tool: AgentToolId;
  params: Record<string, unknown>;
  status: ProposedActionStatus;
  /** Short zh-CN summary of what this action will do, e.g. 创建任务「X」 */
  summary: string;
  result?: ActionResult;
  /** How this action was executed: auto mode or explicit confirmation. */
  source?: 'auto' | 'confirmed';
  /** Audit-log record id (set after execution) so cards can undo directly. */
  logId?: string;
  createdAt: number;
}

/** One compact record of an auto-executed read query within a turn. */
export interface AITraceEntry {
  tool: AgentToolId;
  /** zh-CN tool label, e.g. 查询任务列表 */
  label: string;
  /** One-line outcome, e.g. 查到 6 个任务 */
  summary: string;
  /** Full raw result (expandable in the UI). */
  detail: string;
  ok: boolean;
}

/** A chat message in the shared AI workspace transcript. */
export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** Display text with action JSON blocks stripped out. */
  content: string;
  ts: number;
  /** Present on assistant messages that proposed actions. */
  actions?: ProposedAction[];
  /** Marks transport/provider failures so the UI can style them. */
  isError?: boolean;
  provider?: string;
  model?: string;
  /**
   * Intermediate tool-calling round (read queries auto-executed). Hidden from
   * the transcript — the final answer carries a compact `trace` instead —
   * but kept in history/persistence so pending cards stay actionable.
   */
  transient?: boolean;
  /** Compact 操作过程 strip attached to the final answer of a multi-round turn. */
  trace?: AITraceEntry[];
}

/** Compact execution record fed back into subsequent prompts. */
export interface ExecutionRecord {
  tool: AgentToolId;
  summary: string;
  success: boolean;
  at: number;
}

/** Result of parsing one assistant reply. */
export interface ParsedAgentReply {
  /** Reply text safe to render (fenced action blocks removed). */
  cleanedText: string;
  /** Validated proposals; invalid ones carry a `failed` status + reason. */
  actions: ProposedAction[];
}
