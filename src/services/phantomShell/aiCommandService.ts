/**
 * AI Command Service
 *
 * Translates natural language into shell commands.
 * Uses the existing provider router for multi-provider support.
 */

import { createDefaultRouter, type AIProviderRouter } from '../ai/providerRouter';
import { logger } from '../logger';

const log = logger.module('PhantomShell:AICommand');

// System prompt for shell command generation
const SYSTEM_PROMPT = `你是 Phantom Shell AI，一个基于浏览器的开发环境中的终端助手。

你的任务是把自然语言请求转换为终端命令。

上下文：
- 你运行在 WebContainers 中（浏览器内的 Node.js）
- 可用：npm、npx、node、基础 shell 命令（ls、cd、cat、mkdir、rm 等）
- 不可用：git、docker、python、系统级命令
- 文件系统位于内存中（持久化到 IndexedDB）

回复格式：
- 对于简单请求，仅回复命令本身，每行一条
- 对于复杂请求，先简要说明再给出命令
- 使用 npm，不要用 yarn 或 pnpm
- 一次性工具优先使用 npx

示例：
用户：create a react app
回复：npm create vite@latest my-app -- --template react

用户：install express
回复：npm install express

用户：show files
回复：ls -la

禁止事项：
- 不要建议 git 命令（git 不可用）
- 不要建议 python/pip 命令
- 不要输出 markdown 格式（只输出纯文本）`;

// ==================== TYPES ====================

export interface AICommandResult {
  commands: string[];
  explanation?: string;
  error?: string;
}

// ==================== SINGLETON ROUTER ====================

let sharedRouter: AIProviderRouter | null = null;

/**
 * Get or create the shared router instance
 * Uses the same router configuration as AITerminal
 */
export const getRouter = (): AIProviderRouter => {
  if (!sharedRouter) {
    sharedRouter = createDefaultRouter();
  }
  return sharedRouter;
};

/**
 * Set an external router (for sharing with AITerminal)
 */
export const setRouter = (router: AIProviderRouter): void => {
  sharedRouter = router;
};

// ==================== COMMAND TEMPLATES ====================

/**
 * Pre-defined templates for common requests (faster than AI)
 */
export const COMMAND_TEMPLATES: Record<string, string> = {
  'create react app': 'npm create vite@latest my-app -- --template react',
  'create vue app': 'npm create vite@latest my-app -- --template vue',
  'create svelte app': 'npm create vite@latest my-app -- --template svelte',
  'create next app': 'npx create-next-app@latest my-app',
  'run dev': 'npm run dev',
  'run build': 'npm run build',
  'run start': 'npm start',
  'run test': 'npm test',
  'show files': 'ls -la',
  'list files': 'ls -la',
  'current directory': 'pwd',
  'install dependencies': 'npm install',
};

/**
 * Try to match a template before calling AI
 */
export const tryTemplate = (prompt: string): string | null => {
  const lower = prompt.toLowerCase().trim();
  for (const [pattern, command] of Object.entries(COMMAND_TEMPLATES)) {
    if (lower.includes(pattern)) {
      log.debug('Template matched', { pattern, command });
      return command;
    }
  }
  return null;
};

// ==================== COMMAND DETECTION ====================

/**
 * Check if a string looks like a shell command
 */
const looksLikeCommand = (str: string): boolean => {
  const commandPrefixes = [
    'npm ', 'npx ', 'node ', 'ls', 'cd ', 'cat ', 'mkdir ', 'rm ', 'cp ', 'mv ',
    'echo ', 'touch ', 'pwd', 'head ', 'tail ', 'clear', 'exit',
  ];
  const lower = str.toLowerCase().trim();
  return commandPrefixes.some(prefix => lower.startsWith(prefix));
};

// ==================== MAIN FUNCTION ====================

/**
 * Process an AI command request
 *
 * @param prompt - Natural language request from user
 * @param context - Optional context (current directory, recent output)
 * @returns Commands to execute and optional explanation
 */
export const processAICommand = async (
  prompt: string,
  context?: {
    currentDirectory?: string;
    recentOutput?: string;
  }
): Promise<AICommandResult> => {
  // Validate input
  if (!prompt.trim()) {
    return {
      commands: [],
      error: '请提供请求\n（例如：/ai create a react app）',
    };
  }

  // Try template match first (instant response)
  const templateMatch = tryTemplate(prompt);
  if (templateMatch) {
    log.info('Using template match', { prompt: prompt.substring(0, 50) });
    return {
      commands: [templateMatch],
      explanation: undefined,
    };
  }

  // Get router and check if any provider is configured
  const router = getRouter();
  const configuredProviders = await router.getConfiguredProviders();

  if (configuredProviders.length === 0) {
    return {
      commands: [],
      error: '未配置 AI 提供商。\n请在设置中配置提供商。',
    };
  }

  log.info('Processing AI command', { prompt: prompt.substring(0, 100) });

  // Build context message
  let contextMsg = '';
  if (context?.currentDirectory) {
    contextMsg += `当前目录：${context.currentDirectory}\n`;
  }
  if (context?.recentOutput) {
    contextMsg += `最近的终端输出：\n${context.recentOutput.slice(-500)}\n`;
  }

  const fullPrompt = contextMsg
    ? `${contextMsg}\n---\n用户请求：${prompt}`
    : prompt;

  try {
    // Send to AI via router
    const response = await router.sendMessage({
      prompt: fullPrompt,
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.3, // Lower temperature for more deterministic commands
      maxTokens: 500, // Commands shouldn't be too long
    });

    // Parse response into commands and explanation
    const lines = response.content.trim().split('\n');
    const commands: string[] = [];
    let explanation = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip markdown code block markers
      if (trimmed.startsWith('```')) continue;

      if (looksLikeCommand(trimmed)) {
        commands.push(trimmed);
      } else {
        explanation += (explanation ? '\n' : '') + trimmed;
      }
    }

    log.debug('AI command processed', { commandCount: commands.length });

    return {
      commands,
      explanation: explanation || undefined,
    };
  } catch (error) {
    log.error('AI command failed', { error });
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      commands: [],
      error: `AI 请求失败：\n${errorMessage}`,
    };
  }
};
