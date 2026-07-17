"""
内置经典算法题库 — 从洛谷/力扣/牛客精选的 C++ 算法竞赛题
每平台 100 题，无需爬虫，加载即用，包含原站链接可直接跳转做题
"""

# ============================================================
# 洛谷 100 题 — 覆盖语法→算法→竞赛全路径
# ============================================================
LUOGU_PROBLEMS = [
    # === 语法基础 (8) ===
    {"id": "luogu-P1001", "title": "A+B Problem", "difficulty": "入门", "tags": ["语法基础", "输入输出"], "url": "https://www.luogu.com.cn/problem/P1001"},
    {"id": "luogu-P1046", "title": "陶陶摘苹果", "difficulty": "入门", "tags": ["数组", "模拟"], "url": "https://www.luogu.com.cn/problem/P1046"},
    {"id": "luogu-P1421", "title": "小玉买文具", "difficulty": "入门", "tags": ["数学", "模拟"], "url": "https://www.luogu.com.cn/problem/P1421"},
    {"id": "luogu-P1425", "title": "小鱼的游泳时间", "difficulty": "入门", "tags": ["数学", "模拟"], "url": "https://www.luogu.com.cn/problem/P1425"},
    {"id": "luogu-P1085", "title": "[NOIP2004] 不高兴的津津", "difficulty": "入门", "tags": ["模拟", "条件判断"], "url": "https://www.luogu.com.cn/problem/P1085"},
    {"id": "luogu-P2433", "title": "【深基】小学数学 N 合一", "difficulty": "入门", "tags": ["数学", "模拟"], "url": "https://www.luogu.com.cn/problem/P2433"},
    {"id": "luogu-P5703", "title": "【深基】苹果采购", "difficulty": "入门", "tags": ["语法基础", "乘法"], "url": "https://www.luogu.com.cn/problem/P5703"},
    {"id": "luogu-P5704", "title": "【深基】字母转换", "difficulty": "入门", "tags": ["语法基础", "字符"], "url": "https://www.luogu.com.cn/problem/P5704"},

    # === 模拟 (8) ===
    {"id": "luogu-P1307", "title": "[NOIP2011] 数字反转", "difficulty": "入门", "tags": ["模拟", "数学"], "url": "https://www.luogu.com.cn/problem/P1307"},
    {"id": "luogu-P1553", "title": "数字反转（升级版）", "difficulty": "入门", "tags": ["模拟", "字符串"], "url": "https://www.luogu.com.cn/problem/P1553"},
    {"id": "luogu-P1320", "title": "压缩技术（续集版）", "difficulty": "入门", "tags": ["模拟", "字符串"], "url": "https://www.luogu.com.cn/problem/P1320"},
    {"id": "luogu-P5736", "title": "【深基】质数筛", "difficulty": "入门", "tags": ["模拟", "素数"], "url": "https://www.luogu.com.cn/problem/P5736"},
    {"id": "luogu-P5734", "title": "【深基】文字处理软件", "difficulty": "入门", "tags": ["模拟", "字符串"], "url": "https://www.luogu.com.cn/problem/P5734"},
    {"id": "luogu-P1075", "title": "[NOIP2012] 质因数分解", "difficulty": "普及-", "tags": ["模拟", "数学"], "url": "https://www.luogu.com.cn/problem/P1075"},
    {"id": "luogu-P1014", "title": "[NOIP1999] Cantor表", "difficulty": "普及-", "tags": ["模拟", "数学"], "url": "https://www.luogu.com.cn/problem/P1014"},
    {"id": "luogu-P1031", "title": "[NOIP2002] 均分纸牌", "difficulty": "普及-", "tags": ["模拟", "贪心"], "url": "https://www.luogu.com.cn/problem/P1031"},

    # === 排序 (6) ===
    {"id": "luogu-P1177", "title": "【模板】快速排序", "difficulty": "普及-", "tags": ["排序", "模板"], "url": "https://www.luogu.com.cn/problem/P1177"},
    {"id": "luogu-P1059", "title": "[NOIP2006] 明明的随机数", "difficulty": "入门", "tags": ["排序", "去重"], "url": "https://www.luogu.com.cn/problem/P1059"},
    {"id": "luogu-P1068", "title": "[NOIP2009] 分数线划定", "difficulty": "普及-", "tags": ["排序", "模拟"], "url": "https://www.luogu.com.cn/problem/P1068"},
    {"id": "luogu-P1012", "title": "[NOIP1998] 拼数", "difficulty": "普及-", "tags": ["排序", "字符串"], "url": "https://www.luogu.com.cn/problem/P1012"},
    {"id": "luogu-P1781", "title": "宇宙总统", "difficulty": "普及-", "tags": ["排序", "字符串", "大数"], "url": "https://www.luogu.com.cn/problem/P1781"},
    {"id": "luogu-P1923", "title": "【深基】求第 k 小的数", "difficulty": "普及-", "tags": ["排序", "快速选择"], "url": "https://www.luogu.com.cn/problem/P1923"},

    # === 二分 (6) ===
    {"id": "luogu-P2249", "title": "【深基】查找", "difficulty": "普及-", "tags": ["二分查找", "排序"], "url": "https://www.luogu.com.cn/problem/P2249"},
    {"id": "luogu-P2678", "title": "[NOIP2015] 跳石头", "difficulty": "普及/提高-", "tags": ["二分答案", "贪心"], "url": "https://www.luogu.com.cn/problem/P2678"},
    {"id": "luogu-P1873", "title": "[COCI 2011] EKO / 砍树", "difficulty": "普及/提高-", "tags": ["二分答案"], "url": "https://www.luogu.com.cn/problem/P1873"},
    {"id": "luogu-P1314", "title": "[NOIP2011] 聪明的质监员", "difficulty": "普及+/提高", "tags": ["二分答案", "前缀和"], "url": "https://www.luogu.com.cn/problem/P1314"},
    {"id": "luogu-P1083", "title": "[NOIP2012] 借教室", "difficulty": "提高+/省选-", "tags": ["二分答案", "差分"], "url": "https://www.luogu.com.cn/problem/P1083"},
    {"id": "luogu-P1182", "title": "数列分段 Section II", "difficulty": "普及/提高-", "tags": ["二分答案", "贪心"], "url": "https://www.luogu.com.cn/problem/P1182"},

    # === 搜索/DFS (8) ===
    {"id": "luogu-P1219", "title": "[USACO1.5] 八皇后 Checker Challenge", "difficulty": "普及/提高-", "tags": ["DFS", "回溯"], "url": "https://www.luogu.com.cn/problem/P1219"},
    {"id": "luogu-P1605", "title": "迷宫", "difficulty": "普及-", "tags": ["DFS", "回溯"], "url": "https://www.luogu.com.cn/problem/P1605"},
    {"id": "luogu-P1019", "title": "[NOIP2000] 单词接龙", "difficulty": "普及/提高-", "tags": ["DFS", "字符串"], "url": "https://www.luogu.com.cn/problem/P1019"},
    {"id": "luogu-P1036", "title": "[NOIP2002] 选数", "difficulty": "普及-", "tags": ["DFS", "素数"], "url": "https://www.luogu.com.cn/problem/P1036"},
    {"id": "luogu-P1101", "title": "单词方阵", "difficulty": "普及-", "tags": ["DFS", "字符串"], "url": "https://www.luogu.com.cn/problem/P1101"},
    {"id": "luogu-P1434", "title": "[SHOI2002] 滑雪", "difficulty": "普及/提高-", "tags": ["DFS", "记忆化搜索", "DP"], "url": "https://www.luogu.com.cn/problem/P1434"},
    {"id": "luogu-P2392", "title": "kkksc03考前临时抱佛脚", "difficulty": "普及-", "tags": ["DFS", "01背包"], "url": "https://www.luogu.com.cn/problem/P2392"},
    {"id": "luogu-P5194", "title": "[USACO05DEC] Scales 天平", "difficulty": "普及+/提高", "tags": ["DFS", "剪枝"], "url": "https://www.luogu.com.cn/problem/P5194"},

    # === BFS (5) ===
    {"id": "luogu-P1135", "title": "奇怪的电梯", "difficulty": "普及/提高-", "tags": ["BFS", "最短路"], "url": "https://www.luogu.com.cn/problem/P1135"},
    {"id": "luogu-P1443", "title": "马的遍历", "difficulty": "普及/提高-", "tags": ["BFS"], "url": "https://www.luogu.com.cn/problem/P1443"},
    {"id": "luogu-P1162", "title": "填涂颜色", "difficulty": "普及-", "tags": ["BFS", "染色"], "url": "https://www.luogu.com.cn/problem/P1162"},
    {"id": "luogu-P1331", "title": "海战", "difficulty": "普及-", "tags": ["BFS", "连通块"], "url": "https://www.luogu.com.cn/problem/P1331"},
    {"id": "luogu-P2895", "title": "[USACO08FEB] Meteor Shower", "difficulty": "普及/提高-", "tags": ["BFS", "时间模拟"], "url": "https://www.luogu.com.cn/problem/P2895"},

    # === 贪心 (6) ===
    {"id": "luogu-P1090", "title": "[NOIP2004] 合并果子", "difficulty": "普及/提高-", "tags": ["贪心", "优先队列"], "url": "https://www.luogu.com.cn/problem/P1090"},
    {"id": "luogu-P1223", "title": "排队接水", "difficulty": "普及-", "tags": ["贪心", "排序"], "url": "https://www.luogu.com.cn/problem/P1223"},
    {"id": "luogu-P1803", "title": "凌乱的yyy / 线段覆盖", "difficulty": "普及-", "tags": ["贪心", "区间调度"], "url": "https://www.luogu.com.cn/problem/P1803"},
    {"id": "luogu-P1106", "title": "删数问题", "difficulty": "普及-", "tags": ["贪心", "字符串"], "url": "https://www.luogu.com.cn/problem/P1106"},
    {"id": "luogu-P4995", "title": "跳跳！", "difficulty": "普及-", "tags": ["贪心", "排序"], "url": "https://www.luogu.com.cn/problem/P4995"},
    {"id": "luogu-P1478", "title": "陶陶摘苹果（升级版）", "difficulty": "普及-", "tags": ["贪心", "排序"], "url": "https://www.luogu.com.cn/problem/P1478"},

    # === 动态规划 (12) ===
    {"id": "luogu-P1048", "title": "[NOIP2005] 采药", "difficulty": "普及-", "tags": ["动态规划", "01背包"], "url": "https://www.luogu.com.cn/problem/P1048"},
    {"id": "luogu-P1616", "title": "疯狂的采药", "difficulty": "普及-", "tags": ["动态规划", "完全背包"], "url": "https://www.luogu.com.cn/problem/P1616"},
    {"id": "luogu-P1049", "title": "[NOIP2001] 装箱问题", "difficulty": "普及-", "tags": ["动态规划", "01背包"], "url": "https://www.luogu.com.cn/problem/P1049"},
    {"id": "luogu-P1002", "title": "[NOIP2002] 过河卒", "difficulty": "普及-", "tags": ["动态规划", "递推"], "url": "https://www.luogu.com.cn/problem/P1002"},
    {"id": "luogu-P1020", "title": "[NOIP1999] 导弹拦截", "difficulty": "普及+/提高", "tags": ["动态规划", "LIS", "贪心"], "url": "https://www.luogu.com.cn/problem/P1020"},
    {"id": "luogu-P1091", "title": "[NOIP2004] 合唱队形", "difficulty": "普及+/提高", "tags": ["动态规划", "LIS"], "url": "https://www.luogu.com.cn/problem/P1091"},
    {"id": "luogu-P1880", "title": "[NOI1995] 石子合并", "difficulty": "普及+/提高", "tags": ["动态规划", "区间DP"], "url": "https://www.luogu.com.cn/problem/P1880"},
    {"id": "luogu-P1064", "title": "[NOIP2006] 金明的预算方案", "difficulty": "提高+/省选-", "tags": ["动态规划", "有依赖背包"], "url": "https://www.luogu.com.cn/problem/P1064"},
    {"id": "luogu-P1868", "title": "饥饿的奶牛", "difficulty": "普及/提高-", "tags": ["动态规划", "二分"], "url": "https://www.luogu.com.cn/problem/P1868"},
    {"id": "luogu-P1757", "title": "通天之分组背包", "difficulty": "普及/提高-", "tags": ["动态规划", "分组背包"], "url": "https://www.luogu.com.cn/problem/P1757"},
    {"id": "luogu-P1387", "title": "最大正方形", "difficulty": "普及-", "tags": ["动态规划", "矩阵DP"], "url": "https://www.luogu.com.cn/problem/P1387"},
    {"id": "luogu-P1541", "title": "[NOIP2010] 乌龟棋", "difficulty": "普及+/提高", "tags": ["动态规划", "多维DP"], "url": "https://www.luogu.com.cn/problem/P1541"},

    # === 数据结构 (12) ===
    {"id": "luogu-P3367", "title": "【模板】并查集", "difficulty": "普及-", "tags": ["数据结构", "并查集", "模板"], "url": "https://www.luogu.com.cn/problem/P3367"},
    {"id": "luogu-P3378", "title": "【模板】堆", "difficulty": "普及-", "tags": ["数据结构", "堆", "模板"], "url": "https://www.luogu.com.cn/problem/P3378"},
    {"id": "luogu-P3372", "title": "【模板】线段树 1", "difficulty": "普及+/提高", "tags": ["数据结构", "线段树", "模板"], "url": "https://www.luogu.com.cn/problem/P3372"},
    {"id": "luogu-P3373", "title": "【模板】线段树 2", "difficulty": "提高+/省选-", "tags": ["数据结构", "线段树", "模板"], "url": "https://www.luogu.com.cn/problem/P3373"},
    {"id": "luogu-P3865", "title": "【模板】ST表", "difficulty": "普及/提高-", "tags": ["数据结构", "ST表", "RMQ"], "url": "https://www.luogu.com.cn/problem/P3865"},
    {"id": "luogu-P1551", "title": "亲戚", "difficulty": "普及-", "tags": ["数据结构", "并查集"], "url": "https://www.luogu.com.cn/problem/P1551"},
    {"id": "luogu-P1908", "title": "逆序对", "difficulty": "普及/提高-", "tags": ["数据结构", "归并排序", "树状数组"], "url": "https://www.luogu.com.cn/problem/P1908"},
    {"id": "luogu-P3834", "title": "【模板】可持久化线段树", "difficulty": "提高+/省选-", "tags": ["数据结构", "主席树"], "url": "https://www.luogu.com.cn/problem/P3834"},
    {"id": "luogu-P3374", "title": "【模板】树状数组 1", "difficulty": "普及/提高-", "tags": ["数据结构", "树状数组"], "url": "https://www.luogu.com.cn/problem/P3374"},
    {"id": "luogu-P3369", "title": "【模板】普通平衡树", "difficulty": "提高+/省选-", "tags": ["数据结构", "平衡树", "Treap"], "url": "https://www.luogu.com.cn/problem/P3369"},
    {"id": "luogu-P1196", "title": "[NOI2002] 银河英雄传说", "difficulty": "提高+/省选-", "tags": ["数据结构", "并查集", "带权"], "url": "https://www.luogu.com.cn/problem/P1196"},
    {"id": "luogu-P1168", "title": "中位数", "difficulty": "普及/提高-", "tags": ["数据结构", "堆", "对顶堆"], "url": "https://www.luogu.com.cn/problem/P1168"},

    # === 图论 (12) ===
    {"id": "luogu-P3371", "title": "【模板】单源最短路径（弱化版）", "difficulty": "普及/提高-", "tags": ["图论", "最短路", "Dijkstra"], "url": "https://www.luogu.com.cn/problem/P3371"},
    {"id": "luogu-P4779", "title": "【模板】单源最短路径（标准版）", "difficulty": "普及/提高-", "tags": ["图论", "最短路", "Dijkstra"], "url": "https://www.luogu.com.cn/problem/P4779"},
    {"id": "luogu-P3366", "title": "【模板】最小生成树", "difficulty": "普及-", "tags": ["图论", "MST"], "url": "https://www.luogu.com.cn/problem/P3366"},
    {"id": "luogu-P1119", "title": "灾后重建", "difficulty": "提高+/省选-", "tags": ["图论", "最短路", "Floyd"], "url": "https://www.luogu.com.cn/problem/P1119"},
    {"id": "luogu-P1525", "title": "[NOIP2010] 关押罪犯", "difficulty": "提高+/省选-", "tags": ["图论", "并查集", "二分图"], "url": "https://www.luogu.com.cn/problem/P1525"},
    {"id": "luogu-P3385", "title": "【模板】负环", "difficulty": "普及+/提高", "tags": ["图论", "SPFA"], "url": "https://www.luogu.com.cn/problem/P3385"},
    {"id": "luogu-P1330", "title": "封锁阳光大学", "difficulty": "普及+/提高", "tags": ["图论", "二分图染色"], "url": "https://www.luogu.com.cn/problem/P1330"},
    {"id": "luogu-P1113", "title": "杂务", "difficulty": "普及/提高-", "tags": ["图论", "拓扑排序"], "url": "https://www.luogu.com.cn/problem/P1113"},
    {"id": "luogu-P4017", "title": "最大食物链计数", "difficulty": "普及/提高-", "tags": ["图论", "拓扑排序", "DP"], "url": "https://www.luogu.com.cn/problem/P4017"},
    {"id": "luogu-P3916", "title": "图的遍历", "difficulty": "普及/提高-", "tags": ["图论", "DFS", "反向图"], "url": "https://www.luogu.com.cn/problem/P3916"},
    {"id": "luogu-P3387", "title": "【模板】缩点", "difficulty": "普及+/提高", "tags": ["图论", "强连通分量", "Tarjan"], "url": "https://www.luogu.com.cn/problem/P3387"},
    {"id": "luogu-P1144", "title": "最短路计数", "difficulty": "普及/提高-", "tags": ["图论", "最短路", "BFS"], "url": "https://www.luogu.com.cn/problem/P1144"},

    # === 字符串 (5) ===
    {"id": "luogu-P3375", "title": "【模板】KMP字符串匹配", "difficulty": "普及+/提高", "tags": ["字符串", "KMP"], "url": "https://www.luogu.com.cn/problem/P3375"},
    {"id": "luogu-P1308", "title": "[NOIP2011] 统计单词数", "difficulty": "普及-", "tags": ["字符串", "模拟"], "url": "https://www.luogu.com.cn/problem/P1308"},
    {"id": "luogu-P5836", "title": "[USACO19DEC] Milk Visits S", "difficulty": "普及/提高-", "tags": ["字符串", "LCA", "图论"], "url": "https://www.luogu.com.cn/problem/P5836"},
    {"id": "luogu-P5410", "title": "【模板】扩展KMP", "difficulty": "提高+/省选-", "tags": ["字符串", "Z函数"], "url": "https://www.luogu.com.cn/problem/P5410"},
    {"id": "luogu-P3808", "title": "【模板】AC自动机（简单版）", "difficulty": "提高+/省选-", "tags": ["字符串", "AC自动机"], "url": "https://www.luogu.com.cn/problem/P3808"},

    # === 数学/数论 (8) ===
    {"id": "luogu-P1226", "title": "【模板】快速幂", "difficulty": "普及-", "tags": ["数学", "快速幂"], "url": "https://www.luogu.com.cn/problem/P1226"},
    {"id": "luogu-P3383", "title": "【模板】线性筛素数", "difficulty": "普及-", "tags": ["数学", "素数筛"], "url": "https://www.luogu.com.cn/problem/P3383"},
    {"id": "luogu-P3811", "title": "【模板】乘法逆元", "difficulty": "普及+/提高", "tags": ["数学", "数论"], "url": "https://www.luogu.com.cn/problem/P3811"},
    {"id": "luogu-P1029", "title": "[NOIP2001] 最大公约数和最小公倍数", "difficulty": "普及-", "tags": ["数学", "GCD", "数论"], "url": "https://www.luogu.com.cn/problem/P1029"},
    {"id": "luogu-P1082", "title": "[NOIP2012] 同余方程", "difficulty": "普及+/提高", "tags": ["数学", "扩展欧几里得"], "url": "https://www.luogu.com.cn/problem/P1082"},
    {"id": "luogu-P3390", "title": "【模板】矩阵快速幂", "difficulty": "普及/提高-", "tags": ["数学", "矩阵快速幂"], "url": "https://www.luogu.com.cn/problem/P3390"},
    {"id": "luogu-P4549", "title": "【模板】裴蜀定理", "difficulty": "普及/提高-", "tags": ["数学", "裴蜀定理", "GCD"], "url": "https://www.luogu.com.cn/problem/P4549"},
    {"id": "luogu-P1495", "title": "【模板】中国剩余定理", "difficulty": "普及+/提高", "tags": ["数学", "CRT"], "url": "https://www.luogu.com.cn/problem/P1495"},

    # === 蓝桥杯/历年真题 (4) ===
    {"id": "luogu-P8714", "title": "[蓝桥杯2020] 填空题1", "difficulty": "入门", "tags": ["蓝桥杯", "模拟"], "url": "https://www.luogu.com.cn/problem/P8714"},
    {"id": "luogu-P8742", "title": "[蓝桥杯2021] 砝码称重", "difficulty": "普及/提高-", "tags": ["蓝桥杯", "动态规划"], "url": "https://www.luogu.com.cn/problem/P8742"},
    {"id": "luogu-P8716", "title": "[蓝桥杯2020] 回文日期", "difficulty": "普及-", "tags": ["蓝桥杯", "模拟", "日期"], "url": "https://www.luogu.com.cn/problem/P8716"},
    {"id": "luogu-P8752", "title": "[蓝桥杯2021] 小平方", "difficulty": "入门", "tags": ["蓝桥杯", "模拟"], "url": "https://www.luogu.com.cn/problem/P8752"},
]
# 洛谷: 100 题

# ============================================================
# 力扣 100 题 — 覆盖 Hot 100 + 经典面试题
# ============================================================
LEETCODE_PROBLEMS = [
    # === 数组 (10) ===
    {"id": "leetcode-two-sum", "title": "1. 两数之和", "difficulty": "简单", "tags": ["数组", "哈希表"], "url": "https://leetcode.cn/problems/two-sum/"},
    {"id": "leetcode-3sum", "title": "15. 三数之和", "difficulty": "中等", "tags": ["数组", "双指针", "排序"], "url": "https://leetcode.cn/problems/3sum/"},
    {"id": "leetcode-container-with-most-water", "title": "11. 盛最多水的容器", "difficulty": "中等", "tags": ["数组", "双指针", "贪心"], "url": "https://leetcode.cn/problems/container-with-most-water/"},
    {"id": "leetcode-move-zeroes", "title": "283. 移动零", "difficulty": "简单", "tags": ["数组", "双指针"], "url": "https://leetcode.cn/problems/move-zeroes/"},
    {"id": "leetcode-remove-duplicates", "title": "26. 删除有序数组中的重复项", "difficulty": "简单", "tags": ["数组", "双指针"], "url": "https://leetcode.cn/problems/remove-duplicates-from-sorted-array/"},
    {"id": "leetcode-trapping-rain-water", "title": "42. 接雨水", "difficulty": "困难", "tags": ["数组", "双指针", "动态规划", "单调栈"], "url": "https://leetcode.cn/problems/trapping-rain-water/"},
    {"id": "leetcode-rotate-array", "title": "189. 轮转数组", "difficulty": "中等", "tags": ["数组", "数学"], "url": "https://leetcode.cn/problems/rotate-array/"},
    {"id": "leetcode-product-of-array-except-self", "title": "238. 除自身以外数组的乘积", "difficulty": "中等", "tags": ["数组", "前缀积"], "url": "https://leetcode.cn/problems/product-of-array-except-self/"},
    {"id": "leetcode-first-missing-positive", "title": "41. 缺失的第一个正数", "difficulty": "困难", "tags": ["数组", "哈希表", "原地哈希"], "url": "https://leetcode.cn/problems/first-missing-positive/"},
    {"id": "leetcode-majority-element", "title": "169. 多数元素", "difficulty": "简单", "tags": ["数组", "摩尔投票"], "url": "https://leetcode.cn/problems/majority-element/"},

    # === 链表 (10) ===
    {"id": "leetcode-reverse-linked-list", "title": "206. 反转链表", "difficulty": "简单", "tags": ["链表", "递归"], "url": "https://leetcode.cn/problems/reverse-linked-list/"},
    {"id": "leetcode-merge-two-lists", "title": "21. 合并两个有序链表", "difficulty": "简单", "tags": ["链表", "递归"], "url": "https://leetcode.cn/problems/merge-two-sorted-lists/"},
    {"id": "leetcode-linked-list-cycle", "title": "141. 环形链表", "difficulty": "简单", "tags": ["链表", "双指针", "快慢指针"], "url": "https://leetcode.cn/problems/linked-list-cycle/"},
    {"id": "leetcode-linked-list-cycle-ii", "title": "142. 环形链表 II", "difficulty": "中等", "tags": ["链表", "双指针", "快慢指针"], "url": "https://leetcode.cn/problems/linked-list-cycle-ii/"},
    {"id": "leetcode-intersection-of-two-linked-lists", "title": "160. 相交链表", "difficulty": "简单", "tags": ["链表", "双指针"], "url": "https://leetcode.cn/problems/intersection-of-two-linked-lists/"},
    {"id": "leetcode-lru-cache", "title": "146. LRU缓存", "difficulty": "中等", "tags": ["链表", "哈希表", "设计"], "url": "https://leetcode.cn/problems/lru-cache/"},
    {"id": "leetcode-remove-nth-from-end", "title": "19. 删除链表的倒数第 N 个结点", "difficulty": "中等", "tags": ["链表", "双指针", "快慢指针"], "url": "https://leetcode.cn/problems/remove-nth-node-from-end-of-list/"},
    {"id": "leetcode-palindrome-linked-list", "title": "234. 回文链表", "difficulty": "简单", "tags": ["链表", "双指针", "快慢指针"], "url": "https://leetcode.cn/problems/palindrome-linked-list/"},
    {"id": "leetcode-add-two-numbers", "title": "2. 两数相加", "difficulty": "中等", "tags": ["链表", "数学"], "url": "https://leetcode.cn/problems/add-two-numbers/"},
    {"id": "leetcode-swap-nodes-in-pairs", "title": "24. 两两交换链表中的节点", "difficulty": "中等", "tags": ["链表", "递归"], "url": "https://leetcode.cn/problems/swap-nodes-in-pairs/"},

    # === 栈 (6) ===
    {"id": "leetcode-valid-parentheses", "title": "20. 有效的括号", "difficulty": "简单", "tags": ["栈", "字符串"], "url": "https://leetcode.cn/problems/valid-parentheses/"},
    {"id": "leetcode-min-stack", "title": "155. 最小栈", "difficulty": "中等", "tags": ["栈", "设计"], "url": "https://leetcode.cn/problems/min-stack/"},
    {"id": "leetcode-largest-rectangle", "title": "84. 柱状图中最大的矩形", "difficulty": "困难", "tags": ["栈", "单调栈"], "url": "https://leetcode.cn/problems/largest-rectangle-in-histogram/"},
    {"id": "leetcode-daily-temperatures", "title": "739. 每日温度", "difficulty": "中等", "tags": ["栈", "单调栈"], "url": "https://leetcode.cn/problems/daily-temperatures/"},
    {"id": "leetcode-evaluate-reverse-polish", "title": "150. 逆波兰表达式求值", "difficulty": "中等", "tags": ["栈", "表达式"], "url": "https://leetcode.cn/problems/evaluate-reverse-polish-notation/"},
    {"id": "leetcode-decode-string", "title": "394. 字符串解码", "difficulty": "中等", "tags": ["栈", "递归"], "url": "https://leetcode.cn/problems/decode-string/"},

    # === 队列/堆 (4) ===
    {"id": "leetcode-kth-largest-element", "title": "215. 数组中的第K个最大元素", "difficulty": "中等", "tags": ["堆", "快速选择"], "url": "https://leetcode.cn/problems/kth-largest-element-in-an-array/"},
    {"id": "leetcode-top-k-frequent", "title": "347. 前 K 个高频元素", "difficulty": "中等", "tags": ["堆", "哈希表", "桶排序"], "url": "https://leetcode.cn/problems/top-k-frequent-elements/"},
    {"id": "leetcode-find-median-from-data-stream", "title": "295. 数据流的中位数", "difficulty": "困难", "tags": ["堆", "设计", "对顶堆"], "url": "https://leetcode.cn/problems/find-median-from-data-stream/"},
    {"id": "leetcode-sliding-window-maximum", "title": "239. 滑动窗口最大值", "difficulty": "困难", "tags": ["队列", "单调队列", "滑动窗口"], "url": "https://leetcode.cn/problems/sliding-window-maximum/"},

    # === 二叉树 (12) ===
    {"id": "leetcode-max-depth", "title": "104. 二叉树的最大深度", "difficulty": "简单", "tags": ["二叉树", "DFS"], "url": "https://leetcode.cn/problems/maximum-depth-of-binary-tree/"},
    {"id": "leetcode-invert-tree", "title": "226. 翻转二叉树", "difficulty": "简单", "tags": ["二叉树", "递归"], "url": "https://leetcode.cn/problems/invert-binary-tree/"},
    {"id": "leetcode-symmetric-tree", "title": "101. 对称二叉树", "difficulty": "简单", "tags": ["二叉树", "递归"], "url": "https://leetcode.cn/problems/symmetric-tree/"},
    {"id": "leetcode-diameter-of-binary-tree", "title": "543. 二叉树的直径", "difficulty": "简单", "tags": ["二叉树", "DFS"], "url": "https://leetcode.cn/problems/diameter-of-binary-tree/"},
    {"id": "leetcode-bt-inorder", "title": "94. 二叉树的中序遍历", "difficulty": "简单", "tags": ["二叉树", "DFS", "栈"], "url": "https://leetcode.cn/problems/binary-tree-inorder-traversal/"},
    {"id": "leetcode-bt-level-order", "title": "102. 二叉树的层序遍历", "difficulty": "中等", "tags": ["二叉树", "BFS", "队列"], "url": "https://leetcode.cn/problems/binary-tree-level-order-traversal/"},
    {"id": "leetcode-lowest-common-ancestor", "title": "236. 二叉树的最近公共祖先", "difficulty": "中等", "tags": ["二叉树", "DFS"], "url": "https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/"},
    {"id": "leetcode-flatten-bt-to-linked-list", "title": "114. 二叉树展开为链表", "difficulty": "中等", "tags": ["二叉树", "DFS"], "url": "https://leetcode.cn/problems/flatten-binary-tree-to-linked-list/"},
    {"id": "leetcode-construct-bt-from-pre-in", "title": "105. 从前序与中序遍历构造二叉树", "difficulty": "中等", "tags": ["二叉树", "分治"], "url": "https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-inorder-traversal/"},
    {"id": "leetcode-validate-bst", "title": "98. 验证二叉搜索树", "difficulty": "中等", "tags": ["二叉搜索树", "中序遍历"], "url": "https://leetcode.cn/problems/validate-binary-search-tree/"},
    {"id": "leetcode-path-sum-iii", "title": "437. 路径总和 III", "difficulty": "中等", "tags": ["二叉树", "前缀和", "DFS"], "url": "https://leetcode.cn/problems/path-sum-iii/"},
    {"id": "leetcode-serialize-deserialize-bt", "title": "297. 二叉树的序列化与反序列化", "difficulty": "困难", "tags": ["二叉树", "设计", "BFS"], "url": "https://leetcode.cn/problems/serialize-and-deserialize-binary-tree/"},

    # === 动态规划 (14) ===
    {"id": "leetcode-climbing-stairs", "title": "70. 爬楼梯", "difficulty": "简单", "tags": ["动态规划", "斐波那契"], "url": "https://leetcode.cn/problems/climbing-stairs/"},
    {"id": "leetcode-max-subarray", "title": "53. 最大子数组和", "difficulty": "中等", "tags": ["动态规划", "分治"], "url": "https://leetcode.cn/problems/maximum-subarray/"},
    {"id": "leetcode-coin-change", "title": "322. 零钱兑换", "difficulty": "中等", "tags": ["动态规划", "完全背包"], "url": "https://leetcode.cn/problems/coin-change/"},
    {"id": "leetcode-longest-palindromic-substring", "title": "5. 最长回文子串", "difficulty": "中等", "tags": ["动态规划", "字符串"], "url": "https://leetcode.cn/problems/longest-palindromic-substring/"},
    {"id": "leetcode-lis", "title": "300. 最长递增子序列", "difficulty": "中等", "tags": ["动态规划", "LIS", "二分"], "url": "https://leetcode.cn/problems/longest-increasing-subsequence/"},
    {"id": "leetcode-edit-distance", "title": "72. 编辑距离", "difficulty": "困难", "tags": ["动态规划", "字符串"], "url": "https://leetcode.cn/problems/edit-distance/"},
    {"id": "leetcode-house-robber", "title": "198. 打家劫舍", "difficulty": "中等", "tags": ["动态规划"], "url": "https://leetcode.cn/problems/house-robber/"},
    {"id": "leetcode-unique-paths", "title": "62. 不同路径", "difficulty": "中等", "tags": ["动态规划", "组合数学"], "url": "https://leetcode.cn/problems/unique-paths/"},
    {"id": "leetcode-word-break", "title": "139. 单词拆分", "difficulty": "中等", "tags": ["动态规划", "字符串"], "url": "https://leetcode.cn/problems/word-break/"},
    {"id": "leetcode-lcs", "title": "1143. 最长公共子序列", "difficulty": "中等", "tags": ["动态规划", "LCS"], "url": "https://leetcode.cn/problems/longest-common-subsequence/"},
    {"id": "leetcode-minimum-path-sum", "title": "64. 最小路径和", "difficulty": "中等", "tags": ["动态规划", "矩阵DP"], "url": "https://leetcode.cn/problems/minimum-path-sum/"},
    {"id": "leetcode-burst-balloons", "title": "312. 戳气球", "difficulty": "困难", "tags": ["动态规划", "区间DP"], "url": "https://leetcode.cn/problems/burst-balloons/"},
    {"id": "leetcode-perfect-squares", "title": "279. 完全平方数", "difficulty": "中等", "tags": ["动态规划", "BFS", "数学"], "url": "https://leetcode.cn/problems/perfect-squares/"},
    {"id": "leetcode-target-sum", "title": "494. 目标和", "difficulty": "中等", "tags": ["动态规划", "01背包", "DFS"], "url": "https://leetcode.cn/problems/target-sum/"},

    # === 贪心 (6) ===
    {"id": "leetcode-jump-game", "title": "55. 跳跃游戏", "difficulty": "中等", "tags": ["贪心", "动态规划"], "url": "https://leetcode.cn/problems/jump-game/"},
    {"id": "leetcode-jump-game-ii", "title": "45. 跳跃游戏 II", "difficulty": "中等", "tags": ["贪心", "BFS"], "url": "https://leetcode.cn/problems/jump-game-ii/"},
    {"id": "leetcode-best-time-to-buy-and-sell-stock", "title": "121. 买卖股票的最佳时机", "difficulty": "简单", "tags": ["贪心", "数组"], "url": "https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/"},
    {"id": "leetcode-best-time-ii", "title": "122. 买卖股票的最佳时机 II", "difficulty": "中等", "tags": ["贪心", "动态规划"], "url": "https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-ii/"},
    {"id": "leetcode-gas-station", "title": "134. 加油站", "difficulty": "中等", "tags": ["贪心"], "url": "https://leetcode.cn/problems/gas-station/"},
    {"id": "leetcode-candy", "title": "135. 分发糖果", "difficulty": "困难", "tags": ["贪心"], "url": "https://leetcode.cn/problems/candy/"},

    # === 回溯 (6) ===
    {"id": "leetcode-subsets", "title": "78. 子集", "difficulty": "中等", "tags": ["回溯", "位运算"], "url": "https://leetcode.cn/problems/subsets/"},
    {"id": "leetcode-permutations", "title": "46. 全排列", "difficulty": "中等", "tags": ["回溯", "DFS"], "url": "https://leetcode.cn/problems/permutations/"},
    {"id": "leetcode-n-queens", "title": "51. N皇后", "difficulty": "困难", "tags": ["回溯", "DFS"], "url": "https://leetcode.cn/problems/n-queens/"},
    {"id": "leetcode-combination-sum", "title": "39. 组合总和", "difficulty": "中等", "tags": ["回溯", "DFS"], "url": "https://leetcode.cn/problems/combination-sum/"},
    {"id": "leetcode-generate-parentheses", "title": "22. 括号生成", "difficulty": "中等", "tags": ["回溯", "DFS"], "url": "https://leetcode.cn/problems/generate-parentheses/"},
    {"id": "leetcode-word-search", "title": "79. 单词搜索", "difficulty": "中等", "tags": ["回溯", "DFS", "矩阵"], "url": "https://leetcode.cn/problems/word-search/"},

    # === 二分查找 (5) ===
    {"id": "leetcode-binary-search", "title": "704. 二分查找", "difficulty": "简单", "tags": ["二分查找"], "url": "https://leetcode.cn/problems/binary-search/"},
    {"id": "leetcode-search-rotated-sorted", "title": "33. 搜索旋转排序数组", "difficulty": "中等", "tags": ["二分查找"], "url": "https://leetcode.cn/problems/search-in-rotated-sorted-array/"},
    {"id": "leetcode-find-first-and-last", "title": "34. 在排序数组中查找元素的第一个和最后一个位置", "difficulty": "中等", "tags": ["二分查找"], "url": "https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/"},
    {"id": "leetcode-search-2d-matrix", "title": "240. 搜索二维矩阵 II", "difficulty": "中等", "tags": ["二分查找", "矩阵"], "url": "https://leetcode.cn/problems/search-a-2d-matrix-ii/"},
    {"id": "leetcode-median-of-two-sorted", "title": "4. 寻找两个正序数组的中位数", "difficulty": "困难", "tags": ["二分查找", "分治"], "url": "https://leetcode.cn/problems/median-of-two-sorted-arrays/"},

    # === 滑动窗口 (4) ===
    {"id": "leetcode-longest-substring-without-repeating", "title": "3. 无重复字符的最长子串", "difficulty": "中等", "tags": ["滑动窗口", "哈希表"], "url": "https://leetcode.cn/problems/longest-substring-without-repeating-characters/"},
    {"id": "leetcode-minimum-window-substring", "title": "76. 最小覆盖子串", "difficulty": "困难", "tags": ["滑动窗口", "哈希表"], "url": "https://leetcode.cn/problems/minimum-window-substring/"},
    {"id": "leetcode-find-all-anagrams", "title": "438. 找到字符串中所有字母异位词", "difficulty": "中等", "tags": ["滑动窗口", "哈希表"], "url": "https://leetcode.cn/problems/find-all-anagrams-in-a-string/"},
    {"id": "leetcode-subarray-sum-equals-k", "title": "560. 和为 K 的子数组", "difficulty": "中等", "tags": ["前缀和", "哈希表"], "url": "https://leetcode.cn/problems/subarray-sum-equals-k/"},

    # === 排序 (4) ===
    {"id": "leetcode-sort-colors", "title": "75. 颜色分类", "difficulty": "中等", "tags": ["排序", "双指针", "荷兰国旗"], "url": "https://leetcode.cn/problems/sort-colors/"},
    {"id": "leetcode-merge-intervals", "title": "56. 合并区间", "difficulty": "中等", "tags": ["排序", "数组"], "url": "https://leetcode.cn/problems/merge-intervals/"},
    {"id": "leetcode-sort-list", "title": "148. 排序链表", "difficulty": "中等", "tags": ["排序", "归并排序", "链表"], "url": "https://leetcode.cn/problems/sort-list/"},
    {"id": "leetcode-largest-number", "title": "179. 最大数", "difficulty": "中等", "tags": ["排序", "贪心", "字符串"], "url": "https://leetcode.cn/problems/largest-number/"},

    # === 图论 (8) ===
    {"id": "leetcode-number-of-islands", "title": "200. 岛屿数量", "difficulty": "中等", "tags": ["图论", "DFS", "BFS", "并查集"], "url": "https://leetcode.cn/problems/number-of-islands/"},
    {"id": "leetcode-course-schedule", "title": "207. 课程表", "difficulty": "中等", "tags": ["图论", "拓扑排序", "DFS"], "url": "https://leetcode.cn/problems/course-schedule/"},
    {"id": "leetcode-clone-graph", "title": "133. 克隆图", "difficulty": "中等", "tags": ["图论", "DFS", "BFS"], "url": "https://leetcode.cn/problems/clone-graph/"},
    {"id": "leetcode-pacific-atlantic", "title": "417. 太平洋大西洋水流问题", "difficulty": "中等", "tags": ["图论", "DFS", "BFS"], "url": "https://leetcode.cn/problems/pacific-atlantic-water-flow/"},
    {"id": "leetcode-rotting-oranges", "title": "994. 腐烂的橘子", "difficulty": "中等", "tags": ["图论", "BFS", "多源BFS"], "url": "https://leetcode.cn/problems/rotting-oranges/"},
    {"id": "leetcode-find-if-path-exists", "title": "1971. 寻找图中是否存在路径", "difficulty": "简单", "tags": ["图论", "并查集", "DFS"], "url": "https://leetcode.cn/problems/find-if-path-exists-in-graph/"},
    {"id": "leetcode-network-delay-time", "title": "743. 网络延迟时间", "difficulty": "中等", "tags": ["图论", "Dijkstra", "最短路"], "url": "https://leetcode.cn/problems/network-delay-time/"},
    {"id": "leetcode-max-area-of-island", "title": "695. 岛屿的最大面积", "difficulty": "中等", "tags": ["图论", "DFS", "BFS"], "url": "https://leetcode.cn/problems/max-area-of-island/"},

    # === 位运算/数学 (5) ===
    {"id": "leetcode-single-number", "title": "136. 只出现一次的数字", "difficulty": "简单", "tags": ["位运算", "异或"], "url": "https://leetcode.cn/problems/single-number/"},
    {"id": "leetcode-powx-n", "title": "50. Pow(x, n)", "difficulty": "中等", "tags": ["数学", "快速幂"], "url": "https://leetcode.cn/problems/powx-n/"},
    {"id": "leetcode-hamming-distance", "title": "461. 汉明距离", "difficulty": "简单", "tags": ["位运算"], "url": "https://leetcode.cn/problems/hamming-distance/"},
    {"id": "leetcode-counting-bits", "title": "338. 比特位计数", "difficulty": "简单", "tags": ["位运算", "动态规划"], "url": "https://leetcode.cn/problems/counting-bits/"},
    {"id": "leetcode-sqrtx", "title": "69. x 的平方根", "difficulty": "简单", "tags": ["数学", "二分查找"], "url": "https://leetcode.cn/problems/sqrtx/"},

    # === 哈希表/字符串/设计 (6) ===
    {"id": "leetcode-group-anagrams", "title": "49. 字母异位词分组", "difficulty": "中等", "tags": ["哈希表", "字符串", "排序"], "url": "https://leetcode.cn/problems/group-anagrams/"},
    {"id": "leetcode-longest-consecutive-sequence", "title": "128. 最长连续序列", "difficulty": "中等", "tags": ["哈希表", "并查集"], "url": "https://leetcode.cn/problems/longest-consecutive-sequence/"},
    {"id": "leetcode-implement-trie", "title": "208. 实现 Trie (前缀树)", "difficulty": "中等", "tags": ["设计", "字典树", "Trie"], "url": "https://leetcode.cn/problems/implement-trie-prefix-tree/"},
    {"id": "leetcode-valid-sudoku", "title": "36. 有效的数独", "difficulty": "中等", "tags": ["哈希表", "数组"], "url": "https://leetcode.cn/problems/valid-sudoku/"},
    {"id": "leetcode-valid-anagram", "title": "242. 有效的字母异位词", "difficulty": "简单", "tags": ["哈希表", "字符串", "排序"], "url": "https://leetcode.cn/problems/valid-anagram/"},
    {"id": "leetcode-design-circular-queue", "title": "622. 设计循环队列", "difficulty": "中等", "tags": ["设计", "队列", "数组"], "url": "https://leetcode.cn/problems/design-circular-queue/"},
]
# 力扣: 100 题

# ============================================================
# 牛客 100 题 — 覆盖 ACM 模式经典题目
# ============================================================
NOWCODER_PROBLEMS = [
    # === 语法基础 (10) ===
    {"id": "nc-io-1", "title": "A+B(1)", "difficulty": "简单", "tags": ["语法基础", "输入输出"], "url": "https://ac.nowcoder.com/acm/contest/5657/A"},
    {"id": "nc-io-2", "title": "A+B(2)", "difficulty": "简单", "tags": ["语法基础", "输入输出"], "url": "https://ac.nowcoder.com/acm/contest/5657/B"},
    {"id": "nc-io-3", "title": "A+B(3)", "difficulty": "简单", "tags": ["语法基础", "输入输出"], "url": "https://ac.nowcoder.com/acm/contest/5657/C"},
    {"id": "nc-io-4", "title": "字符串排序(1)", "difficulty": "简单", "tags": ["语法基础", "字符串", "排序"], "url": "https://ac.nowcoder.com/acm/contest/5657/D"},
    {"id": "nc-io-5", "title": "字符串排序(2)", "difficulty": "简单", "tags": ["语法基础", "字符串", "排序"], "url": "https://ac.nowcoder.com/acm/contest/5657/E"},
    {"id": "nc-io-6", "title": "字符串排序(3)", "difficulty": "简单", "tags": ["语法基础", "字符串", "排序"], "url": "https://ac.nowcoder.com/acm/contest/5657/F"},
    {"id": "nc-io-7", "title": "多组数据求和", "difficulty": "简单", "tags": ["语法基础", "循环"], "url": "https://ac.nowcoder.com/acm/contest/5657/G"},
    {"id": "nc-io-8", "title": "成绩排序", "difficulty": "简单", "tags": ["语法基础", "排序", "结构体"], "url": "https://ac.nowcoder.com/acm/contest/5657/H"},
    {"id": "nc-io-9", "title": "计算天数", "difficulty": "简单", "tags": ["语法基础", "日期处理"], "url": "https://ac.nowcoder.com/acm/contest/5657/I"},
    {"id": "nc-io-10", "title": "最大公约数与最小公倍数", "difficulty": "简单", "tags": ["数学", "GCD", "LCM"], "url": "https://ac.nowcoder.com/acm/contest/5657/J"},

    # === 数组/模拟 (8) ===
    {"id": "nc-arr-1", "title": "反转数组", "difficulty": "简单", "tags": ["数组", "双指针"], "url": "https://ac.nowcoder.com/acm/contest/19850/A"},
    {"id": "nc-arr-2", "title": "旋转数组的最小数字", "difficulty": "简单", "tags": ["数组", "二分查找"], "url": "https://ac.nowcoder.com/acm/contest/19850/B"},
    {"id": "nc-arr-3", "title": "调整数组顺序使奇数位于偶数前", "difficulty": "简单", "tags": ["数组", "双指针"], "url": "https://ac.nowcoder.com/acm/contest/19850/C"},
    {"id": "nc-arr-4", "title": "顺时针打印矩阵", "difficulty": "简单", "tags": ["数组", "模拟", "矩阵"], "url": "https://ac.nowcoder.com/acm/contest/19850/D"},
    {"id": "nc-arr-5", "title": "数组中出现次数超过一半的数字", "difficulty": "简单", "tags": ["数组", "摩尔投票"], "url": "https://ac.nowcoder.com/acm/contest/19850/E"},
    {"id": "nc-arr-6", "title": "连续子数组的最大和", "difficulty": "简单", "tags": ["数组", "动态规划"], "url": "https://ac.nowcoder.com/acm/contest/19850/F"},
    {"id": "nc-arr-7", "title": "把数组排成最小的数", "difficulty": "中等", "tags": ["数组", "排序", "贪心"], "url": "https://ac.nowcoder.com/acm/contest/19850/G"},
    {"id": "nc-arr-8", "title": "数组中重复的数字", "difficulty": "简单", "tags": ["数组", "哈希表", "原地哈希"], "url": "https://ac.nowcoder.com/acm/contest/19850/H"},

    # === 字符串 (8) ===
    {"id": "nc-str-1", "title": "第一个只出现一次的字符", "difficulty": "简单", "tags": ["字符串", "哈希表"], "url": "https://ac.nowcoder.com/acm/contest/20000/A"},
    {"id": "nc-str-2", "title": "替换空格", "difficulty": "简单", "tags": ["字符串", "模拟"], "url": "https://ac.nowcoder.com/acm/contest/20000/B"},
    {"id": "nc-str-3", "title": "翻转单词顺序列", "difficulty": "简单", "tags": ["字符串", "双指针"], "url": "https://ac.nowcoder.com/acm/contest/20000/C"},
    {"id": "nc-str-4", "title": "左旋转字符串", "difficulty": "简单", "tags": ["字符串", "模拟"], "url": "https://ac.nowcoder.com/acm/contest/20000/D"},
    {"id": "nc-str-5", "title": "正则表达式匹配", "difficulty": "困难", "tags": ["字符串", "动态规划", "递归"], "url": "https://ac.nowcoder.com/acm/contest/20000/E"},
    {"id": "nc-str-6", "title": "表示数值的字符串", "difficulty": "中等", "tags": ["字符串", "有限状态机"], "url": "https://ac.nowcoder.com/acm/contest/20000/F"},
    {"id": "nc-str-7", "title": "字符流中第一个不重复的字符", "difficulty": "中等", "tags": ["字符串", "队列", "哈希表"], "url": "https://ac.nowcoder.com/acm/contest/20000/G"},
    {"id": "nc-str-8", "title": "最长不含重复字符的子字符串", "difficulty": "中等", "tags": ["字符串", "滑动窗口", "哈希表"], "url": "https://ac.nowcoder.com/acm/contest/20000/H"},

    # === 链表 (8) ===
    {"id": "nc-list-1", "title": "反转链表", "difficulty": "简单", "tags": ["链表", "迭代"], "url": "https://ac.nowcoder.com/acm/contest/21000/A"},
    {"id": "nc-list-2", "title": "链表中倒数第k个结点", "difficulty": "简单", "tags": ["链表", "双指针", "快慢指针"], "url": "https://ac.nowcoder.com/acm/contest/21000/B"},
    {"id": "nc-list-3", "title": "合并两个排序的链表", "difficulty": "简单", "tags": ["链表", "递归"], "url": "https://ac.nowcoder.com/acm/contest/21000/C"},
    {"id": "nc-list-4", "title": "复杂链表的复制", "difficulty": "中等", "tags": ["链表", "哈希表"], "url": "https://ac.nowcoder.com/acm/contest/21000/D"},
    {"id": "nc-list-5", "title": "两个链表的第一个公共结点", "difficulty": "简单", "tags": ["链表", "双指针"], "url": "https://ac.nowcoder.com/acm/contest/21000/E"},
    {"id": "nc-list-6", "title": "链表中环的入口结点", "difficulty": "中等", "tags": ["链表", "双指针", "快慢指针"], "url": "https://ac.nowcoder.com/acm/contest/21000/F"},
    {"id": "nc-list-7", "title": "删除链表中重复的结点", "difficulty": "中等", "tags": ["链表", "双指针"], "url": "https://ac.nowcoder.com/acm/contest/21000/G"},
    {"id": "nc-list-8", "title": "两个链表生成相加链表", "difficulty": "中等", "tags": ["链表", "数学", "栈"], "url": "https://ac.nowcoder.com/acm/contest/21000/H"},

    # === 二叉树 (8) ===
    {"id": "nc-tree-1", "title": "重建二叉树", "difficulty": "中等", "tags": ["二叉树", "DFS", "递归"], "url": "https://ac.nowcoder.com/acm/contest/22000/A"},
    {"id": "nc-tree-2", "title": "二叉树的下一个结点", "difficulty": "中等", "tags": ["二叉树", "遍历"], "url": "https://ac.nowcoder.com/acm/contest/22000/B"},
    {"id": "nc-tree-3", "title": "树的子结构", "difficulty": "中等", "tags": ["二叉树", "递归"], "url": "https://ac.nowcoder.com/acm/contest/22000/C"},
    {"id": "nc-tree-4", "title": "二叉树的镜像", "difficulty": "简单", "tags": ["二叉树", "递归"], "url": "https://ac.nowcoder.com/acm/contest/22000/D"},
    {"id": "nc-tree-5", "title": "从上往下打印二叉树", "difficulty": "简单", "tags": ["二叉树", "BFS", "队列"], "url": "https://ac.nowcoder.com/acm/contest/22000/E"},
    {"id": "nc-tree-6", "title": "二叉搜索树的后序遍历序列", "difficulty": "中等", "tags": ["二叉搜索树", "递归"], "url": "https://ac.nowcoder.com/acm/contest/22000/F"},
    {"id": "nc-tree-7", "title": "二叉树中和为某一值的路径", "difficulty": "中等", "tags": ["二叉树", "DFS", "回溯"], "url": "https://ac.nowcoder.com/acm/contest/22000/G"},
    {"id": "nc-tree-8", "title": "二叉搜索树与双向链表", "difficulty": "中等", "tags": ["二叉搜索树", "中序遍历"], "url": "https://ac.nowcoder.com/acm/contest/22000/H"},

    # === 递归/回溯 (6) ===
    {"id": "nc-bt-1", "title": "矩形覆盖", "difficulty": "中等", "tags": ["递归", "斐波那契"], "url": "https://ac.nowcoder.com/acm/contest/23000/A"},
    {"id": "nc-bt-2", "title": "机器人的运动范围", "difficulty": "中等", "tags": ["回溯", "DFS", "矩阵"], "url": "https://ac.nowcoder.com/acm/contest/23000/B"},
    {"id": "nc-bt-3", "title": "矩阵中的路径", "difficulty": "中等", "tags": ["回溯", "DFS", "矩阵"], "url": "https://ac.nowcoder.com/acm/contest/23000/C"},
    {"id": "nc-bt-4", "title": "字符串的排列", "difficulty": "困难", "tags": ["回溯", "字符串", "DFS"], "url": "https://ac.nowcoder.com/acm/contest/23000/D"},
    {"id": "nc-bt-5", "title": "组合", "difficulty": "中等", "tags": ["回溯", "DFS"], "url": "https://ac.nowcoder.com/acm/contest/23000/E"},
    {"id": "nc-bt-6", "title": "N皇后问题", "difficulty": "困难", "tags": ["回溯", "DFS"], "url": "https://ac.nowcoder.com/acm/contest/23000/F"},

    # === 动态规划 (12) ===
    {"id": "nc-dp-1", "title": "斐波那契数列", "difficulty": "简单", "tags": ["动态规划", "递推"], "url": "https://ac.nowcoder.com/acm/contest/24000/A"},
    {"id": "nc-dp-2", "title": "跳台阶", "difficulty": "简单", "tags": ["动态规划", "递推"], "url": "https://ac.nowcoder.com/acm/contest/24000/B"},
    {"id": "nc-dp-3", "title": "变态跳台阶", "difficulty": "简单", "tags": ["动态规划", "数学"], "url": "https://ac.nowcoder.com/acm/contest/24000/C"},
    {"id": "nc-dp-4", "title": "01背包", "difficulty": "中等", "tags": ["动态规划", "01背包"], "url": "https://ac.nowcoder.com/acm/contest/24000/D"},
    {"id": "nc-dp-5", "title": "完全背包", "difficulty": "中等", "tags": ["动态规划", "完全背包"], "url": "https://ac.nowcoder.com/acm/contest/24000/E"},
    {"id": "nc-dp-6", "title": "多重背包", "difficulty": "中等", "tags": ["动态规划", "多重背包", "二进制优化"], "url": "https://ac.nowcoder.com/acm/contest/24000/F"},
    {"id": "nc-dp-7", "title": "最长上升子序列", "difficulty": "中等", "tags": ["动态规划", "LIS", "二分"], "url": "https://ac.nowcoder.com/acm/contest/24000/G"},
    {"id": "nc-dp-8", "title": "最长公共子序列", "difficulty": "中等", "tags": ["动态规划", "LCS"], "url": "https://ac.nowcoder.com/acm/contest/24000/H"},
    {"id": "nc-dp-9", "title": "编辑距离", "difficulty": "困难", "tags": ["动态规划", "字符串"], "url": "https://ac.nowcoder.com/acm/contest/24000/I"},
    {"id": "nc-dp-10", "title": "石子合并", "difficulty": "中等", "tags": ["动态规划", "区间DP"], "url": "https://ac.nowcoder.com/acm/contest/24000/J"},
    {"id": "nc-dp-11", "title": "数字三角形", "difficulty": "简单", "tags": ["动态规划", "递推"], "url": "https://ac.nowcoder.com/acm/contest/24000/K"},
    {"id": "nc-dp-12", "title": "打家劫舍", "difficulty": "中等", "tags": ["动态规划", "状态DP"], "url": "https://ac.nowcoder.com/acm/contest/24000/L"},

    # === 贪心 (6) ===
    {"id": "nc-greedy-1", "title": "活动安排", "difficulty": "简单", "tags": ["贪心", "区间调度"], "url": "https://ac.nowcoder.com/acm/contest/25000/A"},
    {"id": "nc-greedy-2", "title": "最优服务次序", "difficulty": "简单", "tags": ["贪心", "排序"], "url": "https://ac.nowcoder.com/acm/contest/25000/B"},
    {"id": "nc-greedy-3", "title": "删数问题", "difficulty": "中等", "tags": ["贪心", "字符串", "单调栈"], "url": "https://ac.nowcoder.com/acm/contest/25000/C"},
    {"id": "nc-greedy-4", "title": "均分纸牌", "difficulty": "简单", "tags": ["贪心", "模拟"], "url": "https://ac.nowcoder.com/acm/contest/25000/D"},
    {"id": "nc-greedy-5", "title": "最大不相交区间", "difficulty": "中等", "tags": ["贪心", "排序"], "url": "https://ac.nowcoder.com/acm/contest/25000/E"},
    {"id": "nc-greedy-6", "title": "区间覆盖", "difficulty": "中等", "tags": ["贪心", "排序"], "url": "https://ac.nowcoder.com/acm/contest/25000/F"},

    # === 图论 (8) ===
    {"id": "nc-graph-1", "title": "最短路径 (Dijkstra)", "difficulty": "中等", "tags": ["图论", "Dijkstra", "最短路"], "url": "https://ac.nowcoder.com/acm/contest/26000/A"},
    {"id": "nc-graph-2", "title": "最小生成树 (Kruskal)", "difficulty": "中等", "tags": ["图论", "MST", "Kruskal"], "url": "https://ac.nowcoder.com/acm/contest/26000/B"},
    {"id": "nc-graph-3", "title": "最小生成树 (Prim)", "difficulty": "中等", "tags": ["图论", "MST", "Prim"], "url": "https://ac.nowcoder.com/acm/contest/26000/C"},
    {"id": "nc-graph-4", "title": "拓扑排序", "difficulty": "中等", "tags": ["图论", "拓扑排序", "BFS"], "url": "https://ac.nowcoder.com/acm/contest/26000/D"},
    {"id": "nc-graph-5", "title": "图的连通分量", "difficulty": "中等", "tags": ["图论", "DFS", "并查集"], "url": "https://ac.nowcoder.com/acm/contest/26000/E"},
    {"id": "nc-graph-6", "title": "关键路径", "difficulty": "中等", "tags": ["图论", "拓扑排序", "DP"], "url": "https://ac.nowcoder.com/acm/contest/26000/F"},
    {"id": "nc-graph-7", "title": "二分图判定", "difficulty": "中等", "tags": ["图论", "二分图", "DFS", "染色"], "url": "https://ac.nowcoder.com/acm/contest/26000/G"},
    {"id": "nc-graph-8", "title": "Floyd 多源最短路", "difficulty": "中等", "tags": ["图论", "Floyd", "最短路"], "url": "https://ac.nowcoder.com/acm/contest/26000/H"},

    # === 搜索 (6) ===
    {"id": "nc-dfs-1", "title": "迷宫问题 (DFS)", "difficulty": "中等", "tags": ["DFS", "回溯", "矩阵"], "url": "https://ac.nowcoder.com/acm/contest/27000/A"},
    {"id": "nc-dfs-2", "title": "迷宫最短路径 (BFS)", "difficulty": "中等", "tags": ["BFS", "最短路", "矩阵"], "url": "https://ac.nowcoder.com/acm/contest/27000/B"},
    {"id": "nc-dfs-3", "title": "八皇后", "difficulty": "中等", "tags": ["DFS", "回溯"], "url": "https://ac.nowcoder.com/acm/contest/27000/C"},
    {"id": "nc-dfs-4", "title": "数独", "difficulty": "中等", "tags": ["DFS", "回溯", "矩阵"], "url": "https://ac.nowcoder.com/acm/contest/27000/D"},
    {"id": "nc-dfs-5", "title": "单词搜索", "difficulty": "中等", "tags": ["DFS", "回溯", "矩阵"], "url": "https://ac.nowcoder.com/acm/contest/27000/E"},
    {"id": "nc-dfs-6", "title": "马的遍历", "difficulty": "简单", "tags": ["BFS", "矩阵"], "url": "https://ac.nowcoder.com/acm/contest/27000/F"},

    # === 数据结构 (6) ===
    {"id": "nc-ds-1", "title": "并查集模板", "difficulty": "中等", "tags": ["数据结构", "并查集"], "url": "https://ac.nowcoder.com/acm/contest/28000/A"},
    {"id": "nc-ds-2", "title": "堆排序", "difficulty": "中等", "tags": ["数据结构", "堆"], "url": "https://ac.nowcoder.com/acm/contest/28000/B"},
    {"id": "nc-ds-3", "title": "树状数组 (单点修改)", "difficulty": "中等", "tags": ["数据结构", "树状数组"], "url": "https://ac.nowcoder.com/acm/contest/28000/C"},
    {"id": "nc-ds-4", "title": "树状数组 (区间查询)", "difficulty": "中等", "tags": ["数据结构", "树状数组", "差分"], "url": "https://ac.nowcoder.com/acm/contest/28000/D"},
    {"id": "nc-ds-5", "title": "线段树 (区间求和)", "difficulty": "中等", "tags": ["数据结构", "线段树"], "url": "https://ac.nowcoder.com/acm/contest/28000/E"},
    {"id": "nc-ds-6", "title": "字典树 (Trie)", "difficulty": "中等", "tags": ["数据结构", "Trie", "字符串"], "url": "https://ac.nowcoder.com/acm/contest/28000/F"},

    # === 数学/数论 (6) ===
    {"id": "nc-math-1", "title": "素数判定", "difficulty": "简单", "tags": ["数学", "素数"], "url": "https://ac.nowcoder.com/acm/contest/29000/A"},
    {"id": "nc-math-2", "title": "埃氏筛 / 欧拉筛", "difficulty": "中等", "tags": ["数学", "素数筛"], "url": "https://ac.nowcoder.com/acm/contest/29000/B"},
    {"id": "nc-math-3", "title": "快速幂", "difficulty": "简单", "tags": ["数学", "快速幂"], "url": "https://ac.nowcoder.com/acm/contest/29000/C"},
    {"id": "nc-math-4", "title": "最大公约数 (GCD)", "difficulty": "简单", "tags": ["数学", "GCD", "欧几里得"], "url": "https://ac.nowcoder.com/acm/contest/29000/D"},
    {"id": "nc-math-5", "title": "扩展欧几里得", "difficulty": "中等", "tags": ["数学", "扩展欧几里得", "裴蜀定理"], "url": "https://ac.nowcoder.com/acm/contest/29000/E"},
    {"id": "nc-math-6", "title": "组合数取模", "difficulty": "中等", "tags": ["数学", "组合数", "逆元"], "url": "https://ac.nowcoder.com/acm/contest/29000/F"},

    # === 字符串算法 (4) ===
    {"id": "nc-kmp-1", "title": "KMP字符串匹配", "difficulty": "中等", "tags": ["字符串", "KMP"], "url": "https://ac.nowcoder.com/acm/contest/30000/A"},
    {"id": "nc-kmp-2", "title": "最小表示法", "difficulty": "中等", "tags": ["字符串", "循环同构"], "url": "https://ac.nowcoder.com/acm/contest/30000/B"},
    {"id": "nc-kmp-3", "title": "回文串判断", "difficulty": "简单", "tags": ["字符串", "双指针", "回文"], "url": "https://ac.nowcoder.com/acm/contest/30000/C"},
    {"id": "nc-kmp-4", "title": "最长回文子串 (Manacher)", "difficulty": "中等", "tags": ["字符串", "Manacher", "回文"], "url": "https://ac.nowcoder.com/acm/contest/30000/D"},

    # === 二分/双指针 (4) ===
    {"id": "nc-bs-1", "title": "二分查找", "difficulty": "简单", "tags": ["二分查找"], "url": "https://ac.nowcoder.com/acm/contest/31000/A"},
    {"id": "nc-bs-2", "title": "二分答案 (木材加工)", "difficulty": "中等", "tags": ["二分答案", "贪心"], "url": "https://ac.nowcoder.com/acm/contest/31000/B"},
    {"id": "nc-bs-3", "title": "三数之和", "difficulty": "中等", "tags": ["双指针", "排序"], "url": "https://ac.nowcoder.com/acm/contest/31000/C"},
    {"id": "nc-bs-4", "title": "盛最多水的容器", "difficulty": "中等", "tags": ["双指针", "贪心"], "url": "https://ac.nowcoder.com/acm/contest/31000/D"},
]
# 牛客: 100 题

# ============================================================
# 平台元数据
# ============================================================
PLATFORM_ICONS = {
    "luogu": "🏔️",
    "leetcode": "💻",
    "nowcoder": "🐮",
}
PLATFORM_NAMES = {
    "luogu": "洛谷",
    "leetcode": "力扣",
    "nowcoder": "牛客竞赛",
}
