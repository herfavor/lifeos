/**
 * Document Templates
 *
 * Predefined templates for professional documents.
 * Each template provides TipTap JSON content structure.
 */

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'report' | 'proposal' | 'spec' | 'meeting' | 'letter' | 'general';
  icon: string;
  content: object; // TipTap JSON
}

// Helper to create paragraph nodes
const p = (text: string) => ({
  type: 'paragraph',
  content: text ? [{ type: 'text', text }] : undefined,
});

// Helper to create heading nodes
const h = (level: 1 | 2 | 3 | 4 | 5 | 6, text: string) => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
});

// Helper to create bullet list
const ul = (items: string[]) => ({
  type: 'bulletList',
  content: items.map((item) => ({
    type: 'listItem',
    content: [p(item)],
  })),
});

// Helper to create numbered list
const ol = (items: string[]) => ({
  type: 'orderedList',
  content: items.map((item) => ({
    type: 'listItem',
    content: [p(item)],
  })),
});

// Helper to create horizontal rule
const hr = () => ({ type: 'horizontalRule' });

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  // Blank template
  {
    id: 'blank',
    name: '空白文档',
    description: '从空白页面开始',
    category: 'general',
    icon: 'FileText',
    content: {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
  },

  // Report Templates
  {
    id: 'project-status',
    name: '项目状态报告',
    description: '每周或每月的项目进度更新',
    category: 'report',
    icon: 'BarChart2',
    content: {
      type: 'doc',
      content: [
        h(1, '项目状态报告'),
        p(''),
        h(2, '项目概述'),
        p('项目名称：[填写项目名称]'),
        p('报告日期：[填写日期]'),
        p('报告期间：[开始日期] - [结束日期]'),
        p(''),
        h(2, '执行摘要'),
        p('[简要概述项目状态、关键成果以及任何重大问题。]'),
        p(''),
        h(2, '进度更新'),
        h(3, '已完成任务'),
        ul(['任务 1 - [描述]', '任务 2 - [描述]', '任务 3 - [描述]']),
        p(''),
        h(3, '进行中'),
        ul(['任务 1 - [进度 %] - [预计完成时间]', '任务 2 - [进度 %] - [预计完成时间]']),
        p(''),
        h(3, '即将开始的任务'),
        ul(['任务 1 - [计划开始日期]', '任务 2 - [计划开始日期]']),
        p(''),
        h(2, '关键指标'),
        p('进度状态：[正常 / 有风险 / 滞后]'),
        p('预算状态：[低于 / 符合 / 超出预算]'),
        p('质量状态：[良好 / 可接受 / 需要改进]'),
        p(''),
        h(2, '风险与问题'),
        ul(['风险/问题 1 - [应对方案]', '风险/问题 2 - [应对方案]']),
        p(''),
        h(2, '后续步骤'),
        ol(['行动项 1', '行动项 2', '行动项 3']),
        p(''),
        hr(),
        p('编制人：[您的姓名]'),
      ],
    },
  },
  {
    id: 'meeting-notes',
    name: '会议纪要',
    description: '记录会议讨论和行动事项',
    category: 'meeting',
    icon: 'Users',
    content: {
      type: 'doc',
      content: [
        h(1, '会议纪要'),
        p(''),
        h(2, '会议详情'),
        p('日期：[填写日期]'),
        p('时间：[开始时间] - [结束时间]'),
        p('地点：[线下 / 线上会议链接]'),
        p(''),
        h(2, '与会人员'),
        ul(['[姓名 1] - [职务]', '[姓名 2] - [职务]', '[姓名 3] - [职务]']),
        p(''),
        h(2, '议程'),
        ol(['议题 1', '议题 2', '议题 3']),
        p(''),
        h(2, '讨论记录'),
        h(3, '议题 1'),
        p('[关键讨论要点和决定]'),
        p(''),
        h(3, '议题 2'),
        p('[关键讨论要点和决定]'),
        p(''),
        h(2, '行动项'),
        ul([
          '[ ] 行动 1 - 负责人：[姓名] - 截止日期：[日期]',
          '[ ] 行动 2 - 负责人：[姓名] - 截止日期：[日期]',
          '[ ] 行动 3 - 负责人：[姓名] - 截止日期：[日期]',
        ]),
        p(''),
        h(2, '下次会议'),
        p('日期：[填写下次会议日期]'),
        p('议程事项：[待讨论的议题]'),
      ],
    },
  },

  {
    id: 'weekly-report',
    name: '每周报告',
    description: '总结每周成果和后续计划',
    category: 'report',
    icon: 'BarChart2',
    content: {
      type: 'doc',
      content: [
        h(1, '每周报告'),
        p('周次：[开始日期] - [结束日期]'),
        p(''),
        h(2, '摘要'),
        p('[本周简要概述。突出关键成果、阻碍和重点领域。]'),
        p(''),
        h(2, '成果'),
        ul([
          '完成 [任务/功能/里程碑]',
          '解决 [问题/缺陷/阻碍]',
          '交付 [成果]',
        ]),
        p(''),
        h(2, '进行中'),
        ul([
          '[任务] - [进度 %] - [预计完成时间]',
          '[任务] - [进度 %] - [预计完成时间]',
        ]),
        p(''),
        h(2, '阻碍与风险'),
        ul(['[阻碍] - [影响] - [应对措施]']),
        p(''),
        h(2, '关键指标'),
        p('已完成任务：[X]'),
        p('剩余任务：[Y]'),
        p('迭代/里程碑进度：[Z%]'),
        p(''),
        h(2, '下周计划'),
        ol([
          '优先级 1：[描述]',
          '优先级 2：[描述]',
          '优先级 3：[描述]',
        ]),
        p(''),
        hr(),
        p('编制人：[您的姓名]'),
      ],
    },
  },

  // Proposal Templates
  {
    id: 'project-proposal',
    name: '项目提案',
    description: '包含目标和时间表的正式项目提案',
    category: 'proposal',
    icon: 'Target',
    content: {
      type: 'doc',
      content: [
        h(1, '项目提案'),
        p(''),
        h(2, '执行摘要'),
        p('[简要概述拟议项目、其目标和预期成果。]'),
        p(''),
        h(2, '问题陈述'),
        p('[描述本项目要解决的问题或机会。]'),
        p(''),
        h(2, '拟议解决方案'),
        p('[概述你提出的解决方案。]'),
        p(''),
        h(3, '主要功能'),
        ul(['功能 1 - [描述]', '功能 2 - [描述]', '功能 3 - [描述]']),
        p(''),
        h(2, '目标'),
        ol([
          '目标 1：[具体、可衡量的目标]',
          '目标 2：[具体、可衡量的目标]',
          '目标 3：[具体、可衡量的目标]',
        ]),
        p(''),
        h(2, '范围'),
        h(3, '范围内'),
        ul(['项目 1', '项目 2', '项目 3']),
        p(''),
        h(3, '范围外'),
        ul(['项目 1', '项目 2']),
        p(''),
        h(2, '时间表'),
        p('阶段 1：[开始] - [结束] - [交付物]'),
        p('阶段 2：[开始] - [结束] - [交付物]'),
        p('阶段 3：[开始] - [结束] - [交付物]'),
        p(''),
        h(2, '预算'),
        p('预计总成本：$[金额]'),
        ul(['人员：$[金额]', '设备：$[金额]', '其他：$[金额]']),
        p(''),
        h(2, '成功标准'),
        ul(['标准 1', '标准 2', '标准 3']),
        p(''),
        h(2, '风险与应对'),
        ul(['风险 1 - 应对：[策略]', '风险 2 - 应对：[策略]']),
        p(''),
        hr(),
        p('编制人：[您的姓名]'),
        p('日期：[填写日期]'),
      ],
    },
  },

  // Specification Templates
  {
    id: 'technical-spec',
    name: '技术规格说明',
    description: '详细的技术需求和架构',
    category: 'spec',
    icon: 'Code',
    content: {
      type: 'doc',
      content: [
        h(1, '技术规格说明'),
        p(''),
        h(2, '文档信息'),
        p('版本：1.0'),
        p('作者：[您的姓名]'),
        p('最后更新：[日期]'),
        p('状态：草稿 / 审核中 / 已批准'),
        p(''),
        h(2, '概述'),
        p('[提供所描述系统或功能的高层概述。]'),
        p(''),
        h(2, '目标'),
        ul(['目标 1', '目标 2', '目标 3']),
        p(''),
        h(2, '非目标'),
        ul(['非目标 1', '非目标 2']),
        p(''),
        h(2, '技术设计'),
        h(3, '架构'),
        p('[描述整体架构和主要组件。]'),
        p(''),
        h(3, '数据模型'),
        p('[描述数据结构和关系。]'),
        p(''),
        h(3, 'API 设计'),
        p('[描述 API 端点和契约。]'),
        p(''),
        h(3, '依赖项'),
        ul(['依赖 1 - [用途]', '依赖 2 - [用途]']),
        p(''),
        h(2, '安全考虑'),
        ul(['身份验证：[方案]', '授权：[方案]', '数据保护：[方案]']),
        p(''),
        h(2, '性能要求'),
        ul(['延迟：[目标]', '吞吐量：[目标]', '可扩展性：[要求]']),
        p(''),
        h(2, '测试策略'),
        ul(['单元测试：[覆盖率目标]', '集成测试：[范围]', '端到端测试：[关键路径]']),
        p(''),
        h(2, '发布计划'),
        ol(['阶段 1：[描述]', '阶段 2：[描述]', '阶段 3：[描述]']),
        p(''),
        h(2, '未决问题'),
        ul(['问题 1', '问题 2']),
      ],
    },
  },
  {
    id: 'feature-spec',
    name: '功能规格说明',
    description: '产品功能需求和用户故事',
    category: 'spec',
    icon: 'Lightbulb',
    content: {
      type: 'doc',
      content: [
        h(1, '功能规格说明'),
        p(''),
        h(2, '功能概述'),
        p('功能名称：[填写功能名称]'),
        p('优先级：高 / 中 / 低'),
        p('目标发布版本：[版本或日期]'),
        p(''),
        h(2, '问题陈述'),
        p('[描述此功能要解决的用户问题或痛点。]'),
        p(''),
        h(2, '用户故事'),
        p('作为 [用户类型]，我希望 [操作]，以便 [收益]。'),
        p('作为 [用户类型]，我希望 [操作]，以便 [收益]。'),
        p(''),
        h(2, '验收标准'),
        ul(['[ ] 标准 1', '[ ] 标准 2', '[ ] 标准 3']),
        p(''),
        h(2, '功能需求'),
        ol(['需求 1', '需求 2', '需求 3']),
        p(''),
        h(2, '非功能需求'),
        ul(['性能：[需求]', '无障碍：[需求]', '安全：[需求]']),
        p(''),
        h(2, '界面与体验考虑'),
        p('[描述界面和用户体验方面的考虑。]'),
        p(''),
        h(2, '边界情况'),
        ul(['边界情况 1 - [处理方式]', '边界情况 2 - [处理方式]']),
        p(''),
        h(2, '依赖项'),
        ul(['依赖 1', '依赖 2']),
        p(''),
        h(2, '范围外'),
        ul(['项目 1', '项目 2']),
      ],
    },
  },

  // Letter Templates
  {
    id: 'formal-letter',
    name: '正式信函',
    description: '专业的商务信函格式',
    category: 'letter',
    icon: 'Mail',
    content: {
      type: 'doc',
      content: [
        p('[您的姓名]'),
        p('[您的地址]'),
        p('[城市，省/州 邮编]'),
        p('[您的邮箱]'),
        p('[日期]'),
        p(''),
        p('[收件人姓名]'),
        p('[收件人职务]'),
        p('[公司名称]'),
        p('[地址]'),
        p('[城市，省/州 邮编]'),
        p(''),
        p('尊敬的 [收件人姓名]：'),
        p(''),
        p('[开头段落：说明写信目的。]'),
        p(''),
        p('[正文段落 1：提供详细信息和背景。]'),
        p(''),
        p('[正文段落 2：补充信息或支撑论点。]'),
        p(''),
        p('[结尾段落：总结并包含行动号召。]'),
        p(''),
        p('此致敬礼，'),
        p(''),
        p(''),
        p('[您的签名]'),
        p('[您的姓名]'),
        p('[您的职务]'),
      ],
    },
  },

  // General Templates
  {
    id: 'daily-journal',
    name: '每日日志',
    description: '结构化的每日反思模板',
    category: 'general',
    icon: 'Calendar',
    content: {
      type: 'doc',
      content: [
        h(1, '每日日志'),
        p('[日期]'),
        p(''),
        h(2, '晨间意图'),
        p('今日专注：'),
        ul(['优先事项 1', '优先事项 2', '优先事项 3']),
        p(''),
        p('我感激的是：'),
        ol(['[感激 1]', '[感激 2]', '[感激 3]']),
        p(''),
        h(2, '笔记与想法'),
        p('[记录你一天中的想法、灵感和观察。]'),
        p(''),
        h(2, '晚间反思'),
        p('今天哪些事做得不错？'),
        p('[反思]'),
        p(''),
        p('哪些地方可以改进？'),
        p('[反思]'),
        p(''),
        p('关键收获：'),
        ul(['[收获 1]', '[收获 2]']),
        p(''),
        h(2, '明天'),
        p('明天的优先事项：'),
        ul(['[优先事项 1]', '[优先事项 2]', '[优先事项 3]']),
      ],
    },
  },
  {
    id: 'research-notes',
    name: '研究笔记',
    description: '用于研究和分析的结构化笔记',
    category: 'general',
    icon: 'Search',
    content: {
      type: 'doc',
      content: [
        h(1, '研究笔记'),
        p(''),
        h(2, '研究主题'),
        p('[填写你的研究主题或问题]'),
        p(''),
        h(2, '背景'),
        p('[提供该主题的背景信息。]'),
        p(''),
        h(2, '主要来源'),
        ol(['来源 1：[标题, 作者, URL]', '来源 2：[标题, 作者, URL]', '来源 3：[标题, 作者, URL]']),
        p(''),
        h(2, '研究发现'),
        h(3, '发现 1'),
        p('[描述和证据]'),
        p(''),
        h(3, '发现 2'),
        p('[描述和证据]'),
        p(''),
        h(3, '发现 3'),
        p('[描述和证据]'),
        p(''),
        h(2, '分析'),
        p('[你对研究结果的分析和解读。]'),
        p(''),
        h(2, '结论'),
        ul(['结论 1', '结论 2', '结论 3']),
        p(''),
        h(2, '后续步骤'),
        ul(['需要进一步研究 [主题]', '与 [人员/来源] 跟进']),
        p(''),
        h(2, '参考资料'),
        p('[完整引用]'),
      ],
    },
  },
];

// Get templates by category
export function getTemplatesByCategory(category: DocumentTemplate['category']): DocumentTemplate[] {
  return DOCUMENT_TEMPLATES.filter((t) => t.category === category);
}

// Get template by ID
export function getTemplateById(id: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.id === id);
}

// Get all template categories with counts
export function getTemplateCategories(): { category: DocumentTemplate['category']; count: number; label: string }[] {
  const categories: { category: DocumentTemplate['category']; label: string }[] = [
    { category: 'general', label: '通用' },
    { category: 'report', label: '报告' },
    { category: 'proposal', label: '提案' },
    { category: 'spec', label: '规格说明' },
    { category: 'meeting', label: '会议' },
    { category: 'letter', label: '信函' },
  ];

  return categories.map((c) => ({
    ...c,
    count: DOCUMENT_TEMPLATES.filter((t) => t.category === c.category).length,
  }));
}
