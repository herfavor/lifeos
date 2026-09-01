import { Link } from 'react-router-dom';
import { Bot, Database, Download, EyeOff, ShieldCheck } from 'lucide-react';
import { PageContent } from '../components/PageContent';
import { APP_ISSUES_URL, APP_NAME } from '../config/appInfo';

const promises = [
  { icon: Database, title: '本地存储', text: '任务、笔记、日程、收藏和设置默认存在本机 IndexedDB / 本地存储中。' },
  { icon: EyeOff, title: '零遥测', text: '不内置广告、访客追踪、使用埋点或会话录制。' },
  { icon: Download, title: '数据可携带', text: '可在设置中导出 LifeOS 备份文件，并由你选择保存位置。' },
  { icon: Bot, title: 'AI 由你启用', text: 'API 请求仅在你配置并使用 AI 时，由浏览器直接发往你选择的服务商。' },
];

export function Privacy() {
  return (
    <PageContent page="privacy" className="pb-24">
      <section className="overflow-hidden rounded-3xl border border-border-light bg-gradient-to-br from-accent-green/12 via-surface-light to-accent-blue/10 p-6 dark:border-border-dark dark:via-surface-dark sm:p-10">
        <div className="max-w-3xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-green/12 text-accent-green"><ShieldCheck className="h-6 w-6" /></span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-green">{APP_NAME} 隐私承诺</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text-light-primary dark:text-text-dark-primary sm:text-4xl">你的数据属于你</h2>
          <p className="mt-4 text-base leading-7 text-text-light-secondary dark:text-text-dark-secondary">
            LifeOS 是一个本地优先、无账户要求的应用。核心工作区不需要 LifeOS 后端，断网也能继续使用。
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {promises.map(({ icon: Icon, title, text }) => (
          <section key={title} className="bento-card p-6">
            <Icon className="h-5 w-5 text-accent-primary" />
            <h3 className="mt-3 font-semibold text-text-light-primary dark:text-text-dark-primary">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-text-light-secondary dark:text-text-dark-secondary">{text}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="bento-card p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">什么时候会访问网络？</h3>
          <div className="mt-4 space-y-4 text-sm leading-7 text-text-light-secondary dark:text-text-dark-secondary">
            <p>核心数据不会上传到 LifeOS 服务器。但某些你主动启用的功能需要连接外部服务：例如天气数据、ICS 日历订阅，以及你配置的 AI 提供商。</p>
            <p>AI 跨模块上下文默认关闭。开启后，工作区摘要才会随当次请求发往你选择的 AI 服务商。API 密钥在本机加密保存。</p>
          </div>
        </article>
        <aside className="bento-card p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">你的控制权</h3>
          <ul className="mt-4 space-y-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            <li>• 在「设置 → 备份」创建完整备份</li>
            <li>• 在「设置 → 导入与导出」管理数据</li>
            <li>• 在「设置 → AI 提供商」控制密钥与上下文</li>
            <li>• 可审计 MIT 开源代码</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/settings?tab=backup" className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-medium text-white">前往备份</Link>
            <a href={APP_ISSUES_URL} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-border-light px-4 py-2 text-sm font-medium text-text-light-primary dark:border-border-dark dark:text-text-dark-primary">隐私问题反馈</a>
          </div>
        </aside>
      </div>

      <p className="mt-6 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">最后更新：2026 年 8 月。本页描述当前应用行为；如果网络或数据行为变更，本页也会同步更新。</p>
    </PageContent>
  );
}
