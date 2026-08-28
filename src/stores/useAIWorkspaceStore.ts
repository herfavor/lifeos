/**
 * AI Workspace Store
 *
 * Single source of truth for the AI Command Center transcripts and proposals.
 * Persisted to localStorage so the standalone page survives navigation.
 *
 * Tool mode and chat mode are fully isolated: each keeps its own transcript,
 * composer draft and execution feedback, plus its own archive list. Archiving
 * or deleting one mode's conversation never touches the other mode.
 *
 * The provider configuration remains in `useTerminalStore` for compatibility
 * with existing encrypted keys from older releases.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  AgentChatMessage,
  ExecutionRecord,
  ProposedAction,
} from '../services/ai/agent/types';

const STORAGE_KEY = 'lifeos-ai-workspace-v1';
const PERSIST_VERSION = 3;
const MAX_PERSISTED_MESSAGES = 200;
const MAX_EXECUTION_RECORDS = 20;
/** Cap per-mode archives so localStorage cannot grow without bound. */
export const MAX_ARCHIVED_CONVERSATIONS = 20;

export type AIWorkspaceMode = 'tools' | 'chat';

const MODES: readonly AIWorkspaceMode[] = ['tools', 'chat'] as const;

/** Live (in-use) conversation of one mode. */
export interface AIWorkspaceConversation {
  messages: AgentChatMessage[];
  /** Compact feedback loop injected into subsequent tool-mode prompts. */
  recentExecutions: ExecutionRecord[];
  /** Composer draft kept per mode so inputs never leak across modes. */
  draft: string;
}

/** One archived conversation, scoped to the mode it was used in. */
export interface ArchivedAIConversation extends AIWorkspaceConversation {
  id: string;
  mode: AIWorkspaceMode;
  /** Derived from the first user message; shown in the archive list. */
  title: string;
  archivedAt: number;
}

type ConversationMap = Record<AIWorkspaceMode, AIWorkspaceConversation>;
type ArchiveMap = Record<AIWorkspaceMode, ArchivedAIConversation[]>;

export function createEmptyConversation(): AIWorkspaceConversation {
  return { messages: [], recentExecutions: [], draft: '' };
}

function createEmptyConversations(): ConversationMap {
  return { tools: createEmptyConversation(), chat: createEmptyConversation() };
}

function createEmptyArchives(): ArchiveMap {
  return { tools: [], chat: [] };
}

/** Derive a short list title from the first user message of a conversation. */
export function deriveConversationTitle(messages: AgentChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  const text = (firstUser?.content ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return '未命名对话';
  return text.length > 24 ? `${text.slice(0, 24)}…` : text;
}

function toArchive(
  mode: AIWorkspaceMode,
  conversation: AIWorkspaceConversation
): ArchivedAIConversation {
  return {
    ...conversation,
    id: uuidv4(),
    mode,
    title: deriveConversationTitle(conversation.messages),
    archivedAt: Date.now(),
  };
}

function patchConversationMessages(
  conversation: AIWorkspaceConversation,
  messageId: string,
  transform: (message: AgentChatMessage) => AgentChatMessage
): AIWorkspaceConversation {
  let touched = false;
  const messages = conversation.messages.map((m) => {
    if (m.id !== messageId) return m;
    touched = true;
    return transform(m);
  });
  return touched ? { ...conversation, messages } : conversation;
}

interface AIWorkspaceState {
  /** Which mode's surface (tools / chat) is currently active. */
  mode: AIWorkspaceMode;
  /** Per-mode live transcripts — tool mode and chat mode never share messages. */
  conversations: ConversationMap;
  /** Per-mode archive lists (newest first). */
  archives: ArchiveMap;
  isStreaming: boolean;
  streamingContent: string;

  setMode: (mode: AIWorkspaceMode) => void;

  /** Append a message to the ACTIVE mode's transcript. */
  addMessage: (
    message: Omit<AgentChatMessage, 'id' | 'ts'> & { id?: string; ts?: number }
  ) => string;
  /** Patch a message wherever it lives (pending cards must stay actionable across modes). */
  updateMessage: (id: string, patch: Partial<AgentChatMessage>) => void;
  updateAction: (
    messageId: string,
    actionId: string,
    patch: Partial<ProposedAction>
  ) => void;
  setStreaming: (isStreaming: boolean) => void;
  appendStreamingChunk: (chunk: string) => void;
  resetStreamingContent: () => void;
  setInputDraft: (draft: string, mode?: AIWorkspaceMode) => void;
  recordExecutions: (records: ExecutionRecord[], mode?: AIWorkspaceMode) => void;

  /** Wipe one mode's live conversation (default: active mode). */
  clearConversation: (mode?: AIWorkspaceMode) => void;
  /** Move one mode's live conversation into that mode's archive (default: active). Returns false when there is nothing to archive. */
  archiveConversation: (mode?: AIWorkspaceMode) => boolean;
  /** Put an archived conversation back as its mode's live conversation; the current live conversation (if any) is archived first so nothing is lost. */
  restoreConversation: (mode: AIWorkspaceMode, archiveId: string) => void;
  /** Permanently delete one archived conversation. */
  deleteArchivedConversation: (mode: AIWorkspaceMode, archiveId: string) => void;
  /** Permanently delete every archived conversation of one mode (default: active). */
  clearArchives: (mode?: AIWorkspaceMode) => void;
}

export const useAIWorkspaceStore = create<AIWorkspaceState>()(
  persist(
    (set) => ({
      mode: 'tools',
      conversations: createEmptyConversations(),
      archives: createEmptyArchives(),
      isStreaming: false,
      streamingContent: '',

      setMode: (mode) =>
        set((state) => (state.mode === mode ? state : { mode })),

      addMessage: (message) => {
        const id = message.id ?? uuidv4();
        const ts = message.ts ?? Date.now();
        set((state) => {
          const current = state.conversations[state.mode];
          return {
            conversations: {
              ...state.conversations,
              [state.mode]: {
                ...current,
                messages: [...current.messages, { ...message, id, ts }],
              },
            },
          };
        });
        return id;
      },

      updateMessage: (id, patch) =>
        set((state) => ({
          conversations: {
            tools: patchConversationMessages(state.conversations.tools, id, (m) => ({
              ...m,
              ...patch,
            })),
            chat: patchConversationMessages(state.conversations.chat, id, (m) => ({
              ...m,
              ...patch,
            })),
          },
        })),

      updateAction: (messageId, actionId, patch) =>
        set((state) => ({
          conversations: {
            tools: patchConversationMessages(state.conversations.tools, messageId, (m) => {
              if (!m.actions) return m;
              return {
                ...m,
                actions: m.actions.map((a) =>
                  a.id === actionId ? { ...a, ...patch } : a
                ),
              };
            }),
            chat: patchConversationMessages(state.conversations.chat, messageId, (m) => {
              if (!m.actions) return m;
              return {
                ...m,
                actions: m.actions.map((a) =>
                  a.id === actionId ? { ...a, ...patch } : a
                ),
              };
            }),
          },
        })),

      setStreaming: (isStreaming) => set({ isStreaming }),

      appendStreamingChunk: (chunk) =>
        set((state) => ({ streamingContent: state.streamingContent + chunk })),

      resetStreamingContent: () => set({ streamingContent: '' }),

      setInputDraft: (draft, mode) =>
        set((state) => {
          const target = mode ?? state.mode;
          const current = state.conversations[target];
          if (current.draft === draft) return state;
          return {
            conversations: {
              ...state.conversations,
              [target]: { ...current, draft },
            },
          };
        }),

      recordExecutions: (records, mode) =>
        set((state) => {
          const target = mode ?? state.mode;
          const current = state.conversations[target];
          return {
            conversations: {
              ...state.conversations,
              [target]: {
                ...current,
                recentExecutions: [...records, ...current.recentExecutions].slice(
                  0,
                  MAX_EXECUTION_RECORDS
                ),
              },
            },
          };
        }),

      clearConversation: (mode) =>
        set((state) => {
          const target = mode ?? state.mode;
          const current = state.conversations[target];
          if (current.messages.length === 0 && current.recentExecutions.length === 0) {
            return state;
          }
          return {
            conversations: {
              ...state.conversations,
              [target]: { ...current, messages: [], recentExecutions: [] },
            },
            streamingContent: '',
            isStreaming: false,
          };
        }),

      archiveConversation: (mode) => {
        const state = useAIWorkspaceStore.getState();
        if (state.isStreaming) return false;
        const target = mode ?? state.mode;
        const current = state.conversations[target];
        if (current.messages.length === 0 && current.recentExecutions.length === 0) {
          return false;
        }
        set({
          conversations: {
            ...state.conversations,
            [target]: { ...current, messages: [], recentExecutions: [] },
          },
          archives: {
            ...state.archives,
            [target]: [toArchive(target, current), ...state.archives[target]].slice(
              0,
              MAX_ARCHIVED_CONVERSATIONS
            ),
          },
        });
        return true;
      },

      restoreConversation: (mode, archiveId) => {
        const state = useAIWorkspaceStore.getState();
        if (state.isStreaming) return;
        const archived = state.archives[mode].find((a) => a.id === archiveId);
        if (!archived) return;
        const current = state.conversations[mode];
        let nextArchives = state.archives[mode].filter((a) => a.id !== archiveId);
        // Keep the live conversation safe: archive it before it is replaced.
        if (current.messages.length > 0 || current.recentExecutions.length > 0) {
          nextArchives = [toArchive(mode, current), ...nextArchives].slice(
            0,
            MAX_ARCHIVED_CONVERSATIONS
          );
        }
        set({
          conversations: {
            ...state.conversations,
            [mode]: {
              messages: archived.messages,
              recentExecutions: archived.recentExecutions,
              draft: '',
            },
          },
          archives: {
            ...state.archives,
            [mode]: nextArchives,
          },
        });
      },

      deleteArchivedConversation: (mode, archiveId) =>
        set((state) => ({
          archives: {
            ...state.archives,
            [mode]: state.archives[mode].filter((a) => a.id !== archiveId),
          },
        })),

      clearArchives: (mode) =>
        set((state) => {
          const target = mode ?? state.mode;
          if (state.archives[target].length === 0) return state;
          return {
            archives: {
              ...state.archives,
              [target]: [],
            },
          };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        conversations: {
          tools: persistableConversation(state.conversations.tools),
          chat: persistableConversation(state.conversations.chat),
        },
        archives: {
          tools: state.archives.tools.slice(0, MAX_ARCHIVED_CONVERSATIONS),
          chat: state.archives.chat.slice(0, MAX_ARCHIVED_CONVERSATIONS),
        },
      }),
      migrate: (persistedState) => {
        const legacy =
          typeof persistedState === 'object' && persistedState !== null
            ? (persistedState as Record<string, unknown>)
            : {};
        // v1/v2 kept ONE shared transcript for both modes. It belongs to the
        // mode that was last active; archives did not exist yet.
        if (Array.isArray(legacy.messages)) {
          const legacyMessages = legacy.messages as AgentChatMessage[];
          const legacyExecutions = Array.isArray(legacy.recentExecutions)
            ? (legacy.recentExecutions as ExecutionRecord[])
            : [];
          const lastMode: AIWorkspaceMode = legacy.mode === 'chat' ? 'chat' : 'tools';
          return {
            mode: lastMode,
            conversations: {
              tools:
                lastMode === 'tools'
                  ? { ...createEmptyConversation(), messages: legacyMessages, recentExecutions: legacyExecutions }
                  : createEmptyConversation(),
              chat:
                lastMode === 'chat'
                  ? { ...createEmptyConversation(), messages: legacyMessages, recentExecutions: legacyExecutions }
                  : createEmptyConversation(),
            },
            archives: createEmptyArchives(),
          };
        }

        // Already v3-shaped (or unknown): normalise defensively.
        const conversations = createEmptyConversations();
        const rawConversations =
          typeof legacy.conversations === 'object' && legacy.conversations !== null
            ? (legacy.conversations as Record<string, unknown>)
            : {};
        for (const modeKey of MODES) {
          const raw = rawConversations[modeKey];
          if (raw && typeof raw === 'object') {
            const record = raw as Partial<AIWorkspaceConversation>;
            conversations[modeKey] = {
              messages: Array.isArray(record.messages) ? record.messages : [],
              recentExecutions: Array.isArray(record.recentExecutions)
                ? record.recentExecutions
                : [],
              draft: typeof record.draft === 'string' ? record.draft : '',
            };
          }
        }

        const archives = createEmptyArchives();
        const rawArchives =
          typeof legacy.archives === 'object' && legacy.archives !== null
            ? (legacy.archives as Record<string, unknown>)
            : {};
        for (const modeKey of MODES) {
          const raw = rawArchives[modeKey];
          if (Array.isArray(raw)) {
            archives[modeKey] = raw.filter(
              (item): item is ArchivedAIConversation =>
                !!item &&
                typeof item === 'object' &&
                typeof (item as ArchivedAIConversation).id === 'string' &&
                Array.isArray((item as ArchivedAIConversation).messages)
            );
          }
        }

        return {
          mode: legacy.mode === 'chat' ? 'chat' : 'tools',
          conversations,
          archives,
        };
      },
    }
  )
);

function persistableConversation(
  conversation: AIWorkspaceConversation
): AIWorkspaceConversation {
  return {
    ...conversation,
    messages: conversation.messages.slice(-MAX_PERSISTED_MESSAGES),
    recentExecutions: conversation.recentExecutions.slice(0, MAX_EXECUTION_RECORDS),
  };
}

/** Find which mode owns a message (pending action cards stay actionable cross-mode). */
export function locateAIMessage(
  state: Pick<AIWorkspaceState, 'conversations'>,
  messageId: string
): { mode: AIWorkspaceMode; message: AgentChatMessage } | null {
  for (const mode of MODES) {
    const found = state.conversations[mode].messages.find((m) => m.id === messageId);
    if (found) return { mode, message: found };
  }
  return null;
}
