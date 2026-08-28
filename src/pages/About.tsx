import { ArrowUpRight, Database, Github, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { PageContent } from '../components/PageContent';
import { aboutUsContent } from '../content/aboutUs';
import {
  APP_DESCRIPTION,
  APP_ISSUES_URL,
  APP_LICENSE_URL,
  APP_NAME,
  APP_REPO_URL,
  APP_TAGLINE,
  APP_VERSION,
} from '../config/appInfo';
import { BUILD_HASH, formatBuildTimestamp } from '../utils/buildInfo';
import { useThemeStore } from '../stores/useThemeStore';

const principles = [
  { icon: Database, title: '本地优先', text: '无账户、无必需服务器；数据保存在你的设备上。' },
  { icon: ShieldCheck, title: '你保持控制', text: '随时备份、导出和删除，不被平台锁定。' },
  { icon: Sparkles, title: 'AI 有分寸', text: '工具写入先确认，聊天生成不触碰你的工作区数据。' },
];

export function About() {
  const mode = useThemeStore((state) => state.mode);
  const logoSrc = mode === 'dark' ? '/images/logos/lifeos-logo-white.svg' : '/images/logos/lifeos-logo.svg';

  return (
    <PageContent page="about" className="pb-24">
      <div className="overflow-hidden rounded-3xl border border-border-light bg-gradient-to-br from-accent-primary/12 via-surface-light to-accent-blue/8 p-6 dark:border-border-dark dark:via-surface-dark sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-primary/10 px-3 py-1 text-xs font-semibold text-accent-primary">
              <Heart className="h-3.5 w-3.5" /> 为清晰、安静的数字生活而做
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-text-light-primary dark:text-text-dark-primary sm:text-4xl">
              {APP_NAME}
            </h2>
            <p className="mt-2 text-lg font-medium text-accent-primary">{APP_TAGLINE}</p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-text-light-secondary dark:text-text-dark-secondary sm:text-base">
              {APP_DESCRIPTION}
            </p>
          </div>
          <div className="rounded-3xl border border-white/50 bg-surface-light/80 p-8 shadow-soft backdrop-blur dark:border-white/10 dark:bg-surface-dark/70">
            <img src={logoSrc} alt="LifeOS" className="mx-auto h-auto w-full max-w-[280px]" />
            <div className="mt-6 grid grid-cols-2 gap-3 text-center text-xs">
              <div className="rounded-2xl bg-surface-light-elevated p-3 dark:bg-surface-dark-elevated">
                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">版本</p>
                <p className="mt-1 font-mono font-semibold text-text-light-primary dark:text-text-dark-primary">{APP_VERSION}</p>
              </div>
              <div className="rounded-2xl bg-surface-light-elevated p-3 dark:bg-surface-dark-elevated">
                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">构建</p>
                <p className="mt-1 truncate font-mono font-semibold text-text-light-primary dark:text-text-dark-primary">{BUILD_HASH}</p>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{formatBuildTimestamp()}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {principles.map(({ icon: Icon, title, text }) => (
          <section key={title} className="bento-card p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary"><Icon className="h-5 w-5" /></span>
            <h3 className="mt-4 font-semibold text-text-light-primary dark:text-text-dark-primary">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-text-light-secondary dark:text-text-dark-secondary">{text}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {[aboutUsContent.stories.product, aboutUsContent.stories.values].map((story) => (
          <section key={story.title} className="bento-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-primary">{story.subtitle}</p>
            <h3 className="mt-2 text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">{story.title}</h3>
            <div className="mt-4 whitespace-pre-line text-sm leading-7 text-text-light-secondary dark:text-text-dark-secondary">{story.content}</div>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-border-light bg-surface-light-elevated/60 p-4 dark:border-border-dark dark:bg-surface-dark-elevated/60">
        {[
          { href: APP_REPO_URL, label: 'GitHub 仓库', icon: Github },
          { href: APP_ISSUES_URL, label: '问题反馈', icon: ArrowUpRight },
          { href: APP_LICENSE_URL, label: 'MIT License', icon: ArrowUpRight },
        ].map(({ href, label, icon: Icon }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border-light bg-surface-light px-4 py-2 text-sm font-medium text-text-light-primary transition-colors hover:border-accent-primary hover:text-accent-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary">
            <Icon className="h-4 w-4" /> {label}
          </a>
        ))}
      </div>
    </PageContent>
  );
}
