/**
 * Quick prompts for the AI 指挥中心 / side panel composer.
 * Each entry spotlights a management capability of the agent.
 */

import {
  CalendarDays,
  CalendarPlus,
  FileText,
  Lightbulb,
  ListChecks,
  PenLine,
  Search,
  Sparkles,
  TextQuote,
  type LucideIcon,
} from 'lucide-react';

export interface QuickPrompt {
  label: string;
  icon: LucideIcon;
  prompt: string;
}

export const AGENT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: '总结未完成任务',
    icon: ListChecks,
    prompt: '请总结我当前未完成的任务，并按优先级给出今天建议专注的 1-3 件事。',
  },
  {
    label: '今日日程速览',
    icon: CalendarDays,
    prompt: '查一下我今天和未来三天的日程，指出空闲时段和潜在冲突。',
  },
  {
    label: '规划明天',
    icon: CalendarPlus,
    prompt: '结合我未完成的任务和明天的日程，为我规划一个可行的明日时间表。',
  },
  {
    label: '生成周报笔记',
    icon: FileText,
    prompt:
      '请根据我本周的任务完成情况生成一篇周报笔记并保存，标题带日期，内容包含：已完成事项、进行中事项、下周计划建议。',
  },
  {
    label: '记录一个想法',
    icon: Lightbulb,
    prompt: '帮我把下面的想法整理成一篇结构化笔记保存：',
  },
];

export const CHAT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: '润色文字',
    icon: TextQuote,
    prompt: '请帮我润色下面的文字，保持原意，让表达更清楚自然：\n',
  },
  {
    label: '深度分析',
    icon: Search,
    prompt: '请从目标、约束、风险和可执行下一步四个角度，深入分析这个问题：\n',
  },
  {
    label: '起草内容',
    icon: PenLine,
    prompt: '请根据我的要求起草一份完整、可直接使用的内容：\n',
  },
  {
    label: '头脑风暴',
    icon: Sparkles,
    prompt: '围绕下面的主题进行有层次的头脑风暴，并给出最值得尝试的三个方向：\n',
  },
];
