import type { TimeOfDay } from '../stores/useRoutineStore';
import type { HabitCategory, HabitFrequency } from '../types';

export interface RoutineTemplateHabit {
  title: string;
  description: string;
  icon: string;
  color: string;
  category: HabitCategory;
  frequency: HabitFrequency;
}

export interface RoutineTemplate {
  name: string;
  description: string;
  icon: string;
  timeOfDay: TimeOfDay;
  estimatedMinutes: number;
  habits: RoutineTemplateHabit[];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    name: '晨间例行',
    description: '带着目标和活力开启新一天',
    icon: '🌅',
    timeOfDay: 'morning',
    estimatedMinutes: 25,
    habits: [
      {
        title: '早起',
        description: '在目标时间起床',
        icon: '⏰',
        color: '#f97316',
        category: 'health',
        frequency: 'daily',
      },
      {
        title: '补充水分',
        description: '喝一整杯水',
        icon: '💧',
        color: '#06b6d4',
        category: 'health',
        frequency: 'daily',
      },
      {
        title: '冥想',
        description: '5-10 分钟正念呼吸',
        icon: '🧘',
        color: '#8b5cf6',
        category: 'mindfulness',
        frequency: 'daily',
      },
      {
        title: '锻炼',
        description: '15 分钟运动为身体充电',
        icon: '🏃',
        color: '#22c55e',
        category: 'fitness',
        frequency: 'daily',
      },
      {
        title: '写日记',
        description: '写下意图与感恩',
        icon: '✍️',
        color: '#ec4899',
        category: 'mindfulness',
        frequency: 'daily',
      },
    ],
  },
  {
    name: '晚间例行',
    description: '放松身心，为安稳睡眠做准备',
    icon: '🌙',
    timeOfDay: 'evening',
    estimatedMinutes: 20,
    habits: [
      {
        title: '规划明天',
        description: '回顾任务并为第二天设定优先级',
        icon: '📋',
        color: '#3b82f6',
        category: 'productivity',
        frequency: 'daily',
      },
      {
        title: '阅读',
        description: '至少阅读 15 分钟',
        icon: '📖',
        color: '#8b5cf6',
        category: 'learning',
        frequency: 'daily',
      },
      {
        title: '感恩',
        description: '写下今天 3 件你心存感激的事',
        icon: '🙏',
        color: '#eab308',
        category: 'mindfulness',
        frequency: 'daily',
      },
      {
        title: '睡前准备',
        description: '关闭屏幕，准备入睡',
        icon: '😴',
        color: '#6366f1',
        category: 'health',
        frequency: 'daily',
      },
    ],
  },
  {
    name: '专注工作',
    description: '深度工作时段，实现最高效率',
    icon: '💼',
    timeOfDay: 'morning',
    estimatedMinutes: 90,
    habits: [
      {
        title: '清理收件箱',
        description: '处理并分类消息，实现收件箱清零',
        icon: '📧',
        color: '#06b6d4',
        category: 'productivity',
        frequency: 'weekdays',
      },
      {
        title: '三项要事',
        description: '确定并承诺完成最重要的 3 项任务',
        icon: '🎯',
        color: '#ef4444',
        category: 'productivity',
        frequency: 'weekdays',
      },
      {
        title: '深度工作',
        description: '60 分钟专注、不受打扰的工作',
        icon: '🔥',
        color: '#f97316',
        category: 'productivity',
        frequency: 'weekdays',
      },
      {
        title: '休息',
        description: '离开办公桌，好好休息 10 分钟',
        icon: '☕',
        color: '#22c55e',
        category: 'health',
        frequency: 'weekdays',
      },
    ],
  },
  {
    name: '健身',
    description: '完整的训练，包含适当的热身与恢复',
    icon: '🏋️',
    timeOfDay: 'anytime',
    estimatedMinutes: 45,
    habits: [
      {
        title: '热身',
        description: '5-10 分钟动态拉伸',
        icon: '🔥',
        color: '#f97316',
        category: 'fitness',
        frequency: 'daily',
      },
      {
        title: '正式训练',
        description: '25-30 分钟按计划进行的锻炼',
        icon: '💪',
        color: '#ef4444',
        category: 'fitness',
        frequency: 'daily',
      },
      {
        title: '放松',
        description: '5 分钟轻缓运动以降低心率',
        icon: '🧊',
        color: '#06b6d4',
        category: 'fitness',
        frequency: 'daily',
      },
      {
        title: '拉伸',
        description: '5-10 分钟静态拉伸帮助恢复',
        icon: '🤸',
        color: '#22c55e',
        category: 'fitness',
        frequency: 'daily',
      },
    ],
  },
];
