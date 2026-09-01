/**
 * Terminal Help Modal
 * In-app help for AI Terminal and Phantom Shell
 */

import React, { useState } from 'react';
import { Bot, Bug, BookOpen, CheckCircle2, HelpCircle, Keyboard, MessageSquare, Rocket, Settings2, Wrench, X, XCircle, AlertTriangle } from 'lucide-react';

interface TerminalHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpTab = 'quickstart' | 'providers' | 'shell' | 'troubleshooting';

export const TerminalHelpModal: React.FC<TerminalHelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<HelpTab>('quickstart');

  if (!isOpen) return null;

  const tabs: { id: HelpTab; label: string; icon: typeof Rocket }[] = [
    { id: 'quickstart', label: '快速开始', icon: Rocket },
    { id: 'providers', label: 'AI 提供商', icon: Bot },
    { id: 'shell', label: 'Shell 命令', icon: Keyboard },
    { id: 'troubleshooting', label: '帮助', icon: HelpCircle },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-dark border border-border-dark rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-dark">
          <h2 className="text-base font-semibold text-text-dark-primary">终端帮助</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-dark-elevated rounded transition-colors text-sm"
            aria-label="关闭帮助"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-dark">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-accent-primary border-b-2 border-accent-primary bg-surface-dark-elevated'
                  : 'text-text-dark-secondary hover:text-text-dark-primary hover:bg-surface-dark-elevated'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 inline mr-1" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 text-xs text-text-dark-secondary">
          {activeTab === 'quickstart' && <QuickStartTab />}
          {activeTab === 'providers' && <ProvidersTab />}
          {activeTab === 'shell' && <ShellTab />}
          {activeTab === 'troubleshooting' && <TroubleshootingTab />}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-border-dark text-[10px] text-text-dark-tertiary text-center">
          <a
            href="/create/platform/terminal-complete"
            className="text-accent-primary hover:underline"
          >
            查看完整文档 →
          </a>
        </div>
      </div>
    </div>
  );
};

const QuickStartTab: React.FC = () => (
  <div className="space-y-3">
    <section>
      <h3 className="text-sm font-semibold text-text-dark-primary mb-1.5">两种模式</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-surface-dark-elevated rounded-lg">
          <div className="text-base mb-0.5"><MessageSquare className="w-4 h-4 inline mr-1" />AI 聊天</div>
          <p className="text-[10px] text-text-dark-tertiary">
            与 AI 模型对话。提问、获取代码帮助、进行头脑风暴。
          </p>
        </div>
        <div className="p-2 bg-surface-dark-elevated rounded-lg">
          <div className="text-base mb-0.5"><Keyboard className="w-4 h-4 inline mr-1" />Phantom Shell</div>
          <p className="text-[10px] text-text-dark-tertiary">
            在浏览器中运行 npm/node 命令。无需安装任何东西即可构建项目。
          </p>
        </div>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-semibold text-text-dark-primary mb-1.5">快速上手</h3>
      <ol className="list-decimal list-inside space-y-1 text-[11px]">
        <li>点击 <Settings2 className="w-3 h-3 inline" /> 打开<strong>提供商设置</strong></li>
        <li>添加 API 密钥（我们推荐 <strong>OpenRouter</strong> - 免费！）</li>
        <li>开始聊天，或切换到 Shell 标签页</li>
      </ol>
    </section>

    <section>
      <h3 className="text-sm font-semibold text-text-dark-primary mb-1.5">键盘快捷键</h3>
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="flex justify-between p-1.5 bg-surface-dark-elevated rounded">
          <span>打开/关闭终端</span>
          <kbd className="px-1 bg-surface-dark rounded">Ctrl+Shift+A</kbd>
        </div>
        <div className="flex justify-between p-1.5 bg-surface-dark-elevated rounded">
          <span>发送消息</span>
          <kbd className="px-1 bg-surface-dark rounded">Enter</kbd>
        </div>
        <div className="flex justify-between p-1.5 bg-surface-dark-elevated rounded">
          <span>换行</span>
          <kbd className="px-1 bg-surface-dark rounded">Shift+Enter</kbd>
        </div>
        <div className="flex justify-between p-1.5 bg-surface-dark-elevated rounded">
          <span>命令历史</span>
          <kbd className="px-1 bg-surface-dark rounded">↑ ↓</kbd>
        </div>
      </div>
    </section>
  </div>
);

const ProvidersTab: React.FC = () => (
  <div className="space-y-3">
    <section>
      <h3 className="text-sm font-semibold text-text-dark-primary mb-1.5">提供商对比</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-left border-b border-border-dark">
              <th className="p-1.5">提供商</th>
              <th className="p-1.5">免费</th>
              <th className="p-1.5">浏览器</th>
              <th className="p-1.5">最适合</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dark">
            <tr className="bg-accent-green/10">
              <td className="p-1.5 font-medium">OpenRouter</td>
              <td className="p-1.5"><CheckCircle2 className="w-3 h-3 inline mr-0.5 text-accent-green" />是</td>
              <td className="p-1.5"><CheckCircle2 className="w-3 h-3 inline mr-0.5 text-accent-green" />直连</td>
              <td className="p-1.5">综合最佳 - 200+ 模型</td>
            </tr>
            <tr>
              <td className="p-1.5">Groq</td>
              <td className="p-1.5"><CheckCircle2 className="w-3 h-3 inline mr-0.5 text-accent-green" />是</td>
              <td className="p-1.5"><AlertTriangle className="w-3 h-3 inline mr-0.5 text-accent-yellow" />受限</td>
              <td className="p-1.5">响应最快</td>
            </tr>
            <tr>
              <td className="p-1.5">HuggingFace</td>
              <td className="p-1.5"><CheckCircle2 className="w-3 h-3 inline mr-0.5 text-accent-green" />是</td>
              <td className="p-1.5"><CheckCircle2 className="w-3 h-3 inline mr-0.5 text-accent-green" />直连</td>
              <td className="p-1.5">开源模型</td>
            </tr>
            <tr className="bg-accent-blue/10">
              <td className="p-1.5 font-medium">Anthropic</td>
              <td className="p-1.5"><XCircle className="w-3 h-3 inline mr-0.5 text-accent-red" />否</td>
              <td className="p-1.5"><CheckCircle2 className="w-3 h-3 inline mr-0.5 text-accent-green" />直连</td>
              <td className="p-1.5">质量最佳（Claude）</td>
            </tr>
            <tr>
              <td className="p-1.5">OpenAI</td>
              <td className="p-1.5"><XCircle className="w-3 h-3 inline mr-0.5 text-accent-red" />否</td>
              <td className="p-1.5"><AlertTriangle className="w-3 h-3 inline mr-0.5 text-accent-yellow" />代理</td>
              <td className="p-1.5">GPT-4, o1</td>
            </tr>
            <tr>
              <td className="p-1.5">DeepSeek</td>
              <td className="p-1.5"><XCircle className="w-3 h-3 inline mr-0.5 text-accent-red" />否</td>
              <td className="p-1.5"><AlertTriangle className="w-3 h-3 inline mr-0.5 text-accent-yellow" />代理</td>
              <td className="p-1.5">性价比高，擅长编码</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-semibold text-text-dark-primary mb-1.5">
        “需要代理”是什么意思？
      </h3>
      <div className="p-2 bg-accent-yellow/10 border border-accent-yellow/20 rounded-lg text-[10px]">
        <p className="mb-1">
          部分提供商（OpenAI、xAI、DeepSeek）出于安全（CORS）原因阻止浏览器的直接请求。
        </p>
        <p className="font-medium text-accent-yellow mb-0.5">简单解决方案：</p>
        <p>
          改用 <strong>OpenRouter</strong> - 它通过一个可在浏览器中直接使用的 API 提供
          GPT-4、Claude 以及 200 多个其他模型的访问。
        </p>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-semibold text-text-dark-primary mb-1.5">免费 API 密钥</h3>
      <ul className="space-y-0.5 text-[10px]">
        <li>
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            OpenRouter →
          </a>{' '}
          <span className="text-text-dark-tertiary">免费套餐，200+ 模型</span>
        </li>
        <li>
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            Groq →
          </a>{' '}
          <span className="text-text-dark-tertiary">免费套餐，推理最快</span>
        </li>
        <li>
          <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
            HuggingFace →
          </a>{' '}
          <span className="text-text-dark-tertiary">免费套餐，开放模型</span>
        </li>
      </ul>
    </section>
  </div>
);

const ShellTab: React.FC = () => (
  <div className="space-y-3">
    <section>
      <h3 className="text-sm font-semibold text-text-dark-primary mb-1.5">内置命令</h3>
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="p-1.5 bg-surface-dark-elevated rounded font-mono">
          <span className="text-accent-primary">/help</span> - 显示命令
        </div>
        <div className="p-1.5 bg-surface-dark-elevated rounded font-mono">
          <span className="text-accent-primary">/version</span> - 启动 WebContainer
        </div>
        <div className="p-1.5 bg-surface-dark-elevated rounded font-mono">
          <span className="text-accent-primary">/clear</span> - 清屏
        </div>
        <div className="p-1.5 bg-surface-dark-elevated rounded font-mono">
          <span className="text-accent-primary">/new name</span> - 新建项目
        </div>
        <div className="p-1.5 bg-surface-dark-elevated rounded font-mono">
          <span className="text-accent-primary">/ai prompt</span> - 询问 AI
        </div>
        <div className="p-1.5 bg-surface-dark-elevated rounded font-mono">
          <span className="text-accent-primary">/projects</span> - 列出项目
        </div>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-semibold text-text-dark-primary mb-1.5">可用与不可用</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-accent-green/10 border border-accent-green/20 rounded-lg">
          <div className="font-medium text-accent-green mb-0.5 text-[11px]"><CheckCircle2 className="w-3 h-3 inline mr-0.5" />可用</div>
          <ul className="text-[10px] space-y-0.5">
            <li><code>npm install</code>, <code>npm run dev</code></li>
            <li><code>node script.js</code></li>
            <li><code>npx create-react-app</code></li>
            <li><code>ls</code>, <code>cd</code>, <code>cat</code>, <code>mkdir</code></li>
          </ul>
        </div>
        <div className="p-2 bg-accent-red/10 border border-accent-red/20 rounded-lg">
          <div className="font-medium text-accent-red mb-0.5 text-[11px]"><XCircle className="w-3 h-3 inline mr-0.5" />不可用</div>
          <ul className="text-[10px] space-y-0.5">
            <li><code>git</code> - 使用 GitHub 组件</li>
            <li><code>docker</code> - 不可用</li>
            <li><code>python</code> - 请使用 Node.js</li>
            <li><code>ping</code>, <code>curl</code> - 不支持系统调用</li>
          </ul>
        </div>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-semibold text-text-dark-primary mb-1.5">第一次使用？</h3>
      <ol className="list-decimal list-inside space-y-0.5 text-[10px]">
        <li>切换到 <strong>Shell</strong> 标签页</li>
        <li>运行 <code className="bg-surface-dark-elevated px-1 rounded">/version</code> 启动 WebContainer（2-5 秒）</li>
        <li>尝试 <code className="bg-surface-dark-elevated px-1 rounded">node -v</code> 验证是否可用</li>
        <li>运行 <code className="bg-surface-dark-elevated px-1 rounded">/new myapp</code> 创建项目</li>
      </ol>
    </section>
  </div>
);

const TroubleshootingTab: React.FC = () => (
  <div className="space-y-3">
    <section>
      <h3 className="text-sm font-semibold text-text-dark-primary mb-1.5">常见问题</h3>

      <div className="space-y-2">
        <div className="p-2 bg-surface-dark-elevated rounded-lg">
          <div className="font-medium text-text-dark-primary mb-0.5 text-[11px]">
            OpenAI/xAI 上提示“需要代理”
          </div>
          <p className="text-[10px] text-text-dark-tertiary mb-1">
            这些提供商阻止浏览器请求。请改用 OpenRouter - 它可以访问 GPT-4 并直接使用。
          </p>
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent-primary hover:underline">
            获取 OpenRouter 密钥 →
          </a>
        </div>

        <div className="p-2 bg-surface-dark-elevated rounded-lg">
          <div className="font-medium text-text-dark-primary mb-0.5 text-[11px]">
            “WebContainer 未就绪”
          </div>
          <p className="text-[10px] text-text-dark-tertiary">
            先运行 <code className="bg-surface-dark px-1 rounded">/version</code>。WebContainer 需要 2-5 秒启动。
          </p>
        </div>

        <div className="p-2 bg-surface-dark-elevated rounded-lg">
          <div className="font-medium text-text-dark-primary mb-0.5 text-[11px]">
            “ping”/“git”/“docker”无法使用
          </div>
          <p className="text-[10px] text-text-dark-tertiary">
            WebContainer 仅支持 Node.js。git 请使用 GitHub 组件。网络操作请使用
            <code className="bg-surface-dark px-1 rounded ml-1">node -e "fetch('url')"</code>
          </p>
        </div>

        <div className="p-2 bg-surface-dark-elevated rounded-lg">
          <div className="font-medium text-text-dark-primary mb-0.5 text-[11px]">
            “无效的 API 密钥”
          </div>
          <p className="text-[10px] text-text-dark-tertiary">
            检查：已选择正确的提供商、密钥复制无误（无空格）、密钥未过期/未被吊销。
          </p>
        </div>

        <div className="p-2 bg-surface-dark-elevated rounded-lg">
          <div className="font-medium text-text-dark-primary mb-0.5 text-[11px]">
            “超出速率限制”
          </div>
          <p className="text-[10px] text-text-dark-tertiary">
            请等待几分钟，或配置多个提供商以便自动切换。
          </p>
        </div>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-semibold text-text-dark-primary mb-1.5">仍需要帮助？</h3>
      <ul className="space-y-0.5 text-[10px]">
        <li>
          <a
            href="/create/platform/terminal-complete"
            className="text-accent-primary hover:underline"
          >
            <BookOpen className="w-3 h-3 inline mr-1" />完整文档
          </a>
        </li>
        <li>
          <a
            href="/create/platform/backend-proxy-setup"
            className="text-accent-primary hover:underline"
          >
            <Wrench className="w-3 h-3 inline mr-1" />后端代理设置（高级）
          </a>
        </li>
        <li>
          <a
            href="https://github.com/herfavor/lifeos/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            <Bug className="w-3 h-3 inline mr-1" />报告问题
          </a>
        </li>
      </ul>
    </section>
  </div>
);

export default TerminalHelpModal;
