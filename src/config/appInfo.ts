/**
 * LifeOS application identity.
 *
 * Single source of truth for user-visible product metadata shown in the
 * About dialog, diagnostics and other surfaces. Upstream attribution lives
 * in NOTICE.md / LICENSE at the repository root — deliberately NOT here,
 * because end users should only ever see the LifeOS brand.
 */

export const APP_NAME = 'LifeOS';
export const APP_VERSION = '1.5.0';
export const APP_TAGLINE = '本地优先的个人综合管理平台';
export const APP_DESCRIPTION =
  'LifeOS 将日程、任务、项目、笔记、收藏与 AI 指挥中心组织在一条清晰工作流里，' +
  '帮助你看到自己的整体状态、知道今天要做什么、快速记录并整理个人信息。' +
  '所有数据默认保存在你自己的设备上，无需账户，无需服务器。';
export const APP_REPO_URL = 'https://github.com/herfavor/lifeos';
export const APP_ISSUES_URL = 'https://github.com/herfavor/lifeos/issues';
export const APP_LICENSE_URL = 'https://github.com/herfavor/lifeos/blob/main/LICENSE';

/** AI product positioning (see docs/BRANDING_MIGRATION.md §AI). */
export const AI_POSITIONING = {
  /** What the assistant is for */
  mission: ['整理', '规范', '总结', '建议'] as const,
  /** Behavioral principle: observe → understand → suggest → confirm → execute */
  principle: '观察 → 理解 → 建议 → 用户确认 → 执行',
} as const;
