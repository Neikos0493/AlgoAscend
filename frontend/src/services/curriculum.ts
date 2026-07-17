/**
 * C++ 算法课程体系 — 按高校标准课程章节组织
 *
 * 参考教材：《C++程序设计》(谭浩强)、《算法竞赛入门经典》(刘汝佳)、《数据结构》(严蔚敏)
 * 每个模块映射到对应的学习资源 ID，支持在资源页面按章节筛选
 */
export interface CurriculumModule {
  id: string
  chapter: number
  name: string
  icon: string
  desc: string
  resourceIds: number[]
}

export const CURRICULUM_MODULES: CurriculumModule[] = [
  {
    id: 'cpp-basics', chapter: 1, name: 'C++ 基础语法', icon: '🔤',
    desc: '变量、常量、运算符、控制结构、函数基础',
    resourceIds: [9], // STL容器速查（含基础语法）
  },
  {
    id: 'arrays-strings', chapter: 2, name: '数组与字符串', icon: '📋',
    desc: '一维/二维数组、C风格字符串、std::string、双指针与滑动窗口',
    resourceIds: [3, 11], // 数组字符串练习题、双指针滑动窗口全解
  },
  {
    id: 'pointers-memory', chapter: 3, name: '指针与内存管理', icon: '🔗',
    desc: '指针运算、动态内存分配、智能指针、引用传递',
    resourceIds: [],
  },
  {
    id: 'functions-recursion', chapter: 4, name: '函数与递归基础', icon: '🔄',
    desc: '函数声明/定义、参数传递、内联函数、递归基本思想',
    resourceIds: [15], // 汉诺塔递归
  },
  {
    id: 'structs-classes', chapter: 5, name: '结构体与类', icon: '🏗️',
    desc: 'struct/class定义、构造函数、运算符重载、排序规则',
    resourceIds: [],
  },
  {
    id: 'stl', chapter: 6, name: 'STL 标准模板库', icon: '📦',
    desc: 'vector/list/stack/queue/set/map/unordered系列、常用算法',
    resourceIds: [9], // C++ STL 常用容器速查
  },
  {
    id: 'basic-ds', chapter: 7, name: '基础数据结构', icon: '🧱',
    desc: '链表(单/双/循环)、栈、队列、哈希表',
    resourceIds: [12], // 链表专题
  },
  {
    id: 'sorting-search', chapter: 8, name: '排序与查找', icon: '🔍',
    desc: '冒泡/选择/插入/快排/归并/堆排序、二分查找与变体',
    resourceIds: [2, 4], // 排序思维导图、二分查找实操
  },
  {
    id: 'backtracking', chapter: 9, name: '递归与回溯', icon: '🌿',
    desc: '递归框架、排列组合、八皇后/N皇后、子集生成、剪枝优化',
    resourceIds: [14, 15], // 八皇后回溯、汉诺塔递归
  },
  {
    id: 'greedy', chapter: 10, name: '贪心算法', icon: '⚡',
    desc: '区间调度、最优装载、哈夫曼编码、贪心证明方法',
    resourceIds: [7], // 贪心经典例题
  },
  {
    id: 'dp', chapter: 11, name: '动态规划', icon: '🧩',
    desc: '背包问题、LCS/LIS、区间DP、树形DP、状态压缩、DP优化',
    resourceIds: [1, 6], // DP入门教程、DP进阶视频脚本
  },
  {
    id: 'search', chapter: 12, name: '搜索算法', icon: '🔎',
    desc: 'DFS深度优先、BFS广度优先、A*启发式、记忆化搜索',
    resourceIds: [8], // BFS与DFS完全指南
  },
  {
    id: 'advanced-ds', chapter: 13, name: '进阶数据结构', icon: '🌳',
    desc: '树与二叉树、二叉搜索树、堆、并查集、线段树、树状数组',
    resourceIds: [16, 21], // 并查集模板、线段树模板
  },
  {
    id: 'graph', chapter: 14, name: '图论', icon: '🕸️',
    desc: '图的存储、DFS/BFS遍历、拓扑排序、最短路、最小生成树',
    resourceIds: [5, 20], // 图论基础拓展、Dijkstra模板
  },
  {
    id: 'strings', chapter: 15, name: '字符串算法', icon: '📝',
    desc: '字符串哈希、KMP算法、Trie字典树、AC自动机',
    resourceIds: [19], // KMP字符串匹配
  },
  {
    id: 'number-theory', chapter: 16, name: '数论与数学', icon: '🔢',
    desc: '素数筛选、快速幂/矩阵快速幂、GCD/LCM、模运算逆元、组合数学',
    resourceIds: [17, 18], // 素数筛选、快速幂
  },
  {
    id: 'contest', chapter: 17, name: '竞赛综合训练', icon: '🏆',
    desc: '蓝桥杯真题精练、时间复杂度分析、竞赛策略与模板',
    resourceIds: [10, 13, 22, 23], // 历年真题汇编、填空精讲、编程题精选、复杂度速查
  },
]

/** 超链接资源 — 推荐的外部学习网站 */
export const EXTERNAL_LINKS = [
  { name: '洛谷 (Luogu)', url: 'https://www.luogu.com.cn/', icon: '🏔️', desc: '国内最大算法竞赛社区，题库+题解+讨论' },
  { name: 'LeetCode 中国', url: 'https://leetcode.cn/', icon: '💻', desc: '面试算法题库，含企业真题' },
  { name: '蓝桥云课', url: 'https://www.lanqiao.cn/problems/', icon: '🏅', desc: '蓝桥杯官方训练平台' },
  { name: 'cppreference', url: 'https://zh.cppreference.com/w/cpp', icon: '📖', desc: 'C++ 标准库权威参考' },
  { name: 'AcWing', url: 'https://www.acwing.com/', icon: '🧪', desc: '算法课程+在线评测' },
  { name: 'Codeforces', url: 'https://codeforces.com/', icon: '🌍', desc: '国际算法竞赛平台' },
  { name: 'OI Wiki', url: 'https://oi-wiki.org/', icon: '📚', desc: '开放编程竞赛知识库' },
  { name: 'Visualgo', url: 'https://visualgo.net/zh', icon: '👁️', desc: '算法可视化交互学习' },
]
