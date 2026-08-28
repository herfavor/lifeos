/**
 * AI Agent Panel Store
 *
 * Tiny UI state for the global AI side panel (the shared surface that opens
 * from the sidebar 「AI 助手」 entry, the floating button and Ctrl/Cmd+Shift+A).
 * The conversation itself lives in useAIWorkspaceStore; this only tracks
 * visibility so every entry point toggles the same panel.
 */

import { create } from 'zustand';

interface AgentPanelState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useAgentPanelStore = create<AgentPanelState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
