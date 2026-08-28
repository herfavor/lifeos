/**
 * Fallback Quotes
 *
 * Static quotes used when all APIs fail
 * Ensures widget always has content
 */

export interface Quote {
  content: string;
  author: string;
  tags: string[];
}

export const fallbackQuotes: Quote[] = [
  {
    content: "成就伟大事业的唯一途径，是热爱你所做的事。",
    author: "Steve Jobs",
    tags: ["inspiration", "work"],
  },
  {
    content: "创新是领导者与追随者的分水岭。",
    author: "Steve Jobs",
    tags: ["innovation", "leadership"],
  },
  {
    content: "生活就是当你忙于制定其他计划时，正在发生的事。",
    author: "John Lennon",
    tags: ["life", "philosophy"],
  },
  {
    content: "未来属于那些相信自己梦想之美的人。",
    author: "Eleanor Roosevelt",
    tags: ["future", "dreams"],
  },
  {
    content: "正是在最黑暗的时刻，我们更要专注于寻找光明。",
    author: "Aristotle",
    tags: ["inspiration", "perseverance"],
  },
  {
    content: "唯一不可能完成的旅程，是你从未开始的那一段。",
    author: "Tony Robbins",
    tags: ["journey", "motivation"],
  },
  {
    content: "最终，我们记住的不是敌人的言语，而是朋友的沉默。",
    author: "Martin Luther King Jr.",
    tags: ["friendship", "wisdom"],
  },
  {
    content: "种一棵树最好的时间是二十年前，其次是现在。",
    author: "Chinese Proverb",
    tags: ["action", "wisdom"],
  },
  {
    content: "成功不是终点，失败也并非末日：重要的是继续前行的勇气。",
    author: "Winston Churchill",
    tags: ["success", "courage"],
  },
  {
    content: "相信自己能做到，你就已经成功了一半。",
    author: "Theodore Roosevelt",
    tags: ["belief", "motivation"],
  },
  {
    content: "对明日成就的唯一限制，是我们今日的疑虑。",
    author: "Franklin D. Roosevelt",
    tags: ["future", "doubt"],
  },
  {
    content: "在你在的地方，用你拥有的东西，做你能做的事。",
    author: "Theodore Roosevelt",
    tags: ["action", "pragmatism"],
  },
  {
    content: "你渴望的一切，都在恐惧的另一边。",
    author: "George Addair",
    tags: ["fear", "courage"],
  },
  {
    content: "磨难常常让平凡的人为非凡的命运做好准备。",
    author: "C.S. Lewis",
    tags: ["hardship", "destiny"],
  },
  {
    content: "生命中最伟大的荣耀，不在于从不跌倒，而在于每次跌倒后都能重新站起。",
    author: "Nelson Mandela",
    tags: ["resilience", "perseverance"],
  },
  {
    content: "开始行动的办法，就是停止空谈、着手去做。",
    author: "Walt Disney",
    tags: ["action", "motivation"],
  },
  {
    content: "你的时间有限，不要浪费在活成别人的样子上。",
    author: "Steve Jobs",
    tags: ["life", "authenticity"],
  },
  {
    content: "如果生活可以预测，那它就不再是生活，也将失去滋味。",
    author: "Eleanor Roosevelt",
    tags: ["life", "unpredictability"],
  },
  {
    content: "生活要么是一场大胆的冒险，要么就什么都不是。",
    author: "Helen Keller",
    tags: ["adventure", "life"],
  },
  {
    content: "许多人生的失败者，是在放弃时没有意识到自己离成功有多近。",
    author: "Thomas A. Edison",
    tags: ["failure", "perseverance"],
  },
  {
    content: "你头脑中有智慧，脚上有鞋子，你可以朝着任何你选择的方向前行。",
    author: "Dr. Seuss",
    tags: ["self-determination", "choice"],
  },
  {
    content: "态度是一件小事，却能带来巨大的不同。",
    author: "Winston Churchill",
    tags: ["attitude", "mindset"],
  },
  {
    content: "在一个不断试图让你变成别人的世界里做自己，是最大的成就。",
    author: "Ralph Waldo Emerson",
    tags: ["authenticity", "individuality"],
  },
  {
    content: "多年来的经验让我明白，一旦下定决心，恐惧就会减少。",
    author: "Rosa Parks",
    tags: ["courage", "determination"],
  },
  {
    content: "快乐的人也会让别人快乐。",
    author: "Anne Frank",
    tags: ["happiness", "kindness"],
  },
  {
    content: "不要走现成的路，去没有路的地方，留下自己的足迹。",
    author: "Ralph Waldo Emerson",
    tags: ["pioneering", "individuality"],
  },
  {
    content: "生活中你会遭遇许多失败，但永远不要让自己被击败。",
    author: "Maya Angelou",
    tags: ["resilience", "perseverance"],
  },
  {
    content: "最大的财富，是安于简朴而知足。",
    author: "Plato",
    tags: ["contentment", "wealth"],
  },
  {
    content: "如果你把目标定得高得离谱，即便失败了，也会高过别人的成功。",
    author: "James Cameron",
    tags: ["goals", "success"],
  },
  {
    content: "生活其实很简单，是我们非要把它弄得复杂。",
    author: "Confucius",
    tags: ["simplicity", "life"],
  },
  {
    content: "愿你活好生命中的每一天。",
    author: "Jonathan Swift",
    tags: ["life", "presence"],
  },
  {
    content: "生活本身就是最美好的童话。",
    author: "Hans Christian Andersen",
    tags: ["life", "wonder"],
  },
  {
    content: "不要让谋生妨碍你经营人生。",
    author: "John Wooden",
    tags: ["life", "balance"],
  },
  {
    content: "自信地朝着梦想的方向前进！去过你曾想象的生活。",
    author: "Henry David Thoreau",
    tags: ["dreams", "confidence"],
  },
  {
    content: "当你走到绳子的尽头，打个结，继续坚持。",
    author: "Franklin D. Roosevelt",
    tags: ["perseverance", "resilience"],
  },
  {
    content: "永远记住，你是独一无二的，就像其他每个人一样。",
    author: "Margaret Mead",
    tags: ["individuality", "humor"],
  },
  {
    content: "不要用收获来衡量每一天，而要用你播下的种子来衡量。",
    author: "Robert Louis Stevenson",
    tags: ["patience", "growth"],
  },
  {
    content: "未来取决于你今天做了什么。",
    author: "Mahatma Gandhi",
    tags: ["action", "future"],
  },
  {
    content: "告诉我，我会忘记；教给我，我会记住；让我参与，我才会学会。",
    author: "Benjamin Franklin",
    tags: ["learning", "education"],
  },
  {
    content: "宁可因真实的自己而被人讨厌，也不要因虚假的自己而被人喜爱。",
    author: "Andre Gide",
    tags: ["authenticity", "self-acceptance"],
  },
  {
    content: "二十年后，让你更失望的将是你没做过的事，而不是你做过的事。",
    author: "Mark Twain",
    tags: ["regret", "action"],
  },
  {
    content: "成为你本可以成为的人，永远不会太晚。",
    author: "George Eliot",
    tags: ["potential", "change"],
  },
  {
    content: "从不犯错的人，从未尝试过任何新事物。",
    author: "Albert Einstein",
    tags: ["mistakes", "innovation"],
  },
  {
    content: "说做不到的人，不应该打扰正在做的人。",
    author: "Chinese Proverb",
    tags: ["action", "perseverance"],
  },
  {
    content: "多走一英里的路上没有堵车。",
    author: "Roger Staubach",
    tags: ["effort", "success"],
  },
  {
    content: "正是在最黑暗的时刻，我们更要专注于寻找光明。",
    author: "Aristotle Onassis",
    tags: ["adversity", "hope"],
  },
  {
    content: "你注定成为的，只有你决定成为的那个人。",
    author: "Ralph Waldo Emerson",
    tags: ["destiny", "choice"],
  },
  {
    content: "做你自己，其他人都已经有人做了。",
    author: "Oscar Wilde",
    tags: ["authenticity", "individuality"],
  },
  {
    content: "不要追求成为成功者，而要努力成为有价值的人。",
    author: "Albert Einstein",
    tags: ["value", "purpose"],
  },
  {
    content: "我把自己的成功归因于一点：我从不找借口，也从不接受借口。",
    author: "Florence Nightingale",
    tags: ["success", "accountability"],
  },
];

export function getRandomFallbackQuote(): Quote {
  const randomIndex = Math.floor(Math.random() * fallbackQuotes.length);
  return fallbackQuotes[randomIndex];
}
