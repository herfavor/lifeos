/**
 * Demo dataset "小张的一周" — one consistent week of sample content.
 *
 * Every entity id carries the `demo-` prefix so clearDemoData() can remove
 * the dataset precisely without touching user content. Dates are computed
 * relative to "today" so the week always reads as current.
 */

import { markdownToLexical } from '../../utils/markdownToLexical';
import type { Task, CalendarEvent, ProjectContext } from '../../types';
import type { Note } from '../../types/notes';
import type { Link, LinkCollection } from '../../stores/useLinkLibraryStore';
import type { Habit, HabitCompletion } from '../../types';

const iso = (d: Date): string => d.toISOString();
const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const habitDayKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

const addDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

export const DEMO_IDS = {
  projects: ['demo-project-site', 'demo-project-fitness', 'demo-project-reading'],
  tasks: [
    'demo-task-01', 'demo-task-02', 'demo-task-03', 'demo-task-04', 'demo-task-05',
    'demo-task-06', 'demo-task-07', 'demo-task-08', 'demo-task-09', 'demo-task-10',
  ],
  notes: ['demo-note-01', 'demo-note-02', 'demo-note-03', 'demo-note-04', 'demo-note-05'],
  events: ['demo-event-01', 'demo-event-02', 'demo-event-03', 'demo-event-04', 'demo-event-05', 'demo-event-06'],
  links: ['demo-link-01', 'demo-link-02', 'demo-link-03', 'demo-link-04'],
  collections: ['demo-collection-design', 'demo-collection-reading'],
  habits: ['demo-habit-01', 'demo-habit-02', 'demo-habit-03'],
} as const;

const isDemoId = (id: string): boolean => id.startsWith('demo-');

export interface DemoDataset {
  projects: ProjectContext[];
  tasks: Task[];
  notes: Note[];
  eventsByDate: Record<string, CalendarEvent[]>;
  links: Record<string, Link>;
  collections: Record<string, LinkCollection>;
  habits: Habit[];
  completions: HabitCompletion[];
  activities: Array<{
    id: string;
    type: 'created' | 'updated' | 'deleted' | 'completed' | 'viewed';
    module: 'notes' | 'tasks' | 'calendar' | 'docs' | 'time-tracking' | 'habits' | 'links' | 'ai' | 'forms' | 'diagrams';
    entityId: string;
    entityTitle: string;
    timestamp: string;
  }>;
}

export function buildDemoDataset(): DemoDataset {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const at = (base: Date, hours: number, minutes = 0): Date => {
    const d = new Date(base);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };
  const dayAt = (offset: number, hours: number, minutes?: number): Date => at(addDays(today, offset), hours, minutes);
  const lastWeek = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  // ---------- 项目 ----------
  const projects: ProjectContext[] = [
    {
      id: DEMO_IDS.projects[0],
      name: '网站改版',
      parentId: null,
      color: '#7BA8B8',
      description: '个人主页的视觉升级与性能优化，本周聚焦移动端。',
      createdAt: iso(dayAt(-14, 9)),
      updatedAt: iso(dayAt(-1, 18)),
    },
    {
      id: DEMO_IDS.projects[1],
      name: '体能重启计划',
      parentId: null,
      color: '#22C55E',
      description: '八周力量训练 + 每周三次有氧。',
      createdAt: iso(dayAt(-21, 8)),
      updatedAt: iso(dayAt(-2, 20)),
    },
    {
      id: DEMO_IDS.projects[2],
      name: '秋季读书计划',
      parentId: null,
      color: '#A78BFA',
      description: '每月两本书，输出读书笔记。',
      createdAt: iso(dayAt(-30, 10)),
      updatedAt: iso(dayAt(-4, 21)),
    },
  ];
  const [site, fitness, reading] = DEMO_IDS.projects;

  // ---------- 任务 ----------
  const baseTask = {
    startDate: null,
    whenTag: 'anytime' as const,
    tags: [] as string[],
    projectIds: [] as string[],
    checklist: [] as Task['checklist'],
    comments: [] as Task['comments'],
    subtasks: [] as Task['subtasks'],
    activityLog: [] as Task['activityLog'],
    dependencies: [] as Task['dependencies'],
  };

  const tasks: Task[] = [
    {
      ...baseTask,
      id: DEMO_IDS.tasks[0],
      title: '完成首页视觉稿终稿',
      description: '按周三评审意见调整卡片圆角与留白，输出切图标注。',
      status: 'inprogress',
      created: iso(dayAt(-5, 10)),
      dueDate: dateKey(today),
      priority: 'high',
      tags: ['设计'],
      projectIds: [site],
      progress: 70,
      comments: [
        {
          id: 'demo-comment-01',
          taskId: DEMO_IDS.tasks[0],
          author: '小张',
          text: '评审意见：卡片统一 16px 圆角，主按钮只保留一处强调色。',
          createdAt: iso(dayAt(-2, 15)),
        },
      ],
    },
    {
      ...baseTask,
      id: DEMO_IDS.tasks[1],
      title: '修复移动端导航溢出',
      description: 'iPhone SE 分辨率下侧边栏图标被裁切。',
      status: 'todo',
      created: iso(dayAt(-3, 11)),
      dueDate: dateKey(addDays(today, -1)),
      priority: 'high',
      tags: ['前端', 'bug'],
      projectIds: [site],
    },
    {
      ...baseTask,
      id: DEMO_IDS.tasks[2],
      title: '整理改版需求清单',
      description: '把散落在聊天记录里的需求汇总成一页清单。',
      status: 'todo',
      created: iso(dayAt(-6, 9)),
      dueDate: dateKey(addDays(today, -2)),
      priority: 'medium',
      tags: ['规划'],
      projectIds: [site],
    },
    {
      ...baseTask,
      id: DEMO_IDS.tasks[3],
      title: '写本周训练日志',
      description: '',
      status: 'todo',
      created: iso(dayAt(-1, 8)),
      dueDate: dateKey(today),
      priority: 'medium',
      tags: ['健康'],
      projectIds: [fitness],
    },
    {
      ...baseTask,
      id: DEMO_IDS.tasks[4],
      title: '预约年度体检',
      description: '挑一个不加班的周五上午。',
      status: 'todo',
      created: iso(dayAt(-2, 19)),
      dueDate: dateKey(addDays(today, 3)),
      priority: 'low',
      tags: ['生活'],
      projectIds: [],
    },
    {
      ...baseTask,
      id: DEMO_IDS.tasks[5],
      title: '《思考，快与慢》第三章笔记',
      description: '整理系统一/系统二的常见错觉案例。',
      status: 'inprogress',
      created: iso(dayAt(-4, 21)),
      dueDate: dateKey(addDays(today, 2)),
      priority: 'medium',
      tags: ['读书'],
      projectIds: [reading],
      subtasks: [
        {
          id: 'demo-subtask-01',
          parentTaskId: DEMO_IDS.tasks[5],
          title: '摘录三组经典实验',
          completed: true,
          order: 0,
          createdAt: iso(dayAt(-3, 10)),
        },
        {
          id: 'demo-subtask-02',
          parentTaskId: DEMO_IDS.tasks[5],
          title: '写一段自己的应用场景',
          completed: false,
          order: 1,
          createdAt: iso(dayAt(-3, 10)),
        },
      ],
    },
    {
      ...baseTask,
      id: DEMO_IDS.tasks[6],
      title: '部署性能监控面板',
      description: 'Lighthouse CI 接入 GitHub Actions。',
      status: 'review',
      created: iso(dayAt(-7, 14)),
      dueDate: dateKey(addDays(today, 1)),
      priority: 'medium',
      tags: ['前端'],
      projectIds: [site],
    },
    {
      ...baseTask,
      id: DEMO_IDS.tasks[7],
      title: '完成深蹲动作视频复盘',
      description: '',
      status: 'done',
      created: iso(dayAt(-6, 9)),
      dueDate: dateKey(addDays(today, -2)),
      priority: 'low',
      tags: ['健康'],
      projectIds: [fitness],
      lastCompletedAt: iso(dayAt(-2, 20, 30)),
    },
    {
      ...baseTask,
      id: DEMO_IDS.tasks[8],
      title: '发布上线周报自动化',
      description: '',
      status: 'done',
      created: iso(dayAt(-8, 16)),
      dueDate: dateKey(addDays(today, -3)),
      priority: 'high',
      tags: ['效率'],
      projectIds: [],
      lastCompletedAt: iso(dayAt(-3, 18, 10)),
      dependencies: [{ taskId: DEMO_IDS.tasks[6], type: 'finish-to-start' as const, lag: 0 }],
    },
    {
      ...baseTask,
      id: DEMO_IDS.tasks[9],
      title: '给读书会准备分享提纲',
      description: '周日线下分享 20 分钟。',
      status: 'backlog',
      created: iso(dayAt(-2, 22)),
      dueDate: null,
      priority: 'low',
      tags: ['读书'],
      projectIds: [reading],
    },
  ];

  // 收件箱：未整理的原始输入
  const inboxTasks: Task[] = [
    {
      ...baseTask,
      id: 'demo-inbox-01',
      title: '看看 Vercel 新的 Pricing 是否影响个人站',
      description: '',
      status: 'backlog',
      created: iso(dayAt(0, 8, 41)),
      dueDate: null,
      priority: 'medium',
      tags: [],
      projectIds: [],
    },
    {
      ...baseTask,
      id: 'demo-inbox-02',
      title: '给爸妈订周末的火锅',
      description: '别忘了妈妈不吃辣。',
      status: 'backlog',
      created: iso(dayAt(0, 9, 15)),
      dueDate: null,
      priority: 'high',
      tags: [],
      projectIds: [],
    },
    {
      ...baseTask,
      id: 'demo-inbox-03',
      title: '把通勤播客里听到的「时间块」方法试试',
      description: '',
      status: 'backlog',
      created: iso(dayAt(-1, 18, 52)),
      dueDate: null,
      priority: 'low',
      tags: [],
      projectIds: [],
    },
  ];

  // ---------- 日程 ----------
  const event = (
    id: string,
    title: string,
    startTime: string,
    endTime: string,
    colorCategory: CalendarEvent['colorCategory'],
    description = '',
  ): CalendarEvent => ({
    id,
    title,
    description,
    startTime,
    endTime,
    isAllDay: false,
    projectIds: [],
    colorCategory,
  });

  const eventsByDate: Record<string, CalendarEvent[]> = {
    [dateKey(addDays(today, -1))]: [
      event(DEMO_IDS.events[0], '改版评审会', '15:00', '16:00', 'work', '确认卡片圆角与留白规范。'),
    ],
    [dateKey(today)]: [
      event(DEMO_IDS.events[1], '网站改版周会', '10:00', '11:00', 'work'),
      event(DEMO_IDS.events[2], '力量训练·下肢日', '19:30', '20:30', 'health'),
    ],
    [dateKey(addDays(today, 1))]: [
      event(DEMO_IDS.events[3], '每日站会', '09:00', '09:30', 'work'),
      event(DEMO_IDS.events[4], '老友聚餐', '19:00', '21:00', 'social'),
    ],
    [dateKey(addDays(today, 3))]: [
      event(DEMO_IDS.events[5], '读书会分享彩排', '14:00', '15:00', 'education', '20 分钟试讲。'),
    ],
  };

  // ---------- 笔记 ----------
  const note = (id: string, title: string, markdown: string, tags: string[], projectIds: string[], created: Date, linkedNotes?: string[]): Note => ({
    id,
    folderId: null,
    title,
    content: markdownToLexical(markdown),
    contentText: markdown.replace(/[#*`>\-\][]/g, ''),
    tags,
    projectIds,
    createdAt: created,
    updatedAt: created,
    isPinned: false,
    isArchived: false,
    linkedNotes,
  });

  const notes: Note[] = [
    note(
      DEMO_IDS.notes[0],
      '本周周报',
      '# 本周周报\n\n## 已完成\n- 发布上线周报自动化 #效率\n- 完成深蹲动作视频复盘\n\n## 进行中\n- 首页视觉稿终稿（本周四前）\n\n## 下周计划\n- 移动端导航修复后回归测试 #工作',
      ['周报', '工作'],
      [site],
      dayAt(-1, 18, 30),
    ),
    note(
      DEMO_IDS.notes[1],
      '首页改版思路',
      '# 首页改版思路\n\n「让今天最重要的事先被看见。」\n\n- 把焦点任务做成 hero 区\n- 统计合并成一条横条，降低扫读负担\n- 参考 [[本周周报]] 里的评审意见 #设计',
      ['设计'],
      [site],
      dayAt(-4, 9, 20),
      ['本周周报'],
    ),
    note(
      DEMO_IDS.notes[2],
      '《思考，快与慢》第三章',
      '# 《思考，快与慢》第三章\n\n系统一会把「眼见即为事实」当作全部证据。\n\n- 案例瞳孔实验：耗能得到证实\n- 我的应用：写周报时先列事实再下判断 #读书',
      ['读书'],
      [reading],
      dayAt(-2, 22, 10),
    ),
    note(
      DEMO_IDS.notes[3],
      '训练日志 · 第 3 周',
      '# 训练日志 · 第 3 周\n\n深蹲 60kg 5×5，最后一次动作变形，下周降到 57.5kg。 #健康',
      ['健康'],
      [fitness],
      dayAt(-2, 20, 35),
    ),
    note(
      DEMO_IDS.notes[4],
      '灵感：把每周回顾做成一张卡片',
      '把回顾页的「下一轮三件事」做成首页卡片，点开就能填。记录一下，周末试试。',
      ['想法'],
      [],
      dayAt(0, 8, 47),
    ),
  ];

  // ---------- 收藏 ----------
  const links: Record<string, Link> = {
    [DEMO_IDS.links[0]]: {
      id: DEMO_IDS.links[0],
      url: 'https://refactoringui.com/',
      title: 'Refactoring UI',
      description: '视觉设计实用技巧，改版时反复翻。',
      tags: ['设计'],
      projectIds: [site],
      isFavorite: true,
      isArchived: false,
      visitCount: 12,
      sortOrder: 0,
      createdAt: dayAt(-10, 10),
      updatedAt: dayAt(-10, 10),
    },
    [DEMO_IDS.links[1]]: {
      id: DEMO_IDS.links[1],
      url: 'https://web.dev/learn/performance/',
      title: 'web.dev Performance',
      description: '性能优化清单。',
      tags: ['前端'],
      projectIds: [site],
      isFavorite: false,
      isArchived: false,
      visitCount: 3,
      sortOrder: 1,
      createdAt: dayAt(-9, 16),
      updatedAt: dayAt(-9, 16),
    },
    [DEMO_IDS.links[2]]: {
      id: DEMO_IDS.links[2],
      url: 'https://strongerbyscience.com/',
      title: 'Stronger by Science',
      description: '训练方法论文章。',
      tags: ['健康'],
      projectIds: [fitness],
      isFavorite: false,
      isArchived: false,
      visitCount: 5,
      sortOrder: 0,
      createdAt: dayAt(-20, 20),
      updatedAt: dayAt(-20, 20),
    },
    [DEMO_IDS.links[3]]: {
      id: DEMO_IDS.links[3],
      url: 'https://www.douban.com/doubanbook',
      title: '豆瓣图书',
      description: '找书评分参考。',
      tags: ['读书'],
      projectIds: [reading],
      isFavorite: true,
      isArchived: false,
      visitCount: 8,
      sortOrder: 1,
      createdAt: dayAt(-28, 12),
      updatedAt: dayAt(-28, 12),
    },
  };

  const collections: Record<string, LinkCollection> = {
    [DEMO_IDS.collections[0]]: {
      id: DEMO_IDS.collections[0],
      name: '改版参考',
      linkIds: [DEMO_IDS.links[0], DEMO_IDS.links[1]],
      isExpanded: true,
      sortOrder: 0,
      createdAt: dayAt(-10, 10),
      updatedAt: dayAt(-10, 10),
    },
    [DEMO_IDS.collections[1]]: {
      id: DEMO_IDS.collections[1],
      name: '读书与健康',
      linkIds: [DEMO_IDS.links[2], DEMO_IDS.links[3]],
      isExpanded: false,
      sortOrder: 1,
      createdAt: dayAt(-20, 20),
      updatedAt: dayAt(-20, 20),
    },
  };

  // ---------- 习惯 ----------
  const habits: Habit[] = [
    {
      id: DEMO_IDS.habits[0],
      title: '喝够 8 杯水',
      color: '#38BDF8',
      projectIds: [],
      category: 'health',
      difficulty: 'trivial',
      frequency: 'daily',
      createdAt: iso(dayAt(-30, 8)),
      currentStreak: 7,
      longestStreak: 12,
      totalCompletions: 25,
      totalXp: 250,
      freezesPerWeek: 1,
      freezesUsed: [],
      order: 0,
    },
    {
      id: DEMO_IDS.habits[1],
      title: '睡前读 20 分钟',
      color: '#A78BFA',
      projectIds: [],
      category: 'learning',
      difficulty: 'easy',
      frequency: 'daily',
      createdAt: iso(dayAt(-30, 8)),
      currentStreak: 5,
      longestStreak: 9,
      totalCompletions: 21,
      totalXp: 210,
      freezesPerWeek: 1,
      freezesUsed: [],
      order: 1,
    },
    {
      id: DEMO_IDS.habits[2],
      title: '写 3 行日志',
      color: '#22C55E',
      projectIds: [],
      category: 'mindfulness',
      difficulty: 'easy',
      frequency: 'daily',
      createdAt: iso(dayAt(-14, 8)),
      currentStreak: 3,
      longestStreak: 6,
      totalCompletions: 9,
      totalXp: 90,
      freezesPerWeek: 1,
      freezesUsed: [],
      order: 2,
    },
  ];

  const completions: HabitCompletion[] = [];
  habits.forEach((habit, idx) => {
    // 每个习惯都有近 7 天的打卡（第 3 个习惯漏了前两天）
    lastWeek.forEach((day, dayIdx) => {
      if (idx === 2 && dayIdx < 4) return;
      completions.push({
        id: `demo-completion-${idx}-${dayIdx}`,
        habitId: habit.id,
        date: habitDayKey(day),
        completedAt: iso(at(day, 21, 30)),
      });
    });
  });

  // ---------- 动态 ----------
  const activities: DemoDataset['activities'] = [
    { id: 'demo-act-01', type: 'created', module: 'tasks', entityId: DEMO_IDS.tasks[0], entityTitle: '完成首页视觉稿终稿', timestamp: iso(dayAt(-5, 10)) },
    { id: 'demo-act-02', type: 'created', module: 'notes', entityId: DEMO_IDS.notes[1], entityTitle: '首页改版思路', timestamp: iso(dayAt(-4, 9, 20)) },
    { id: 'demo-act-03', type: 'completed', module: 'tasks', entityId: DEMO_IDS.tasks[8], entityTitle: '发布上线周报自动化', timestamp: iso(dayAt(-3, 18, 10)) },
    { id: 'demo-act-04', type: 'created', module: 'calendar', entityId: DEMO_IDS.events[1], entityTitle: '网站改版周会', timestamp: iso(dayAt(-3, 9)) },
    { id: 'demo-act-05', type: 'completed', module: 'habits', entityId: DEMO_IDS.habits[1], entityTitle: '睡前读 20 分钟', timestamp: iso(dayAt(-2, 22, 40)) },
    { id: 'demo-act-06', type: 'completed', module: 'tasks', entityId: DEMO_IDS.tasks[7], entityTitle: '完成深蹲动作视频复盘', timestamp: iso(dayAt(-2, 20, 30)) },
    { id: 'demo-act-07', type: 'created', module: 'notes', entityId: DEMO_IDS.notes[3], entityTitle: '训练日志 · 第 3 周', timestamp: iso(dayAt(-2, 20, 35)) },
    { id: 'demo-act-08', type: 'completed', module: 'habits', entityId: DEMO_IDS.habits[0], entityTitle: '喝够 8 杯水', timestamp: iso(dayAt(-1, 21, 10)) },
    { id: 'demo-act-09', type: 'created', module: 'notes', entityId: DEMO_IDS.notes[0], entityTitle: '本周周报', timestamp: iso(dayAt(-1, 18, 30)) },
    { id: 'demo-act-10', type: 'completed', module: 'habits', entityId: DEMO_IDS.habits[0], entityTitle: '喝够 8 杯水', timestamp: iso(at(today, 20, 5)) },
    { id: 'demo-act-11', type: 'created', module: 'tasks', entityId: DEMO_IDS.tasks[3], entityTitle: '写本周训练日志', timestamp: iso(dayAt(-1, 8)) },
    { id: 'demo-act-12', type: 'viewed', module: 'notes', entityId: DEMO_IDS.notes[2], entityTitle: '《思考，快与慢》第三章', timestamp: iso(at(today, 12, 40)) },
  ];

  return {
    projects,
    tasks: [...tasks, ...inboxTasks],
    notes,
    eventsByDate,
    links,
    collections,
    habits,
    completions,
    activities,
  };
}

export { isDemoId };
