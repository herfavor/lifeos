import type { HabitFrequency, HabitCategory } from '../types';

export interface HabitTemplatePack {
  name: string;
  description: string;
  icon: string;
  templates: Array<{
    title: string;
    description: string;
    icon: string;
    color: string;
    frequency: HabitFrequency;
    category: HabitCategory;
    timesPerWeek?: number;
  }>;
}

export const HABIT_TEMPLATE_PACKS: HabitTemplatePack[] = [
  {
    name: '晨间例行',
    description: '带着目标和活力开启新一天',
    icon: '🌅',
    templates: [
      { title: '早起', description: '早上 7 点前起床', icon: '⏰', color: '#f97316', frequency: 'weekdays', category: 'productivity' },
      { title: '锻炼', description: '30 分钟身体活动', icon: '💪', color: '#22c55e', frequency: 'daily', category: 'fitness' },
      { title: '冥想', description: '10 分钟正念练习', icon: '🧘', color: '#06b6d4', frequency: 'daily', category: 'mindfulness' },
      { title: '写日记', description: '写下早晨的反思', icon: '✍️', color: '#ec4899', frequency: 'daily', category: 'mindfulness' },
    ],
  },
  {
    name: '健康与健身',
    description: '养成更健康的生活方式',
    icon: '🏋️',
    templates: [
      { title: '喝 8 杯水', description: '全天保持水分充足', icon: '💧', color: '#3b82f6', frequency: 'daily', category: 'health' },
      { title: '步行 1 万步', description: '每天至少走 10,000 步', icon: '🚶', color: '#22c55e', frequency: 'daily', category: 'fitness' },
      { title: '健康饮食', description: '吃一顿均衡有营养的饭', icon: '🥗', color: '#84cc16', frequency: 'daily', category: 'nutrition' },
      { title: '拉伸', description: '15 分钟拉伸或瑜伽', icon: '🤸', color: '#8b5cf6', frequency: 'daily', category: 'fitness' },
    ],
  },
  {
    name: '学习',
    description: '持续成长与技能提升',
    icon: '📚',
    templates: [
      { title: '阅读 30 分钟', description: '读一本书或一篇长文', icon: '📖', color: '#8b5cf6', frequency: 'daily', category: 'learning' },
      { title: '练习技能', description: '对某项技能进行刻意练习', icon: '🎯', color: '#f97316', frequency: 'times-per-week', category: 'learning', timesPerWeek: 5 },
      { title: '回顾笔记', description: '回顾并整理你的笔记', icon: '📝', color: '#06b6d4', frequency: 'times-per-week', category: 'learning', timesPerWeek: 3 },
    ],
  },
  {
    name: '效率',
    description: '最大化你的效率',
    icon: '⚡',
    templates: [
      { title: '规划明天', description: '晚上回顾今天并规划明天', icon: '📋', color: '#3b82f6', frequency: 'weekdays', category: 'productivity' },
      { title: '深度工作 2 小时', description: '2 小时专注、不受打扰的工作', icon: '🧠', color: '#ef4444', frequency: 'weekdays', category: 'productivity' },
      { title: '每周回顾', description: '回顾进展并调整目标', icon: '📊', color: '#8b5cf6', frequency: 'times-per-week', category: 'productivity', timesPerWeek: 1 },
      { title: '收件箱清零', description: '把邮件全部处理完', icon: '📧', color: '#22c55e', frequency: 'weekdays', category: 'productivity' },
    ],
  },
  {
    name: '正念',
    description: '培养专注与身心安宁',
    icon: '🧘',
    templates: [
      { title: '冥想', description: '静坐冥想练习', icon: '🧘', color: '#06b6d4', frequency: 'daily', category: 'mindfulness' },
      { title: '感恩日记', description: '写下 3 件你心存感激的事', icon: '🙏', color: '#eab308', frequency: 'daily', category: 'mindfulness' },
      { title: '数字排毒 1 小时', description: '离开屏幕一小时', icon: '📵', color: '#ef4444', frequency: 'daily', category: 'mindfulness' },
      { title: '自然散步', description: '到户外亲近自然', icon: '🌿', color: '#22c55e', frequency: 'times-per-week', category: 'mindfulness', timesPerWeek: 3 },
    ],
  },
];
