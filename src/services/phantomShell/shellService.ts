/**
 * Phantom Shell Service
 *
 * Handles command parsing, execution, and output routing.
 * Integrates with WebContainer for actual command execution
 * and AI providers for /ai commands.
 */

import { logger } from '../logger';
import type { PhantomProject } from '../../stores/usePhantomShellStore';
import type { WebContainerProcess } from '@webcontainer/api';
import { getWebContainer, isWebContainerSupported } from './webContainerService';
import { processAICommand } from './aiCommandService';

const log = logger.module('PhantomShell:ShellService');

// ==================== TYPES ====================

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ShellCommand {
  type: 'builtin' | 'ai' | 'system';
  name: string;
  args: string[];
  raw: string;
}

export interface ShellContext {
  terminal: { clear: () => void; write: (data: string) => void } | null;
  activeProjectId: string | null;
  getHistory: () => { command: string; timestamp: string }[];
  getProjects: () => { id: string; name: string; metadata: { framework?: string } }[];
  createProject: (name: string) => string;
}

// Built-in commands that don't require WebContainer
const BUILTIN_COMMANDS = new Set([
  'help', 'clear', 'history', 'projects', 'new', 'open', 'close',
  'export', 'import', 'theme', 'version', 'about',
]);

// Commands that fundamentally don't work in browser environment
// These require OS-level access that WebContainer cannot provide
const UNSUPPORTED_COMMANDS: Record<string, string> = {
  // Network commands requiring raw sockets
  ping: '浏览器中无法使用原始网络套接字',
  traceroute: '浏览器中无法使用原始网络套接字',
  tracert: '浏览器中无法使用原始网络套接字',
  netstat: '浏览器中无法访问网络协议栈',
  ifconfig: '浏览器中无法访问网络接口',
  ipconfig: '浏览器中无法访问网络接口',
  nslookup: 'DNS 查询需要原生网络访问',
  dig: 'DNS 查询需要原生网络访问',

  // External tool commands (require native binaries)
  curl: '请在 JavaScript 中使用 fetch()，或尝试 "npx node-fetch"',
  wget: '请在 JavaScript 中使用 fetch()',
  ssh: 'SSH 需要原生套接字访问',
  scp: 'SCP 需要原生套接字访问',
  sftp: 'SFTP 需要原生套接字访问',
  telnet: 'Telnet 需要原生套接字访问',
  ftp: 'FTP 需要原生套接字访问',

  // Version control (requires git binary)
  git: 'Git CLI 不可用。请改用 isomorphic-git 等 git 库',
  svn: '浏览器环境中无法使用 SVN',

  // Container/VM commands
  docker: 'Docker 需要在宿主机上运行守护进程',
  'docker-compose': 'Docker 需要在宿主机上运行守护进程',
  podman: '浏览器中无法使用容器运行时',
  kubectl: 'Kubernetes CLI 需要访问集群',

  // Language runtimes (not available in WebContainer)
  python: 'Python 不可用。请在浏览器中使用 Pyodide 运行 Python',
  python3: 'Python 不可用。请在浏览器中使用 Pyodide 运行 Python',
  pip: 'Python/pip 不可用。请在浏览器中使用 Pyodide 运行 Python',
  ruby: 'WebContainer 中没有 Ruby 运行时',
  gem: 'WebContainer 中没有 Ruby/gem',
  php: 'WebContainer 中没有 PHP 运行时',
  go: 'WebContainer 中没有 Go 运行时',
  rustc: 'WebContainer 中没有 Rust 编译器',
  cargo: 'WebContainer 中没有 Cargo/Rust',
  java: 'WebContainer 中没有 Java 运行时',
  javac: 'WebContainer 中没有 Java 编译器',

  // System-level commands
  sudo: '浏览器环境中无法获得 root 权限',
  su: '浏览器环境中无法切换用户',
  apt: '包管理器需要操作系统级访问权限',
  'apt-get': '包管理器需要操作系统级访问权限',
  yum: '包管理器需要操作系统级访问权限',
  brew: 'Homebrew 需要 macOS 系统访问权限',
  systemctl: '浏览器环境中没有 Systemd',
  service: '浏览器环境中无法使用系统服务',
};

// ==================== COMMAND PARSER ====================

export const parseCommand = (input: string): ShellCommand => {
  const trimmed = input.trim();

  // Check for AI command
  if (trimmed.startsWith('/ai ') || trimmed === '/ai') {
    return {
      type: 'ai',
      name: 'ai',
      args: trimmed.slice(4).trim().split(/\s+/).filter(Boolean),
      raw: trimmed,
    };
  }

  // Check for builtin command (starts with /)
  if (trimmed.startsWith('/')) {
    const parts = trimmed.slice(1).split(/\s+/);
    const name = parts[0]?.toLowerCase() || '';

    if (BUILTIN_COMMANDS.has(name)) {
      return {
        type: 'builtin',
        name,
        args: parts.slice(1),
        raw: trimmed,
      };
    }
  }

  // System command (npm, node, etc.)
  const parts = trimmed.split(/\s+/);
  return {
    type: 'system',
    name: parts[0] || '',
    args: parts.slice(1),
    raw: trimmed,
  };
};

// ==================== BUILTIN COMMAND HANDLERS ====================

export const builtinHandlers: Record<string, (args: string[], context: ShellContext) => string> = {
  help: () => `\x1b[1;36mPhantom Shell 命令\x1b[0m

\x1b[33m内置命令：\x1b[0m
  /help      显示此帮助
  /clear     清空终端
  /history   命令历史
  /version   启动 WebContainer 并显示状态
  /about     关于 Phantom Shell

\x1b[33m项目：\x1b[0m
  /projects  列出所有项目
  /new name  创建新项目
  /open name 打开已有项目
  /close     关闭当前项目

\x1b[33mAI：\x1b[0m
  /ai <msg>  向 AI 求助（例如：/ai create react app）

\x1b[33m系统命令：\x1b[0m（需要 WebContainer）
  npm install, npm run dev, node script.js
  npx, ls, cd, cat, mkdir, rm, mv, cp

\x1b[32m✓ 可用：\x1b[0m npm, node, npx, ls, cd, cat, mkdir, touch
\x1b[31m✗ 不可用：\x1b[0m git, docker, python, ping, curl, ssh

\x1b[90m提示：运行 /version 启动 WebContainer（约需 2-5 秒）\x1b[0m
`,

  clear: (_args, context) => {
    context.terminal?.clear();
    return '';
  },

  history: (_args, context) => {
    const history = context.getHistory();
    if (history.length === 0) {
      return '\x1b[90m暂无命令历史\x1b[0m';
    }
    return history
      .slice(-20)
      .map((entry, i) => `\x1b[90m${i + 1}.\x1b[0m ${entry.command}`)
      .join('\n');
  },

  version: () => {
    const support = isWebContainerSupported();
    const wcStatus = support.supported
      ? '\x1b[32m✓ 可用\x1b[0m'
      : `\x1b[31m✗ ${support.reason}\x1b[0m`;

    return `
\x1b[1;35mPhantom Shell\x1b[0m v1.0.0
\x1b[90mLifeOS Dashboard\x1b[0m v1.0.0
\x1b[90mWebContainer API\x1b[0m v1.5.1 ${wcStatus}
\x1b[90mxterm.js\x1b[0m v5.5.0
`;
  },

  projects: (_args, context) => {
    const projects = context.getProjects();
    if (projects.length === 0) {
      return '\x1b[90m还没有项目。使用 \x1b[33m/new <名称>\x1b[90m 创建一个。\x1b[0m';
    }

    return projects
      .map(p => {
        const active = context.activeProjectId === p.id ? '\x1b[32m● \x1b[0m' : '  ';
        const framework = p.metadata.framework ? `\x1b[90m[${p.metadata.framework}]\x1b[0m` : '';
        return `${active}\x1b[36m${p.name}\x1b[0m ${framework}`;
      })
      .join('\n');
  },

  new: (args, context) => {
    const name = args.join(' ').trim();
    if (!name) {
      return '\x1b[31m错误：需要项目名称\x1b[0m\n用法：/new <项目名称>';
    }

    // Validate name
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return '\x1b[31m错误：项目名称无效\x1b[0m\n只能使用字母、数字、连字符和下划线。';
    }

    const id = context.createProject(name);
    return `\x1b[32m✓ 已创建项目：\x1b[0m ${name}\n\x1b[90m项目 ID：${id}\x1b[0m`;
  },

  about: () => `\x1b[1;35m╔════════════════════════════╗
║     PHANTOM SHELL          ║
╚════════════════════════════╝\x1b[0m

浏览器原生的开发环境。
无需安装、无需服务器、无需云端。

\x1b[36m功能：\x1b[0m
 • 浏览器中的 Node.js
 • 真正的终端（xterm.js）
 • AI 辅助（/ai）
 • IndexedDB 持久化
 • .brain 文件导出

\x1b[90mLifeOS Dashboard\x1b[0m
\x1b[90m隐私优先\x1b[0m
`,

  open: (args, context) => {
    const name = args.join(' ').trim();
    if (!name) {
      return '\x1b[31m错误：需要项目名称\x1b[0m\n用法：/open <项目名称>';
    }

    const projects = context.getProjects();
    const project = projects.find(p => p.name.toLowerCase() === name.toLowerCase());

    if (!project) {
      return `\x1b[31m错误：找不到项目“${name}”\x1b[0m\n使用 /projects 查看可用项目。`;
    }

    return `\x1b[32m✓ 已打开项目：\x1b[0m ${project.name}`;
  },

  close: (_args, context) => {
    if (!context.activeProjectId) {
      return '\x1b[90m当前没有打开的项目\x1b[0m';
    }
    return '\x1b[32m✓ 项目已关闭\x1b[0m';
  },

  export: (_args, context) => {
    if (!context.activeProjectId) {
      return '\x1b[31m错误：当前没有打开的项目\x1b[0m\n请先用 /open <名称> 打开一个项目。';
    }
    return '\x1b[33m⚠ 导出功能将在第 3 阶段推出\x1b[0m';
  },

  import: () => {
    return '\x1b[33m⚠ 导入功能将在第 3 阶段推出\x1b[0m';
  },

  theme: () => {
    return '\x1b[33m⚠ 主题自定义即将推出\x1b[0m';
  },
};

// ==================== COMMAND EXECUTOR ====================

export class ShellExecutor {
  private currentProcess: WebContainerProcess | null = null;

  async executeBuiltin(
    command: ShellCommand,
    context: ShellContext
  ): Promise<string> {
    const handler = builtinHandlers[command.name];
    if (!handler) {
      return `\x1b[31m未知命令：/${command.name}\x1b[0m\n输入 /help 查看可用命令。`;
    }
    return handler(command.args, context);
  }

  async executeSystem(
    command: ShellCommand,
    onStdout: (data: string) => void,
    onStderr: (data: string) => void,
  ): Promise<number> {
    // Check for unsupported commands FIRST, before even checking WebContainer
    const unsupportedReason = UNSUPPORTED_COMMANDS[command.name.toLowerCase()];
    if (unsupportedReason) {
      onStderr(`\x1b[31m✗ 不支持的命令：${command.name}\x1b[0m\n`);
      onStderr(`\x1b[90m  原因：${unsupportedReason}\x1b[0m\n`);
      onStderr(`\x1b[90m  Phantom Shell 运行在浏览器沙箱（WebContainer）中。\x1b[0m\n`);
      onStderr(`\x1b[90m  支持：npm、node、npx、ls、cd、cat、mkdir、touch 等。\x1b[0m\n`);
      onStderr(`\x1b[36m  输入 /help 查看支持的命令列表。\x1b[0m\n`);
      return 1;
    }

    const webcontainer = getWebContainer();

    if (!webcontainer) {
      const support = isWebContainerSupported();
      if (!support.supported) {
        onStderr(`\x1b[31m错误：${support.reason}\x1b[0m\n`);
        return 1;
      }
      onStderr('\x1b[33m⚠ WebContainer 尚未就绪。请先用 /version 启动\x1b[0m\n');
      onStderr('\x1b[90m提示：WebContainer 仍在启动中，请稍候…\x1b[0m\n');
      return 1;
    }

    log.info('Executing system command', { command: command.raw });

    try {
      // Spawn process in WebContainer
      const process = await webcontainer.spawn(command.name, command.args);
      this.currentProcess = process;

      // Stream stdout
      process.output.pipeTo(new WritableStream({
        write(data) {
          onStdout(data);
        }
      })).catch((err) => {
        // Stream might be cancelled on kill
        if (err?.name !== 'AbortError') {
          log.error('Output stream error', { error: err });
        }
      });

      // Wait for exit
      const exitCode = await process.exit;
      this.currentProcess = null;

      log.debug('Command completed', { command: command.name, exitCode });
      return exitCode;
    } catch (error) {
      log.error('Command execution failed', { command: command.raw, error });
      onStderr(`\x1b[31m错误：${error}\x1b[0m\n`);
      this.currentProcess = null;
      return 1;
    }
  }

  async executeAI(
    command: ShellCommand,
    onOutput: (data: string) => void,
  ): Promise<number> {
    const prompt = command.args.join(' ');
    log.info('AI command', { prompt: prompt.substring(0, 100) });

    // Show thinking indicator
    onOutput('\x1b[36m⏳ 思考中…\x1b[0m\n');

    try {
      const result = await processAICommand(prompt);

      // Clear thinking indicator (move up and clear line)
      onOutput('\x1b[1A\x1b[2K');

      // Handle error
      if (result.error) {
        onOutput(`\x1b[31m${result.error}\x1b[0m\n`);
        return 1;
      }

      // Show explanation if present
      if (result.explanation) {
        onOutput(`\x1b[90m${result.explanation}\x1b[0m\n`);
      }

      // Show commands
      if (result.commands.length === 0) {
        onOutput('\x1b[33m未生成任何命令。\x1b[0m\n');
        return 0;
      }

      // Display generated commands
      onOutput('\x1b[32m📋 已生成命令：\x1b[0m\n');
      for (const cmd of result.commands) {
        onOutput(`  \x1b[36m$ ${cmd}\x1b[0m\n`);
      }
      onOutput('\n');

      // Ask user to confirm (for now, just show them)
      onOutput('\x1b[90m复制并粘贴以执行，\x1b[0m\n');
      onOutput('\x1b[90m或手动输入命令。\x1b[0m\n');

      return 0;
    } catch (error) {
      log.error('AI command execution failed', { error });
      onOutput('\x1b[1A\x1b[2K'); // Clear thinking indicator
      onOutput(`\x1b[31mAI 错误：${error}\x1b[0m\n`);
      return 1;
    }
  }

  kill() {
    if (this.currentProcess) {
      log.info('Killing current process');
      this.currentProcess.kill();
      this.currentProcess = null;
    } else {
      log.debug('Kill requested (no active process)');
    }
  }
}

export const shellExecutor = new ShellExecutor();

// ==================== SHELL RUNNER ====================

/**
 * Main entry point for running commands
 */
export const runCommand = async (
  input: string,
  context: ShellContext,
  onOutput: (data: string) => void,
): Promise<number> => {
  const command = parseCommand(input);

  log.debug('Running command', { type: command.type, name: command.name });

  switch (command.type) {
    case 'builtin': {
      const result = await shellExecutor.executeBuiltin(command, context);
      if (result) {
        onOutput(result + '\n');
      }
      return 0;
    }

    case 'ai': {
      return shellExecutor.executeAI(command, onOutput);
    }

    case 'system': {
      return shellExecutor.executeSystem(command, onOutput, onOutput);
    }

    default:
      onOutput('\x1b[31m未知的命令类型\x1b[0m\n');
      return 1;
  }
};

// ==================== UTILITIES ====================

/**
 * Create a shell context from store state
 */
export const createShellContext = (
  terminal: ShellContext['terminal'],
  store: {
    activeProjectId: string | null;
    commandHistory: { command: string; timestamp: string }[];
    projects: Record<string, PhantomProject>;
    createProject: (project: Omit<PhantomProject, 'id' | 'createdAt' | 'updatedAt'>) => string;
  }
): ShellContext => ({
  terminal,
  activeProjectId: store.activeProjectId,
  getHistory: () => store.commandHistory,
  getProjects: () => Object.values(store.projects).map(p => ({
    id: p.id,
    name: p.name,
    metadata: p.metadata,
  })),
  createProject: (name: string) => store.createProject({
    name,
    files: {},
    metadata: {},
  }),
});
