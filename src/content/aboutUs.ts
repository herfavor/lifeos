/**
 * LifeOS brand content
 *
 * Short product-narrative texts used by the command palette and other
 * surfaces. LifeOS is a local-first personal dashboard and management
 * workspace: 方便 · 清晰 · 聚合 · 整理.
 */

export interface AboutUsContent {
  stories: {
    /** Product & philosophy */
    product: {
      title: string;
      subtitle: string;
      content: string;
    };
    /** Data ownership & local-first promise */
    values: {
      title: string;
      subtitle: string;
      content: string;
    };
  };
  compact: {
    product: {
      title: string;
      subtitle: string;
      content: string;
    };
    values: {
      title: string;
      subtitle: string;
      content: string;
    };
  };
  foundation: string;
  philosophy: {
    full: string;
    short: string;
  };
  taglines: string[];
}

export const aboutUsContent: AboutUsContent = {
  stories: {
    product: {
      title: '产品与理念',
      subtitle: 'LifeOS',
      content: `LifeOS 是一个本地优先的个人综合管理平台。

它想解决的不是"功能不够多"，而是日常数字生活里更常见的问题：信息散落在十几个应用里，重要的事情被淹没，想记录一件事却要先想清楚"该记在哪"。

LifeOS 把今天要做的事、正在推进的项目、近期的日程、笔记与收藏聚合到同一个工作台。打开它，你应该能在一屏之内看到自己的整体状态：知道现在什么最重要，知道去哪里继续昨天的工作，也能随手把一闪而过的想法先放进来。

LifeOS 的核心理念是方便、清晰、聚合、整理——功能为整理服务，而不是相反。默认界面保持克制，高级能力收在"更多功能"里，需要时它们都在，不需要时它们不打扰你。`,
    },
    values: {
      title: '本地优先与数据主权',
      subtitle: 'LifeOS 的承诺',
      content: `你的数据属于你。

LifeOS 运行在你的浏览器里，所有内容——任务、笔记、日程、收藏——都保存在你自己的设备上。没有账户，没有服务器，没有埋点上传；断网也可以完整使用。

这带来三个承诺：

一、可导出。你的数据随时可以完整导出备份，不被任何平台锁定。

二、可审计。LifeOS 以 MIT 许可证开源，数据如何存储一目了然。

三、AI 有分寸。独立的 AI 指挥中心遵循“观察 → 理解 → 建议 → 用户确认 → 执行”的行为原则，帮助你整理、规范、总结与建议，而不会在未经确认的情况下批量改动你的个人信息。`,
    },
  },
  compact: {
    product: {
      title: '产品与理念',
      subtitle: 'LifeOS',
      content: `LifeOS 是一个本地优先的个人综合管理平台：把今天、项目、日程、笔记与收藏聚合在一个工作台里。核心理念是方便、清晰、聚合、整理——打开就能看到自己的整体状态，并快速进入正确的工具。`,
    },
    values: {
      title: '本地优先与数据主权',
      subtitle: 'LifeOS 的承诺',
      content: `你的数据保存在你自己的设备上：无账户、无服务器、离线可用、随时导出。AI 指挥中心只在提出建议与获得确认后才执行操作。`,
    },
  },
  foundation: `LifeOS 从第一天起就坚持本地优先的地基：数据存在哪里、如何导出、谁能看到，都必须清清楚楚。上层的一切功能都建立在这个地基之上。`,
  philosophy: {
    full: `我们相信，承载个人生活的工具应当尊重使用者。LifeOS 以本地优先的方式构建，帮助你聚合与整理自己的信息——你始终掌控自己的数据，而不是反过来。`,
    short: `LifeOS 建立在一个简单的理念之上：整理你的生活与工作，绝不应要求你交出对数据的所有权。`,
  },
  taglines: [
    'LifeOS 是一个本地优先的个人综合管理平台——聚合、整理，数据始终在你手里。',
    '看到整体状态，进入正确的工具——LifeOS 让个人信息井井有条。',
    '一种宁静而有条理的方式，把重要的事放在同一个地方。',
  ],
};

/**
 * Get a random tagline from the available options
 */
export function getRandomTagline(): string {
  return aboutUsContent.taglines[Math.floor(Math.random() * aboutUsContent.taglines.length)];
}
