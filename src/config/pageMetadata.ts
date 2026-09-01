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
  '/': {
    title: '首页',
    subtitle: '继续最重要的下一步',
  },
  '/ai': {
    title: 'AI',
    subtitle: '管理 LifeOS 的本地副驾',
  },
  '/today': {
    title: '今天',
    subtitle: '有意识地安排你的一天',
  },
  '/inbox': {
    title: '收件箱',
    subtitle: '先接住，再安排',
  },
  '/tasks': {
    title: '任务',
    subtitle: '清晰、可执行的下一步',
  },
  '/notes': {
    title: '笔记',
    subtitle: '你的第二大脑',
  },
  '/schedule': {
    title: '日程',
    subtitle: '承诺的时间与安排',
  },
  '/settings': {
    title: '设置',
    subtitle: '数据、备份与偏好',
  },
  '/links': {
    title: '收藏',
    subtitle: '以后还想看的内容',
  },
  '/habits': {
    title: '习惯',
    subtitle: '每日打卡',
  },
  '/graph': {
    title: '知识图谱',
    subtitle: '笔记之间的关联',
  },
  '/diagrams': {
    title: '绘图',
    subtitle: '可视化图表与流程图',
  },
  '/forms': {
    title: '表单',
    subtitle: '自定义表单',
  },
  '/focus': {
    title: '专注模式',
    subtitle: '无干扰工作环境',
  },
  '/automations': {
    title: '自动化',
    subtitle: '自动化你的工作流',
  },
  '/activity': {
    title: '回顾',
    subtitle: '工作记录与变化',
  },
  '/retrospective': {
    title: '每周回顾',
    subtitle: '总结本周并规划下一步',
  },
  '/docs': {
    title: '文档',
    subtitle: '文档、表格与演示',
  },
  '/create': {
    title: '文档',
    subtitle: '创建并整理本地文档',
  },
  '/pm': {
    title: '项目',
    subtitle: '结果、下一步与里程碑',
  },
  '/portfolio': {
    title: '项目组合',
    subtitle: '跨项目总览',
  },
  '/energy': {
    title: '精力',
    subtitle: '跟踪精力水平',
  },
  '/availability': {
    title: '空闲时间',
    subtitle: '未来七天的空闲时段',
  },
  '/about': {
    title: '关于 LifeOS',
    subtitle: '产品理念、版本与开源',
  },
  '/privacy': {
    title: '隐私政策',
    subtitle: '数据如何保存、使用与导出',
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
