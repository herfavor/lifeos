/**
 * AI Terminal Component
 * Persistent AI assistant with multi-provider chat interface
 *
 * Features:
 * - Multiple AI providers (OpenRouter, Groq, HuggingFace, Mistral, Gemini, OpenAI, Anthropic, xAI)
 * - Provider/model selection
 * - Automatic fallback on errors
 * - Usage tracking
 * - Encrypted API key storage
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTerminalStore } from '../stores/useTerminalStore';
import { useNotesStore } from '../stores/useNotesStore';
import { useFoldersStore } from '../stores/useFoldersStore';
import { createDefaultRouter } from '../services/ai/providerRouter';
import { ProviderSettings } from './ProviderSettings';
import { ModelSelector } from './ModelSelector';
import { UsageTracker } from './UsageTracker';
import { TerminalHelpModal } from './TerminalHelpModal';
import { Terminal as PhantomTerminal, Preview as PhantomPreview } from './PhantomShell';
import { usePhantomShellStore } from '../stores/usePhantomShellStore';
import { runCommand, createShellContext, setRouter as setAICommandRouter } from '../services/phantomShell';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import {
  SaveToNotesButton,
  SaveConversationModal,
  AI_TERMINAL_MODAL_ROOT_ID,
  ConversationPanel,
  SystemPromptPanel,
  CodeBlock,
  TokenUsageBar,
  MessageTokenBadge,
  ConversationExportButton,
  ConversationSearchPanel,
} from './terminal';
import { getDefaultSystemPrompt } from '../services/systemPrompts';
import { buildCrossModuleContext, contextToSystemPrompt } from '../services/ai/contextBuilder';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Eye,
  FileText,
  HelpCircle,
  Keyboard,
  MessageSquare,
  Mic,
  Monitor,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Shuffle,
  Sparkles,
  User,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useShortcut } from '../hooks/useShortcut';
import {
  AI_TERMINAL_FOLDER_NAME,
  getOrCreateQuickNote,
  appendToQuickNote,
  getQuickNoteSummary,
  moveContentToDailyNote,
} from '../services/aiTerminalNotes';
import { useToastStore } from '../stores/useToastStore';
import type { NotesSortField } from '../stores/useTerminalStore';

type TerminalMode = 'chat' | 'shell' | 'notes';

/**
 * Custom sanitization schema for AI-generated content
 * Extends default schema to allow safe code elements while blocking dangerous ones
 *
 * Security: This prevents XSS attacks from malicious AI responses
 */
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    // Text formatting
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins', 'mark',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Code
    'pre', 'code',
    // Quotes & dividers
    'blockquote', 'hr',
    // Links (href will be sanitized)
    'a',
    // Tables
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Other safe elements
    'span', 'div',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: ['href', 'title', 'target', 'rel'],
    code: ['className'], // For syntax highlighting classes
    pre: ['className'],
    span: ['className'],
    div: ['className'],
  },
  // Force safe link attributes
  protocols: {
    href: ['http', 'https', 'mailto'],
  },
};

export const AITerminal: React.FC = () => {
  const {
    isOpen,
    activeProvider,
    activeModel,
    providers,
    fallbackEnabled,
    messages,
    isStreaming,
    setOpen,
    setActiveProvider,
    addMessage,
    setStreaming,
    activeConversationId,
    createConversation,
    saveCurrentConversation,
    customSystemPrompt,
    recordTokenUsage,
  } = useTerminalStore();

  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [showProviderSettings, setShowProviderSettings] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showUsageTracker, setShowUsageTracker] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSaveConversation, setShowSaveConversation] = useState(false);
  const [showConversationPanel, setShowConversationPanel] = useState(false);
  const [showSystemPromptPanel, setShowSystemPromptPanel] = useState(false);
  const [showConversationSearch, setShowConversationSearch] = useState(false);
  const [fallbackNotification, setFallbackNotification] = useState<string | null>(null);
  const [terminalMode, setTerminalMode] = useState<TerminalMode>('chat');
  const [configuredProviderCount, setConfiguredProviderCount] = useState(0);

  // Phantom Shell state
  const phantomStore = usePhantomShellStore();
  const [shellInput, setShellInput] = useState('');

  // Notes state
  const navigate = useNavigate();
  const notesStore = useNotesStore();
  const foldersStore = useFoldersStore();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteEditContent, setNoteEditContent] = useState('');
  const noteEditRef = useRef<HTMLTextAreaElement>(null);

  // Quick Note state
  const [quickNoteInput, setQuickNoteInput] = useState('');
  const [isAddingQuickNote, setIsAddingQuickNote] = useState(false);
  const quickNoteInputRef = useRef<HTMLInputElement>(null);

  // Move to Daily Note state
  const [selectedText, setSelectedText] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  // Context-aware AI
  const activeContext = useTerminalStore((s) => s.activeContext);
  const setActiveContext = useTerminalStore((s) => s.setActiveContext);

  // Sort state from terminal store
  const notesSortField = useTerminalStore((s) => s.notesSortField);
  const notesSortOrder = useTerminalStore((s) => s.notesSortOrder);
  const setNotesSortField = useTerminalStore((s) => s.setNotesSortField);
  const setNotesSortOrder = useTerminalStore((s) => s.setNotesSortOrder);

  // Get AI Terminal folder and notes (excluding Quick Note)
  const aiTerminalNotes = useMemo(() => {
    // Find the AI Terminal folder
    const folders = Object.values(foldersStore.folders);
    const aiTerminalFolder = folders.find(
      (f) => f.name === AI_TERMINAL_FOLDER_NAME && f.parentId === null
    );

    if (!aiTerminalFolder) {
      return [];
    }

    // Get notes in the AI Terminal folder, excluding Quick Note
    const allNotes = notesStore.getAllNotes();
    const folderNotes = allNotes.filter(
      (n) => n.folderId === aiTerminalFolder.id && !n.isQuickNote
    );

    // Sort based on user preference
    return folderNotes.sort((a, b) => {
      let comparison = 0;
      switch (notesSortField) {
        case 'updatedAt':
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
        case 'createdAt':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      return notesSortOrder === 'desc' ? comparison : -comparison;
    });
  }, [foldersStore.folders, notesStore, notesSortField, notesSortOrder]);

  // Get Quick Note (separate from regular notes)
  const quickNote = useMemo(() => {
    const folders = Object.values(foldersStore.folders);
    const aiTerminalFolder = folders.find(
      (f) => f.name === AI_TERMINAL_FOLDER_NAME && f.parentId === null
    );
    if (!aiTerminalFolder) return null;

    const allNotes = notesStore.getAllNotes();
    return allNotes.find(
      (n) => n.folderId === aiTerminalFolder.id && n.isQuickNote
    ) || null;
  }, [foldersStore.folders, notesStore]);

  // Get Quick Note summary
  const quickNoteSummary = useMemo(() => {
    if (!quickNote) return { entryCount: 0, lastEntryTime: null };
    return getQuickNoteSummary();
  }, [quickNote]);

  // Get the currently selected note
  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return notesStore.getNote(selectedNoteId);
  }, [selectedNoteId, notesStore]);

  // Handle opening a note for viewing
  const handleOpenNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
    setIsEditingNote(false);
    const note = notesStore.getNote(noteId);
    if (note) {
      setNoteEditContent(note.contentText || '');
    }
  }, [notesStore]);

  // Handle entering edit mode
  const handleStartEditing = useCallback(() => {
    if (selectedNote) {
      setNoteEditContent(selectedNote.contentText || '');
      setIsEditingNote(true);
      // Focus textarea after render
      setTimeout(() => noteEditRef.current?.focus(), 0);
    }
  }, [selectedNote]);

  // Handle saving edits
  const handleSaveNote = useCallback(() => {
    if (selectedNoteId && noteEditContent !== undefined) {
      notesStore.updateNote(selectedNoteId, {
        contentText: noteEditContent,
        // For now, keep existing Lexical content - a full implementation would convert markdown to Lexical
      });
      setIsEditingNote(false);
    }
  }, [selectedNoteId, noteEditContent, notesStore]);

  // Handle going back to list
  const handleBackToList = useCallback(() => {
    if (isEditingNote) {
      // Auto-save on back
      handleSaveNote();
    }
    setSelectedNoteId(null);
    setIsEditingNote(false);
  }, [isEditingNote, handleSaveNote]);

  // Handle Quick Note submission
  const handleQuickNoteSubmit = useCallback(async () => {
    if (!quickNoteInput.trim()) return;

    setIsAddingQuickNote(true);
    try {
      // This will create the Quick Note if it doesn't exist
      appendToQuickNote(quickNoteInput.trim());
      setQuickNoteInput('');
      // Focus back on input after adding
      setTimeout(() => quickNoteInputRef.current?.focus(), 0);
    } finally {
      setIsAddingQuickNote(false);
    }
  }, [quickNoteInput]);

  // Handle opening Quick Note
  const handleOpenQuickNote = useCallback(() => {
    // Get or create the Quick Note and open it
    const qn = getOrCreateQuickNote();
    handleOpenNote(qn.id);
  }, [handleOpenNote]);

  // Handle text selection in textarea (for Move to Daily Note)
  const handleTextSelection = useCallback(() => {
    if (noteEditRef.current) {
      const start = noteEditRef.current.selectionStart;
      const end = noteEditRef.current.selectionEnd;
      if (start !== end) {
        const text = noteEditContent.substring(start, end);
        setSelectedText(text);
      } else {
        setSelectedText('');
      }
    }
  }, [noteEditContent]);

  // Handle Move to Daily Note action
  const handleMoveToDaily = useCallback(() => {
    if (!selectedText.trim()) {
      addToast('warning', '请先选择要移动到每日笔记的文本');
      return;
    }

    try {
      const dailyNote = moveContentToDailyNote(selectedText);

      // Update the edit content by removing the selected text
      if (noteEditRef.current) {
        const start = noteEditRef.current.selectionStart;
        const end = noteEditRef.current.selectionEnd;
        const newContent = noteEditContent.substring(0, start) + noteEditContent.substring(end);
        setNoteEditContent(newContent);
      }

      setSelectedText('');
      addToast('success', `已移动到 ${dailyNote.title}`);
    } catch (error) {
      addToast('error', '无法将内容移动到每日笔记');
    }
  }, [selectedText, noteEditContent, addToast]);

  // Handle sort change
  const handleSortChange = useCallback((field: NotesSortField) => {
    if (field === notesSortField) {
      // Toggle order if same field
      setNotesSortOrder(notesSortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      // Set new field with default order
      setNotesSortField(field);
      setNotesSortOrder(field === 'title' ? 'asc' : 'desc');
    }
  }, [notesSortField, notesSortOrder, setNotesSortField, setNotesSortOrder]);

  // Voice input
  const voiceInput = useVoiceInput({
    onResult: useCallback((text: string) => {
      setInput((prev) => (prev ? prev + ' ' + text : text));
    }, []),
    onInterim: useCallback((text: string) => {
      // Show interim transcript as a visual hint — stored in voiceInput.interimTranscript
      void text; // handled via interimTranscript state
    }, []),
  });

  // Voice input keyboard shortcut (Ctrl+Shift+V)
  useShortcut({
    id: 'toggle-voice-input',
    keys: ['ctrl', 'shift', 'v'],
    label: '切换语音输入',
    context: 'global',
    handler: voiceInput.toggleListening,
    enabled: isOpen && voiceInput.isSupported && terminalMode === 'chat',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize provider router
  const [router] = useState(() => createDefaultRouter((failedProvider, _failedModel, nextProvider, nextModel, reason) => {
    // Fallback notification callback
    setFallbackNotification(
      `${failedProvider} 失败：${reason}。已切换到 ${nextProvider}（${nextModel}）。`
    );
    // Clear any existing timeout to prevent memory leaks
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
    }
    fallbackTimeoutRef.current = setTimeout(() => setFallbackNotification(null), 5000);
  }));

  // Share router with AI command service (Phantom Shell)
  useEffect(() => {
    setAICommandRouter(router);
  }, [router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input when terminal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Configure router with active provider and model
  useEffect(() => {
    router.updateConfig({
      primaryProvider: activeProvider,
      primaryModel: activeModel,
      fallbackEnabled: fallbackEnabled,
    });
  }, [activeProvider, activeModel, fallbackEnabled, router]);

  // Initialize provider API keys from encrypted storage.
  // Keys decrypt with the device-managed local key (no password).
  useEffect(() => {
    const initializeApiKeys = async () => {
      const allProviderIds = Object.keys(router.getAllProviderMetadata());
      for (const providerId of allProviderIds) {
        const providerConfig = providers[providerId];
        if (providerConfig && providerConfig.encryptedApiKey) {
          try {
            const decryptedKey = await useTerminalStore.getState().getProviderApiKey(providerId);
            if (decryptedKey) {
              // Store key in router - provider SDK will be loaded when needed
              router.setProviderApiKey(providerId, decryptedKey);
            }
          } catch (error) {
            console.error(`Failed to decrypt ${providerId} API key:`, error);
          }
        }
      }

      // Update configured provider count
      const configuredProviders = await router.getConfiguredProviders();
      setConfiguredProviderCount(configuredProviders.length);
    };

    initializeApiKeys();
  }, [providers, router]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + A to toggle terminal
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  // Phantom Shell: Handle terminal data input
  const handleTerminalData = useCallback((data: string) => {
    // Handle special keys
    if (data === '\r') {
      // Enter key - execute command
      if (shellInput.trim()) {
        const terminal = phantomStore.terminalInstance;
        const context = createShellContext(
          terminal ? { clear: () => terminal.clear(), write: (d: string) => terminal.write(d) } : null,
          {
            activeProjectId: phantomStore.activeProjectId,
            commandHistory: phantomStore.commandHistory,
            projects: phantomStore.projects,
            createProject: phantomStore.createProject,
          }
        );

        // Add to history
        phantomStore.addToHistory({ command: shellInput });

        // Execute command
        terminal?.write('\r\n');
        runCommand(shellInput, context, (output) => {
          terminal?.write(output);
        }).then((exitCode) => {
          // Show prompt after command completes
          terminal?.write(`\r\n\x1b[35mphantom\x1b[0m:\x1b[36m~\x1b[0m$ `);
          if (exitCode !== 0) {
            // Exit code shown for non-zero
          }
        });

        setShellInput('');
      } else {
        // Empty enter - just show new prompt
        phantomStore.terminalInstance?.write('\r\n\x1b[35mphantom\x1b[0m:\x1b[36m~\x1b[0m$ ');
      }
    } else if (data === '\x7f' || data === '\b') {
      // Backspace
      if (shellInput.length > 0) {
        setShellInput(prev => prev.slice(0, -1));
        phantomStore.terminalInstance?.write('\b \b');
      }
    } else if (data === '\x03') {
      // Ctrl+C - cancel current input
      phantomStore.terminalInstance?.write('^C\r\n\x1b[35mphantom\x1b[0m:\x1b[36m~\x1b[0m$ ');
      setShellInput('');
    } else if (data === '\x1b[A') {
      // Up arrow - history navigation
      const prevCmd = phantomStore.navigateHistory('up');
      if (prevCmd !== null) {
        // Clear current line and show previous command
        phantomStore.terminalInstance?.write('\r\x1b[K\x1b[35mphantom\x1b[0m:\x1b[36m~\x1b[0m$ ' + prevCmd);
        setShellInput(prevCmd);
      }
    } else if (data === '\x1b[B') {
      // Down arrow - history navigation
      const nextCmd = phantomStore.navigateHistory('down');
      phantomStore.terminalInstance?.write('\r\x1b[K\x1b[35mphantom\x1b[0m:\x1b[36m~\x1b[0m$ ' + (nextCmd || ''));
      setShellInput(nextCmd || '');
    } else if (data.length === 1 && data >= ' ') {
      // Regular printable character
      setShellInput(prev => prev + data);
      phantomStore.terminalInstance?.write(data);
    }
  }, [shellInput, phantomStore]);

  // Show prompt when terminal is ready
  const handleTerminalReady = useCallback(() => {
    setTimeout(() => {
      phantomStore.terminalInstance?.write('\x1b[35mphantom\x1b[0m:\x1b[36m~\x1b[0m$ ');
    }, 100);
  }, [phantomStore.terminalInstance]);

  // Initialize prompt when switching to shell mode
  useEffect(() => {
    if (terminalMode === 'shell' && phantomStore.isTerminalReady) {
      handleTerminalReady();
    }
  }, [terminalMode, phantomStore.isTerminalReady, handleTerminalReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');

    // Check if any provider is configured
    if (configuredProviderCount === 0) {
      addMessage({
        role: 'system',
        content: '尚未配置任何 AI 提供商。点击 ⚙️ 设置按钮添加 API 密钥。',
      });
      return;
    }

    // Check if active provider is configured
    const activeProviderObj = await router.getProvider(activeProvider);
    if (!activeProviderObj || !activeProviderObj.isConfigured()) {
      addMessage({
        role: 'system',
        content: `提供商“${activeProvider}”尚未配置。请在设置中添加 API 密钥。`,
      });
      return;
    }

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
    });

    // Start streaming
    setStreaming(true);
    setStreamingContent('');

    try {
      // Auto-create conversation if none is active
      if (!activeConversationId) {
        createConversation(userMessage.substring(0, 50));
      }

      // Send message using router (with automatic fallback)
      // Inject custom instructions and context if active
      const customInstructions = useTerminalStore.getState().customInstructions;
      const instructionsPrefix = customInstructions.trim()
        ? `**User Custom Instructions:**\n${customInstructions.trim()}\n\n---\n\n`
        : '';
      const baseSystemPrompt = customSystemPrompt || getDefaultSystemPrompt();
      const contextPrefix = activeContext
        ? `\n\n**Active Context (${activeContext.type}):**\nTitle: ${activeContext.title}\nContent:\n${activeContext.content.slice(0, 2000)}\n\n---\n\n`
        : '';
      // Inject cross-module context if enabled
      const crossModulePrefix = useTerminalStore.getState().enableCrossModuleContext
        ? `\n\n${contextToSystemPrompt(buildCrossModuleContext())}\n\n---\n\n`
        : '';
      const systemPrompt = instructionsPrefix + baseSystemPrompt + contextPrefix + crossModulePrefix;
      const response = await router.sendMessage({
        prompt: userMessage,
        conversationHistory: messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
        systemPrompt,
        stream: true,
        onChunk: (chunk) => {
          setStreamingContent((prev) => prev + chunk);
        },
      });

      // Build token usage info from response
      const tokenUsage = response.usage ? {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        estimatedCost: response.usage.totalTokens * 0.000002, // Rough estimate
      } : undefined;

      // Track cumulative usage
      if (tokenUsage) {
        recordTokenUsage(tokenUsage, response.provider || activeProvider);
      }

      // Add complete assistant message with provider/model metadata
      addMessage({
        role: 'assistant',
        content: response.content,
        provider: response.provider || activeProvider,
        model: response.model || activeModel,
        tokenUsage,
      });

      // Auto-save conversation
      saveCurrentConversation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发生未知错误';
      addMessage({
        role: 'system',
        content: `错误：${errorMessage}`,
      });
    } finally{
      setStreaming(false);
      setStreamingContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed top-0 right-0 h-screen
        transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        w-[300px] lg:w-[375px]
        bg-white dark:bg-black
        border-l border-border-light dark:border-border-dark
        shadow-2xl
        z-40
        flex flex-col
      `}
    >
      {/* Header - Two Row Layout */}
      <div className="bg-black dark:bg-black border-b border-border-light dark:border-border-dark flex-shrink-0">
        {/* Row 1: Tab Navigation */}
        <div className="flex items-center border-b border-surface-dark-elevated">
          <div className="flex flex-1">
            <button
              onClick={() => setTerminalMode('chat')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
                terminalMode === 'chat'
                  ? 'text-accent-green border-accent-green bg-accent-green/5'
                  : 'text-text-dark-secondary border-transparent hover:text-accent-green hover:bg-accent-green/5'
              }`}
              title="AI 聊天模式"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              聊天
            </button>
            <button
              onClick={() => setTerminalMode('shell')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
                terminalMode === 'shell'
                  ? 'text-accent-primary border-accent-primary bg-accent-primary/5'
                  : 'text-text-dark-secondary border-transparent hover:text-accent-primary hover:bg-accent-primary/5'
              }`}
              title="Phantom Shell 终端"
            >
              <Keyboard className="h-4 w-4" aria-hidden />
              Shell
            </button>
            <button
              onClick={() => setTerminalMode('notes')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
                terminalMode === 'notes'
                  ? 'text-accent-blue border-accent-blue bg-accent-blue/5'
                  : 'text-text-dark-secondary border-transparent hover:text-accent-blue hover:bg-accent-blue/5'
              }`}
              title="查看已保存的笔记"
            >
              <FileText className="h-4 w-4" aria-hidden />
              笔记
            </button>
          </div>
          {/* Close button in tab row */}
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 text-text-dark-secondary hover:text-white hover:bg-surface-dark-elevated transition-all"
            title="关闭终端"
            aria-label="关闭 AI 助手"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Row 2: Context Info & Actions */}
        <div className="flex items-center justify-between px-3 py-1.5">
          {/* Left: Context info based on mode */}
          <div className="flex items-center gap-2 font-mono text-xs">
            {terminalMode === 'chat' && (
              <>
                <span className="text-accent-green">
                  {configuredProviderCount > 0
                    ? `${activeProvider}/${activeModel}`
                    : '未配置'}
                </span>
                {fallbackEnabled && configuredProviderCount > 1 && (
                  <span className="flex items-center bg-accent-green/20 px-1.5 py-0.5 rounded text-accent-green" title="已启用自动回退">
                    <RefreshCw className="h-3 w-3" aria-hidden />
                  </span>
                )}
              </>
            )}
            {terminalMode === 'shell' && (
              <span className="text-accent-primary">phantom-shell</span>
            )}
            {terminalMode === 'notes' && (
              <span className="text-accent-blue">AI 助手笔记</span>
            )}
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-0.5">
            {/* Conversation Search - Chat only */}
            {terminalMode === 'chat' && (
              <button
                onClick={() => { setShowConversationSearch(!showConversationSearch); setShowConversationPanel(false); setShowSystemPromptPanel(false); }}
                className={`p-1.5 hover:bg-surface-dark-elevated rounded transition-all ${
                  showConversationSearch ? 'text-accent-yellow bg-accent-yellow/10' : 'text-text-dark-secondary hover:text-accent-yellow'
                }`}
                title="搜索对话"
                aria-label="搜索对话"
              >
                <Search size={14} />
              </button>
            )}

            {/* Conversation History - Chat only */}
            {terminalMode === 'chat' && (
              <button
                onClick={() => { setShowConversationPanel(!showConversationPanel); setShowConversationSearch(false); setShowSystemPromptPanel(false); }}
                className={`p-1.5 hover:bg-surface-dark-elevated rounded transition-all ${
                  showConversationPanel ? 'text-accent-green bg-accent-green/10' : 'text-text-dark-secondary hover:text-accent-green'
                }`}
                title="对话历史"
                aria-label="查看对话历史"
              >
                <MessageSquare size={14} />
              </button>
            )}

            {/* System Prompt - Chat only */}
            {terminalMode === 'chat' && (
              <button
                onClick={() => { setShowSystemPromptPanel(!showSystemPromptPanel); setShowConversationPanel(false); }}
                className={`p-1.5 hover:bg-surface-dark-elevated rounded transition-all ${
                  showSystemPromptPanel ? 'text-accent-blue bg-accent-blue/10' : customSystemPrompt ? 'text-accent-blue' : 'text-text-dark-secondary hover:text-accent-blue'
                }`}
                title={customSystemPrompt ? '系统提示词（已启用）' : '系统提示词'}
                aria-label="配置系统提示词"
              >
                <BookOpen size={14} />
              </button>
            )}

            {/* Export - Chat only, when messages exist */}
            {terminalMode === 'chat' && (
              <ConversationExportButton />
            )}

            {/* Usage Tracker - Chat only */}
            {terminalMode === 'chat' && (
              <button
                onClick={() => setShowUsageTracker(!showUsageTracker)}
                className="p-1.5 hover:bg-surface-dark-elevated rounded transition-all text-text-dark-secondary hover:text-accent-green"
                title="用量统计"
                aria-label="查看用量统计"
              >
                <BarChart3 size={14} />
              </button>
            )}

            {/* Save Conversation - Chat only, when messages exist */}
            {messages.length > 0 && terminalMode === 'chat' && (
              <button
                onClick={() => setShowSaveConversation(true)}
                className="p-1.5 hover:bg-surface-dark-elevated rounded transition-all text-text-dark-secondary hover:text-accent-blue"
                title="将对话保存到笔记"
                aria-label="将对话保存到笔记"
              >
                <Save size={14} />
              </button>
            )}

            {/* Model Selector - Chat only */}
            {terminalMode === 'chat' && (
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="p-1.5 hover:bg-surface-dark-elevated rounded transition-all text-text-dark-secondary hover:text-accent-green"
                title="选择模型"
                aria-label="选择 AI 模型"
              >
                <Shuffle size={14} />
              </button>
            )}

            {/* Provider Settings - Chat only */}
            {terminalMode === 'chat' && (
              <button
                onClick={() => setShowProviderSettings(true)}
                className="p-1.5 hover:bg-surface-dark-elevated rounded transition-all text-text-dark-secondary hover:text-accent-green"
                title="提供商设置"
                aria-label="打开提供商设置"
              >
                <Settings2 size={14} />
              </button>
            )}

            {/* Help - Always visible */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-1.5 hover:bg-surface-dark-elevated rounded transition-all text-text-dark-secondary hover:text-white"
              title="帮助与文档"
              aria-label="打开帮助"
            >
              <HelpCircle size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area - Chat or Shell */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Phantom Shell Terminal Mode */}
        {terminalMode === 'shell' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Preview Toggle Bar */}
            <div className="flex items-center justify-between px-2 py-1 bg-surface-dark-elevated border-b border-border-dark flex-shrink-0">
              <span className="flex items-center gap-1 text-xs text-text-dark-secondary">
                <Circle className={`h-2 w-2 ${phantomStore.isDevServerRunning ? 'fill-current' : ''}`} aria-hidden />
                {phantomStore.isDevServerRunning ? '服务器运行中' : '无服务器'}
              </span>
              <button
                onClick={() => phantomStore.setShowPreview(!phantomStore.showPreview)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-all ${
                  phantomStore.showPreview
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'text-text-dark-secondary hover:text-accent-primary'
                }`}
                title="切换预览面板"
              >
                <Eye className="h-3 w-3" aria-hidden />
                {phantomStore.showPreview ? '隐藏' : '显示'} 预览
              </button>
            </div>

            {/* Split View: Terminal (top) + Preview (bottom) */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Terminal */}
              <div className={`overflow-hidden transition-all ${
                phantomStore.showPreview ? 'h-[60%]' : 'h-full'
              }`}>
                <PhantomTerminal onData={handleTerminalData} />
              </div>

              {/* Preview Pane */}
              {phantomStore.showPreview && (
                <div className="h-[40%] border-t border-border-dark">
                  <PhantomPreview className="w-full h-full" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Chat Mode */}
        {terminalMode === 'chat' && (
          <>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Fallback Notification */}
            {fallbackNotification && (
              <div className="mb-4 p-3 bg-accent-yellow/10 border border-accent-yellow/20 rounded-button text-sm text-text-light-primary dark:text-text-dark-primary">
                {fallbackNotification}
              </div>
            )}

            {messages.length === 0 && configuredProviderCount === 0 && (
              <div className="text-center py-12 text-text-light-secondary dark:text-text-dark-secondary">
                <p className="text-lg font-semibold mb-2">欢迎使用 AI 助手！</p>
                <p className="text-sm mb-4">
                  配置 AI 提供商即可开始使用。可从 8 个提供商中选择，包含免费选项！
                </p>
                <button
                  onClick={() => setShowProviderSettings(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button transition-all duration-standard ease-smooth"
                >
                  <Settings2 className="h-4 w-4" aria-hidden />
                  配置提供商
                </button>
                <div className="mt-4 text-xs space-y-1">
                  <p className="font-medium">可用的免费提供商：</p>
                  <p>• OpenRouter (Llama 3.3, Gemini 2.0)</p>
                  <p>• Groq（闪电般快速的推理）</p>
                  <p>• HuggingFace（数千个模型）</p>
                  <p>• Mistral（欧洲 AI）</p>
                </div>
              </div>
            )}

            {messages.length === 0 && configuredProviderCount > 0 && (
              <div className="text-center py-12 text-text-light-secondary dark:text-text-dark-secondary">
                <p className="text-lg font-semibold mb-2">AI 助手就绪</p>
                <p className="text-sm mb-2">
                  当前：<span className="font-medium text-accent-blue">{activeProvider}</span> • {activeModel}
                </p>
                <p className="text-sm">有什么想问的都可以！我可以帮你：</p>
                <ul className="text-sm mt-2 space-y-1">
                  <li className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" aria-hidden />常见问题与对话</li>
                  <li className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" aria-hidden />代码生成与讲解</li>
                  <li className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" aria-hidden />调试与问题排查</li>
                  <li className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" aria-hidden />写作与效率</li>
                  <li className="flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5" aria-hidden />提供商失败时自动回退</li>
                </ul>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent-blue to-accent-primary flex items-center justify-center text-white flex-shrink-0">
                    {message.role === 'system' ? <AlertTriangle className="h-4 w-4" aria-hidden /> : <Bot className="h-4 w-4" aria-hidden />}
                  </div>
                )}

                {/* Message bubble with hover actions */}
                <div className="group relative flex items-start gap-1 max-w-[80%]">
                  {/* Save button - left side for user messages */}
                  {message.role === 'user' && (
                    <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity duration-200 flex-shrink-0 self-center">
                      <SaveToNotesButton message={message} />
                    </div>
                  )}

                  <div
                    className={`flex-1 rounded-button px-4 py-2 font-mono ${
                      message.role === 'user'
                        ? 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-white'
                        : message.role === 'system'
                        ? 'bg-accent-yellow/10 text-text-light-primary dark:text-text-dark-primary border border-accent-yellow/20'
                        : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-accent-orange dark:text-accent-green'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-accent-orange dark:prose-headings:text-accent-green prose-code:text-accent-orange dark:prose-code:text-accent-green">
                        <ReactMarkdown
                          rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
                          components={{
                            pre: ({ children }) => <>{children}</>,
                            code: (codeProps) => {
                              const { className: codeClassName, children: codeChildren, ...rest } = codeProps;
                              const langMatch = /language-(\w+)/.exec(codeClassName || '');
                              const codeStr = String(codeChildren).replace(/\n$/, '');
                              const isBlock = langMatch || codeStr.includes('\n');
                              if (isBlock) {
                                return (
                                  <CodeBlock language={langMatch?.[1]} className={codeClassName}>
                                    {codeStr}
                                  </CodeBlock>
                                );
                              }
                              return <code className={codeClassName} {...rest}>{codeChildren}</code>;
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
                      <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                      {message.provider && message.model && (
                        <>
                          <span>•</span>
                          <span className="font-medium" title="使用的提供商与模型">
                            {message.provider} • {message.model}
                          </span>
                        </>
                      )}
                      {message.tokenUsage && (
                        <>
                          <span>•</span>
                          <MessageTokenBadge usage={message.tokenUsage} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Save button - right side for assistant messages */}
                  {message.role === 'assistant' && (
                    <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity duration-200 flex-shrink-0 self-center">
                      <SaveToNotesButton
                        message={message}
                        promptMessage={
                          // Find the preceding user message
                          index > 0 && messages[index - 1]?.role === 'user'
                            ? messages[index - 1]
                            : undefined
                        }
                      />
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white flex-shrink-0">
                    <User className="h-4 w-4" aria-hidden />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <div className="flex gap-3 justify-start" role="status" aria-live="polite" aria-label="AI 回复流式输出中">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent-blue to-accent-primary flex items-center justify-center text-white flex-shrink-0">
                  <Bot className="h-4 w-4" aria-hidden />
                </div>
                <div className="max-w-[80%] rounded-button px-4 py-2 font-mono bg-surface-light-elevated dark:bg-surface-dark-elevated text-accent-orange dark:text-accent-green">
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-accent-orange dark:prose-headings:text-accent-green prose-code:text-accent-orange dark:prose-code:text-accent-green">
                    <ReactMarkdown
                      rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
                      components={{
                        pre: ({ children }) => <>{children}</>,
                        code: (codeProps) => {
                          const { className: codeClassName, children: codeChildren, ...rest } = codeProps;
                          const langMatch = /language-(\w+)/.exec(codeClassName || '');
                          const codeStr = String(codeChildren).replace(/\n$/, '');
                          const isBlock = langMatch || codeStr.includes('\n');
                          if (isBlock) {
                            return (
                              <CodeBlock language={langMatch?.[1]} className={codeClassName}>
                                {codeStr}
                              </CodeBlock>
                            );
                          }
                          return <code className={codeClassName} {...rest}>{codeChildren}</code>;
                        },
                      }}
                    >{streamingContent}</ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-1 text-xs opacity-60 mt-1">
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-75" />
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-150" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Token Usage Bar */}
          <TokenUsageBar />

          {/* Context Indicator */}
          {activeContext && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-primary/10 border-t border-accent-primary/20 flex-shrink-0">
              <Sparkles size={12} className="text-accent-primary flex-shrink-0" />
              <span className="text-xs text-accent-primary truncate flex-1">
                上下文：{activeContext.type === 'note' ? <FileText className="inline h-3 w-3" aria-hidden /> : <CheckCircle2 className="inline h-3 w-3" aria-hidden />} {activeContext.title}
              </span>
              <button
                onClick={() => setActiveContext(null)}
                className="text-accent-primary/60 hover:text-accent-primary transition-colors"
                title="清除上下文"
                aria-label="清除当前上下文"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-border-light dark:border-border-dark p-3 bg-surface-light dark:bg-black flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  voiceInput.isListening
                    ? (voiceInput.interimTranscript || '正在聆听…')
                    : configuredProviderCount > 0
                    ? 'user@lifeos:~$ _'
                    : '请先配置提供商…'
                }
                disabled={configuredProviderCount === 0 || isStreaming}
                className="flex-1 px-3 py-2 rounded-button font-mono text-sm bg-white dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark text-text-light-primary dark:text-white placeholder-text-light-secondary dark:placeholder-text-dark-secondary focus:ring-2 focus:ring-accent-blue dark:focus:ring-accent-green focus:border-transparent resize-none"
                rows={1}
              />
              {voiceInput.isSupported && (
                <button
                  type="button"
                  onClick={voiceInput.toggleListening}
                  disabled={isStreaming}
                  className={`px-3 py-2 rounded-button transition-all duration-standard ease-smooth ${
                    voiceInput.isListening
                      ? 'bg-accent-red text-white voice-pulse'
                      : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary hover:text-accent-red hover:bg-accent-red/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={voiceInput.isListening ? '停止语音输入（Ctrl+Shift+V）' : '开始语音输入（Ctrl+Shift+V）'}
                  aria-label={voiceInput.isListening ? '停止语音输入' : '开始语音输入'}
                >
                  <Mic size={16} />
                </button>
              )}
              <button
                type="submit"
                disabled={configuredProviderCount === 0 || !input.trim() || isStreaming}
                className="px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover disabled:bg-surface-light-elevated dark:disabled:bg-surface-dark-elevated text-white rounded-button font-medium transition-all duration-standard ease-smooth disabled:cursor-not-allowed"
                aria-label={isStreaming ? '正在生成回复' : '发送消息'}
              >
                {isStreaming ? '⋯' : '→'}
              </button>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    saveCurrentConversation();
                    createConversation();
                  }}
                  className="px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark hover:bg-surface-light dark:hover:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary rounded-button text-sm transition-all duration-standard ease-smooth"
                  title="新建对话"
                  aria-label="开始新对话"
                >
                  +
                </button>
              )}
            </form>
          </div>
          </>
        )}

        {/* Notes Mode */}
        {terminalMode === 'notes' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Conditional: Note View or List View */}
            {selectedNote ? (
              /* Note View/Edit Mode */
              <>
                {/* Note Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-dark-elevated border-b border-border-dark flex-shrink-0">
                  <button
                    onClick={handleBackToList}
                    className="p-1.5 hover:bg-surface-dark rounded transition-all text-text-dark-secondary hover:text-white"
                    title="返回列表"
                    aria-label="返回笔记列表"
                  >
                    ←
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{selectedNote.icon || '📄'}</span>
                      <h3 className="text-sm font-medium text-text-dark-primary truncate">
                        {selectedNote.title}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditingNote ? (
                      <>
                        {/* Move to Daily Note - only for Quick Note when text selected */}
                        {selectedNote.isQuickNote && selectedText && (
                          <button
                            onClick={handleMoveToDaily}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-accent-orange/20 text-accent-orange hover:bg-accent-orange/30 rounded transition-all"
                            title="将选中文本移动到每日笔记"
                          >
                            <CalendarDays className="h-3 w-3" aria-hidden />
                            移至每日笔记
                          </button>
                        )}
                        <button
                          onClick={handleSaveNote}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-accent-green/20 text-accent-green hover:bg-accent-green/30 rounded transition-all"
                          title="保存更改"
                        >
                          <Check className="h-3 w-3" aria-hidden />
                          保存
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleStartEditing}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 rounded transition-all"
                        title="编辑笔记"
                      >
                        <Pencil className="h-3 w-3" aria-hidden />
                        编辑
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/notes?note=${selectedNote.id}`)}
                      className="px-2 py-1 text-xs bg-surface-dark hover:bg-surface-dark-elevated text-text-dark-secondary hover:text-white rounded transition-all"
                      title="在完整笔记页面中打开"
                      aria-label="在完整笔记页面中打开笔记"
                    >
                      ↗
                    </button>
                  </div>
                </div>

                {/* Note Content */}
                <div className="flex-1 overflow-y-auto">
                  {isEditingNote ? (
                    /* Edit Mode - Textarea */
                    <textarea
                      ref={noteEditRef}
                      value={noteEditContent}
                      onChange={(e) => setNoteEditContent(e.target.value)}
                      onSelect={handleTextSelection}
                      onMouseUp={handleTextSelection}
                      onKeyUp={handleTextSelection}
                      className="w-full h-full p-4 bg-black text-text-dark-primary text-sm font-mono resize-none focus:outline-none"
                      placeholder="开始输入…"
                    />
                  ) : (
                    /* View Mode - Rendered Markdown */
                    <div className="p-4 prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}>
                        {selectedNote.contentText || '*暂无内容*'}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Note Footer */}
                <div className="px-4 py-2 border-t border-border-dark bg-surface-dark-elevated flex-shrink-0">
                  <div className="flex items-center justify-between text-[10px] text-text-dark-tertiary">
                    <span>
                      更新于 {new Date(selectedNote.updatedAt).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {selectedNote.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {selectedNote.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Notes List Mode */
              <>
                {/* Notes Header with Sort */}
                <div className="flex items-center justify-between px-3 py-2 bg-surface-dark-elevated border-b border-border-dark flex-shrink-0">
                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-dark-secondary">排序：</span>
                    <select
                      value={notesSortField}
                      onChange={(e) => handleSortChange(e.target.value as NotesSortField)}
                      className="text-xs bg-surface-dark border border-border-dark rounded px-2 py-1 text-text-dark-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
                    >
                      <option value="updatedAt">更新时间</option>
                      <option value="createdAt">创建时间</option>
                      <option value="title">标题</option>
                    </select>
                    <button
                      onClick={() => setNotesSortOrder(notesSortOrder === 'desc' ? 'asc' : 'desc')}
                      className="text-xs text-text-dark-secondary hover:text-text-dark-primary transition-colors"
                      title={notesSortOrder === 'desc' ? '降序' : '升序'}
                      aria-label={notesSortOrder === 'desc' ? '降序排序' : '升序排序'}
                    >
                      {notesSortOrder === 'desc' ? '↓' : '↑'}
                    </button>
                  </div>
                  <button
                    onClick={() => navigate('/notes')}
                    className="px-2 py-1 text-xs bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 rounded transition-all"
                    title="在笔记中打开"
                  >
                    打开完整笔记 →
                  </button>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto">
                  {/* Quick Note Card - Always at top */}
                  <div className="p-2">
                    <button
                      onClick={handleOpenQuickNote}
                      className="w-full text-left p-3 rounded-lg bg-gradient-to-r from-accent-yellow/10 to-accent-orange/10 hover:from-accent-yellow/20 hover:to-accent-orange/20 border border-accent-yellow/30 hover:border-accent-yellow/50 transition-all group"
                    >
                      <div className="flex items-start gap-2">
                        <Zap className="h-5 w-5 flex-shrink-0" aria-hidden />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-text-dark-primary group-hover:text-accent-yellow transition-colors">
                            快速笔记
                          </h4>
                          <p className="text-xs text-text-dark-tertiary mt-0.5">
                            {quickNoteSummary.entryCount > 0 ? (
                              <>
                                {quickNoteSummary.entryCount} 条
                                {quickNoteSummary.lastEntryTime && (
                                  <> • 最近：{new Date(quickNoteSummary.lastEntryTime).toLocaleDateString('zh-CN', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}</>
                                )}
                              </>
                            ) : (
                              '快速记录即兴想法'
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-accent-yellow opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity">
                          打开 →
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Regular Notes */}
                  {aiTerminalNotes.length === 0 && !quickNote ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <FileText className="mb-3 h-8 w-8 text-text-dark-tertiary" aria-hidden />
                      <p className="text-sm font-medium text-text-dark-primary mb-1">
                        暂无笔记
                      </p>
                      <p className="text-xs text-text-dark-secondary mb-3">
                        保存一次对话，或在下方添加快速想法
                      </p>
                      <button
                        onClick={() => setTerminalMode('chat')}
                        className="px-3 py-1.5 text-xs bg-accent-green/20 text-accent-green hover:bg-accent-green/30 rounded transition-all"
                      >
                        ← 返回聊天
                      </button>
                    </div>
                  ) : aiTerminalNotes.length > 0 ? (
                    <div className="px-2 pb-2 space-y-2">
                      {aiTerminalNotes.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => handleOpenNote(note.id)}
                          className="w-full text-left p-3 rounded-lg bg-surface-dark hover:bg-surface-dark-elevated border border-border-dark hover:border-accent-blue/50 transition-all group"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg flex-shrink-0">
                              {note.icon || '📄'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-text-dark-primary truncate group-hover:text-accent-blue transition-colors">
                                {note.title}
                              </h4>
                              <p className="text-xs text-text-dark-tertiary mt-0.5 line-clamp-2">
                                {note.contentText?.substring(0, 100) || '无内容'}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-text-dark-tertiary">
                                  {new Date(note.updatedAt).toLocaleDateString('zh-CN', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {note.tags.length > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue rounded">
                                    {note.tags[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Quick Input Footer */}
                <div className="px-3 py-2 border-t border-border-dark bg-surface-dark-elevated flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 flex-shrink-0" aria-hidden />
                    <input
                      ref={quickNoteInputRef}
                      type="text"
                      value={quickNoteInput}
                      onChange={(e) => setQuickNoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleQuickNoteSubmit();
                        }
                      }}
                      placeholder="快速想法…"
                      disabled={isAddingQuickNote}
                      className="flex-1 px-3 py-1.5 text-sm bg-surface-dark border border-border-dark rounded text-text-dark-primary placeholder-text-dark-tertiary focus:outline-none focus:ring-1 focus:ring-accent-yellow focus:border-accent-yellow"
                    />
                    <button
                      onClick={handleQuickNoteSubmit}
                      disabled={!quickNoteInput.trim() || isAddingQuickNote}
                      className="px-3 py-1.5 text-sm bg-accent-yellow/20 text-accent-yellow hover:bg-accent-yellow/30 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-all"
                      title="添加到快速笔记"
                      aria-label="添加到快速笔记"
                    >
                      {isAddingQuickNote ? '...' : '+'}
                    </button>
                  </div>
                  <p className="text-[10px] text-text-dark-tertiary mt-1.5 text-center">
                    {aiTerminalNotes.length} 条笔记 + 快速笔记
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Conversation Search Panel */}
      {showConversationSearch && terminalMode === 'chat' && (
        <div className="absolute top-12 left-0 right-0 bottom-0 bg-black/95 backdrop-blur-sm z-40 flex flex-col">
          <ConversationSearchPanel onClose={() => setShowConversationSearch(false)} />
        </div>
      )}

      {/* Conversation History Panel */}
      {showConversationPanel && terminalMode === 'chat' && (
        <div className="absolute top-12 left-0 right-0 bottom-0 bg-black/95 backdrop-blur-sm z-40 flex flex-col">
          <ConversationPanel onClose={() => setShowConversationPanel(false)} />
        </div>
      )}

      {/* System Prompt Panel */}
      {showSystemPromptPanel && terminalMode === 'chat' && (
        <div className="absolute top-12 left-0 right-0 bottom-0 bg-black/95 backdrop-blur-sm z-40 flex flex-col">
          <SystemPromptPanel onClose={() => setShowSystemPromptPanel(false)} />
        </div>
      )}

      {/* Provider Settings Modal */}
      <ProviderSettings
        isOpen={showProviderSettings}
        onClose={() => setShowProviderSettings(false)}
        router={router}
      />

      {/* Model Selector Sliding Panel */}
      {showModelSelector && (
        <div className="absolute top-12 right-0 w-80 max-h-[70vh] bg-white dark:bg-surface-dark-elevated border-l border-border-light dark:border-border-dark shadow-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-surface-light dark:bg-surface-dark flex-shrink-0">
            <h3 className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary">
              选择模型
            </h3>
            <button
              onClick={() => setShowModelSelector(false)}
              className="p-1 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded-button"
              aria-label="关闭模型选择器"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="p-3 overflow-y-auto flex-1">
            <ModelSelector
              router={router}
              onSelect={(providerId, modelId) => {
                setActiveProvider(providerId, modelId);
                setShowModelSelector(false);
              }}
              currentProvider={activeProvider}
              currentModel={activeModel}
            />
          </div>
        </div>
      )}

      {/* Usage Tracker Sliding Panel */}
      {showUsageTracker && (
        <div className="absolute top-12 right-0 w-80 max-h-[70vh] bg-white dark:bg-surface-dark-elevated border-l border-border-light dark:border-border-dark shadow-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-surface-light dark:bg-surface-dark flex-shrink-0">
            <h3 className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary">
              用量统计
            </h3>
            <button
              onClick={() => setShowUsageTracker(false)}
              className="p-1 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded-button"
              aria-label="关闭用量统计"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="p-3 overflow-y-auto flex-1">
            <UsageTracker router={router} />
          </div>
        </div>
      )}

      {/* Help Modal */}
      <TerminalHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Save Conversation Modal */}
      {showSaveConversation && (
        <SaveConversationModal onClose={() => setShowSaveConversation(false)} />
      )}

      {/* Portal target for modals that need to be positioned within the AI Terminal */}
      <div
        id={AI_TERMINAL_MODAL_ROOT_ID}
        className="absolute inset-0 pointer-events-none z-50"
        style={{ pointerEvents: 'none' }}
      >
        {/* Modals rendered here via createPortal will cover the entire AI Terminal */}
      </div>
    </div>
  );
};
