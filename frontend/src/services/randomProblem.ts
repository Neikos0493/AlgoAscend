import { scrapeResources, type ScrapedResource } from './scrapeResources'

export type RandomProblem = ScrapedResource

const FALLBACK_PROBLEMS: RandomProblem[] = [
  { id: 'luogu-P1001', pid: 'P1001', title: 'A+B Problem', platform: 'luogu', platformName: '洛谷', platformIcon: '🔴', difficulty: '入门', tags: ['语法基础', '输入输出'], url: 'https://www.luogu.com.cn/problem/P1001' },
  { id: 'luogu-P1059', pid: 'P1059', title: '[NOIP2006] 明明的随机数', platform: 'luogu', platformName: '洛谷', platformIcon: '🔴', difficulty: '入门', tags: ['排序', '去重'], url: 'https://www.luogu.com.cn/problem/P1059' },
  { id: 'luogu-P2249', pid: 'P2249', title: '【深基】查找', platform: 'luogu', platformName: '洛谷', platformIcon: '🔴', difficulty: '普及-', tags: ['二分查找', '排序'], url: 'https://www.luogu.com.cn/problem/P2249' },
  { id: 'luogu-P1219', pid: 'P1219', title: '[USACO1.5] 八皇后', platform: 'luogu', platformName: '洛谷', platformIcon: '🔴', difficulty: '普及/提高-', tags: ['DFS', '回溯'], url: 'https://www.luogu.com.cn/problem/P1219' },
  { id: 'leetcode-two-sum', pid: 'two-sum', title: '1. 两数之和', platform: 'leetcode', platformName: '力扣', platformIcon: '🟠', difficulty: '简单', tags: ['数组', '哈希表'], url: 'https://leetcode.cn/problems/two-sum/' },
  { id: 'leetcode-longest-substring-without-repeating-characters', pid: 'longest-substring-without-repeating-characters', title: '3. 无重复字符的最长子串', platform: 'leetcode', platformName: '力扣', platformIcon: '🟠', difficulty: '中等', tags: ['哈希表', '字符串', '滑动窗口'], url: 'https://leetcode.cn/problems/longest-substring-without-repeating-characters/' },
  { id: 'leetcode-binary-tree-level-order-traversal', pid: 'binary-tree-level-order-traversal', title: '102. 二叉树的层序遍历', platform: 'leetcode', platformName: '力扣', platformIcon: '🟠', difficulty: '中等', tags: ['树', 'BFS', '队列'], url: 'https://leetcode.cn/problems/binary-tree-level-order-traversal/' },
  { id: 'leetcode-coin-change', pid: 'coin-change', title: '322. 零钱兑换', platform: 'leetcode', platformName: '力扣', platformIcon: '🟠', difficulty: '中等', tags: ['动态规划', '完全背包'], url: 'https://leetcode.cn/problems/coin-change/' },
]

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export async function getRandomProblem(): Promise<RandomProblem> {
  const platform = pickOne(['luogu', 'leetcode', 'nowcoder'] as const)
  const page = 1 + Math.floor(Math.random() * 5)

  try {
    const result = await scrapeResources({ platform, page, limit: 20 })
    if (result.resources.length > 0) return pickOne(result.resources)
  } catch {
    // The bundled fallback keeps particle focus useful when the API is offline.
  }

  return pickOne(FALLBACK_PROBLEMS)
}
