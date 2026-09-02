/**
 * Page Metadata Registry
 *
 * Centralized configuration for page headers across the application.
 * This ensures consistency and makes it easy to update headers in one place.
 */

export interface PageMetadata {
  title: string;
  subtitle?: string;
}

export const PAGE_METADATA: Record<string, PageMetadata> = {
  '/overview': {
    title: '概览',
    subtitle: '看清全局，继续最重要的下一步',
  },
  '/ai': {
    title: 'AI',
    subtitle: '直接说你想完成什么，我来查询、安排和整理',
  },
  '/today': {
    title: '今天',
    subtitle: '有意识地规划你的一天',
  },
  '/inbox': {
    title: '收件箱',
    subtitle: '先看清未决定的内容，再安排下一步',
  },
  '/tasks': {
    title: '任务',
    subtitle: '管理清晰、可执行的下一步',
  },
  '/notes': {
    title: '笔记',
    subtitle: '承载你的想法、思考与知识的第二大脑',
  },
  '/schedule': {
    title: '日程',
    subtitle: '管理有具体时间承诺的事件和时间块',
  },
  '/settings': {
    title: '设置',
    subtitle: '管理你的数据、备份与偏好',
  },
  '/links': {
    title: '收藏',
    subtitle: '保存以后还想看的内容，并把它变成可用资料',
  },
  '/habits': {
    title: '习惯',
    subtitle: '通过每日打卡养成积极习惯',
  },
  '/graph': {
    title: '知识图谱',
    subtitle: '可视化笔记之间的关联',
  },
  '/diagrams': {
    title: '绘图',
    subtitle: '创建可视化图表与流程图',
  },
  '/forms': {
    title: '表单',
    subtitle: '构建并管理自定义表单',
  },
  '/focus': {
    title: '专注模式',
    subtitle: '无干扰的工作环境',
  },
  '/automations': {
    title: '自动化',
    subtitle: '创建规则来自动化你的工作流',
  },
  '/activity': {
    title: '回顾',
    subtitle: '回看你的工作记录与变化',
  },
  '/retrospective': {
    title: '每周回顾',
    subtitle: '总结本周进展并规划下一步',
  },
  '/docs': {
    title: '文档',
    subtitle: '专业的文档、电子表格与演示文稿',
  },
  '/create': {
    title: '文档',
    subtitle: '创建并整理本地文档',
  },
  '/pm': {
    title: '项目',
    subtitle: '围绕结果、下一步和里程碑推进工作',
  },
  '/portfolio': {
    title: '项目组合',
    subtitle: '跨项目总览与健康度跟踪',
  },
  '/energy': {
    title: '精力',
    subtitle: '跟踪精力水平并优化你的日程',
  },
  '/availability': {
    title: '空闲时间',
    subtitle: '查看并复制未来七天的空闲时段',
  },
  '/about': {
    title: '关于 LifeOS',
    subtitle: '了解产品理念、版本与开源信息',
  },
  '/privacy': {
    title: '隐私政策',
    subtitle: '了解数据在本机如何保存、使用与导出',
  },
};

export function getPageMetadata(pathname: string): PageMetadata | null {
  if (PAGE_METADATA[pathname]) return PAGE_METADATA[pathname];
  if (pathname.startsWith('/diagrams/')) return PAGE_METADATA['/diagrams'];
  if (pathname.startsWith('/forms/')) return PAGE_METADATA['/forms'];
  if (pathname.startsWith('/create/')) return PAGE_METADATA['/create'];
  return null;
}

export function getPageTitle(pathname: string): string {
  return getPageMetadata(pathname)?.title || 'LifeOS';
}
