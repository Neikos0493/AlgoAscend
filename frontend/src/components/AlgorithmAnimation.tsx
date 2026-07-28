import { useRef, useEffect, useState, useCallback } from 'react'

// ==================== 类型定义 ====================

interface AnimFrame {
  // 柱状图模式（排序/搜索）
  array?: number[]
  comparing?: number[]       // 正在比较/关注的索引
  swapping?: number[]         // 正在交换的索引
  sorted?: number[]           // 已排好/已处理的索引
  found?: number             // 搜索找到的索引
  target?: number            // 搜索目标值
  rangeLow?: number          // 二分搜索范围
  rangeHigh?: number

  // 网格模式（图论）
  grid?: number[][]           // 0=空, 1=障碍
  visited?: [number, number][]
  path?: [number, number][]
  frontier?: [number, number][]
  currentCell?: [number, number]
  startCell?: [number, number]
  endCell?: [number, number]

  description: string
}

type Algorithm = 
  | 'bubble' | 'quick' | 'merge' | 'insertion' | 'selection' | 'shell'
  | 'heap' | 'counting' | 'radix' | 'cocktail'
  | 'linear_search' | 'binary_search'
  | 'bfs' | 'dfs' | 'dijkstra'

type Category = 'sort' | 'search' | 'graph'

interface AlgoConfig {
  id: Algorithm
  name: string
  icon: string
  category: Category
  desc: string
}

// ==================== 算法列表 ====================

const ALGOS: AlgoConfig[] = [
  // 排序算法
  { id: 'bubble', name: '冒泡排序', icon: '🫧', category: 'sort', desc: 'O(n²) · 相邻比较交换' },
  { id: 'quick', name: '快速排序', icon: '⚡', category: 'sort', desc: 'O(n log n) · 分治+基准' },
  { id: 'merge', name: '归并排序', icon: '🔀', category: 'sort', desc: 'O(n log n) · 分治合并' },
  { id: 'insertion', name: '插入排序', icon: '📥', category: 'sort', desc: 'O(n²) · 逐个插入' },
  { id: 'selection', name: '选择排序', icon: '🎯', category: 'sort', desc: 'O(n²) · 选最小交换' },
  { id: 'shell', name: '希尔排序', icon: '🐚', category: 'sort', desc: 'O(n log n) · 间隔递减' },
  { id: 'heap', name: '堆排序', icon: '⛰️', category: 'sort', desc: 'O(n log n) · 二叉堆' },
  { id: 'counting', name: '计数排序', icon: '🔢', category: 'sort', desc: 'O(n+k) · 非比较排序' },
  { id: 'radix', name: '基数排序', icon: '🔟', category: 'sort', desc: 'O(nk) · 按位排序' },
  { id: 'cocktail', name: '鸡尾酒排序', icon: '🍸', category: 'sort', desc: 'O(n²) · 双向冒泡' },
  // 搜索算法
  { id: 'linear_search', name: '线性搜索', icon: '🔍', category: 'search', desc: 'O(n) · 逐个查找' },
  { id: 'binary_search', name: '二分搜索', icon: '🎯', category: 'search', desc: 'O(log n) · 折半查找' },
  // 图论算法
  { id: 'bfs', name: 'BFS 广度优先', icon: '🌊', category: 'graph', desc: 'O(V+E) · 队列扩散' },
  { id: 'dfs', name: 'DFS 深度优先', icon: '🕳️', category: 'graph', desc: 'O(V+E) · 栈探索' },
  { id: 'dijkstra', name: 'Dijkstra 最短路径', icon: '🗺️', category: 'graph', desc: 'O(E log V) · 贪心最短' },
]

const CATEGORIES: { id: Category; name: string; icon: string }[] = [
  { id: 'sort', name: '排序', icon: '📶' },
  { id: 'search', name: '搜索', icon: '🔍' },
  { id: 'graph', name: '图论', icon: '🕸️' },
]

const CANVAS_W = 680
const CANVAS_H = 400
const BAR_GAP = 4

// ==================== 排序算法 ====================

function* bubbleSort(arr: number[]): Generator<AnimFrame> {
  const a = [...arr]; const n = a.length; const sorted: number[] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      yield { array: [...a], comparing: [j, j + 1], swapping: [], sorted: [...sorted], description: `比较 ${a[j]} 和 ${a[j + 1]}` }
      if (a[j] > a[j + 1]) {
        yield { array: [...a], comparing: [j, j + 1], swapping: [j, j + 1], sorted: [...sorted], description: `交换 ${a[j]} ↔ ${a[j + 1]}` }
        ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
      }
    }
    sorted.push(n - i - 1)
  }
  yield { array: a, comparing: [], swapping: [], sorted: a.map((_, i) => i), description: '排序完成!' }
}

function* quickSort(arr: number[]): Generator<AnimFrame> {
  const a = [...arr]; const sorted: number[] = []
  function* qs(lo: number, hi: number): Generator<AnimFrame> {
    if (lo >= hi) { sorted.push(lo); return }
    const pivot = a[hi]
    yield { array: [...a], comparing: [hi], swapping: [], sorted: [...sorted], description: `选择基准值 ${pivot}` }
    let i = lo - 1
    for (let j = lo; j < hi; j++) {
      yield { array: [...a], comparing: [j, hi], swapping: [], sorted: [...sorted], description: `比较 ${a[j]} 和基准 ${pivot}` }
      if (a[j] < pivot) { i++; if (i !== j) { yield { array: [...a], comparing: [i, j], swapping: [i, j], sorted: [...sorted], description: `交换 ${a[i]} ↔ ${a[j]}` }; [a[i], a[j]] = [a[j], a[i]] } }
    }
    const pi = i + 1
    if (pi !== hi) { yield { array: [...a], comparing: [pi, hi], swapping: [pi, hi], sorted: [...sorted], description: `放置基准 ${pivot} 到位置 ${pi}` }; [a[pi], a[hi]] = [a[hi], a[pi]] }
    sorted.push(pi)
    yield* qs(lo, pi - 1); yield* qs(pi + 1, hi)
  }
  yield* qs(0, a.length - 1)
  yield { array: a, comparing: [], swapping: [], sorted: a.map((_, i) => i), description: '排序完成!' }
}

function* mergeSort(arr: number[]): Generator<AnimFrame> {
  const a = [...arr]; const sorted: number[] = []
  function* ms(lo: number, hi: number): Generator<AnimFrame> {
    if (lo >= hi) return
    const mid = Math.floor((lo + hi) / 2)
    yield* ms(lo, mid); yield* ms(mid + 1, hi)
    yield { array: [...a], comparing: [lo, hi], swapping: [], sorted: [...sorted], description: `合并 [${lo}..${mid}] 和 [${mid + 1}..${hi}]` }
    const left = a.slice(lo, mid + 1); const right = a.slice(mid + 1, hi + 1)
    let i = 0, j = 0, k = lo
    while (i < left.length && j < right.length) {
      yield { array: [...a], comparing: [lo + i, mid + 1 + j], swapping: [], sorted: [...sorted], description: `比较 ${left[i]} 和 ${right[j]}` }
      if (left[i] <= right[j]) { a[k++] = left[i++] } else { a[k++] = right[j++] }
    }
    while (i < left.length) a[k++] = left[i++]
    while (j < right.length) a[k++] = right[j++]
    for (let x = lo; x <= hi; x++) sorted.push(x)
    yield { array: [...a], comparing: [], swapping: [], sorted: [...new Set(sorted)], description: `合并完成 [${lo}..${hi}]` }
  }
  yield* ms(0, a.length - 1)
  yield { array: a, comparing: [], swapping: [], sorted: a.map((_, i) => i), description: '排序完成!' }
}

function* insertionSort(arr: number[]): Generator<AnimFrame> {
  const a = [...arr]; const sorted: number[] = [0]
  for (let i = 1; i < a.length; i++) {
    const key = a[i]
    yield { array: [...a], comparing: [i], swapping: [], sorted: [...sorted], description: `取出 ${key}，寻找插入位置` }
    let j = i - 1
    while (j >= 0 && a[j] > key) {
      yield { array: [...a], comparing: [j, j + 1], swapping: [j, j + 1], sorted: [...sorted], description: `${a[j]} > ${key}，后移` }
      a[j + 1] = a[j]; j--
    }
    a[j + 1] = key; sorted.push(i)
    yield { array: [...a], comparing: [], swapping: [], sorted: [...sorted], description: `插入 ${key} 到位置 ${j + 1}` }
  }
  yield { array: a, comparing: [], swapping: [], sorted: a.map((_, i) => i), description: '排序完成!' }
}

function* selectionSort(arr: number[]): Generator<AnimFrame> {
  const a = [...arr]; const sorted: number[] = []
  for (let i = 0; i < a.length; i++) {
    let minIdx = i
    for (let j = i + 1; j < a.length; j++) {
      yield { array: [...a], comparing: [minIdx, j], swapping: [], sorted: [...sorted], description: `查找最小值，当前最小 ${a[minIdx]} vs ${a[j]}` }
      if (a[j] < a[minIdx]) minIdx = j
    }
    if (minIdx !== i) { yield { array: [...a], comparing: [i, minIdx], swapping: [i, minIdx], sorted: [...sorted], description: `交换 ${a[i]} ↔ ${a[minIdx]}` }; [a[i], a[minIdx]] = [a[minIdx], a[i]] }
    sorted.push(i)
  }
  yield { array: a, comparing: [], swapping: [], sorted: a.map((_, i) => i), description: '排序完成!' }
}

function* shellSort(arr: number[]): Generator<AnimFrame> {
  const a = [...arr]; const sorted: number[] = []; const n = a.length
  let gap = Math.floor(n / 2)
  while (gap > 0) {
    yield { array: [...a], comparing: [], swapping: [], sorted: [...sorted], description: `间隔 = ${gap}` }
    for (let i = gap; i < n; i++) {
      const temp = a[i]; let j = i
      while (j >= gap && a[j - gap] > temp) {
        yield { array: [...a], comparing: [j - gap, j], swapping: [j - gap, j], sorted: [...sorted], description: `${a[j - gap]} > ${temp}，后移` }
        a[j] = a[j - gap]; j -= gap
      }
      a[j] = temp
    }
    gap = Math.floor(gap / 2)
  }
  yield { array: a, comparing: [], swapping: [], sorted: a.map((_, i) => i), description: '排序完成!' }
}

function* heapSort(arr: number[]): Generator<AnimFrame> {
  const a = [...arr]; const n = a.length; const sorted: number[] = []

  function* heapify(size: number, root: number): Generator<AnimFrame> {
    let largest = root
    const left = 2 * root + 1; const right = 2 * root + 2
    if (left < size) { yield { array: [...a], comparing: [largest, left], swapping: [], sorted: [], description: `比较 ${a[largest]} 和 ${a[left]}` }; if (a[left] > a[largest]) largest = left }
    if (right < size) { yield { array: [...a], comparing: [largest, right], swapping: [], sorted: [], description: `比较 ${a[largest]} 和 ${a[right]}` }; if (a[right] > a[largest]) largest = right }
    if (largest !== root) {
      yield { array: [...a], comparing: [root, largest], swapping: [root, largest], sorted: [], description: `交换 ${a[root]} ↔ ${a[largest]}` }
      ;[a[root], a[largest]] = [a[largest], a[root]]
      yield* heapify(size, largest)
    }
  }

  // 建堆
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield { array: [...a], comparing: [i], swapping: [], sorted: [], description: `堆化节点 ${i} (值=${a[i]})` }
    yield* heapify(n, i)
  }

  // 排序
  for (let i = n - 1; i > 0; i--) {
    yield { array: [...a], comparing: [0, i], swapping: [0, i], sorted: [...sorted], description: `交换堆顶 ${a[0]} ↔ ${a[i]}` }
    ;[a[0], a[i]] = [a[i], a[0]]
    sorted.unshift(i)
    yield* heapify(i, 0)
  }
  sorted.unshift(0)
  yield { array: a, comparing: [], swapping: [], sorted: a.map((_, i) => i), description: '排序完成!' }
}

function* countingSort(arr: number[]): Generator<AnimFrame> {
  const a = [...arr]; const n = a.length
  const max = Math.max(...a); const min = Math.min(...a)
  const range = max - min + 1
  const count = new Array(range).fill(0)
  const output = new Array(n).fill(0)
  const sorted: number[] = []

  // 计数
  for (let i = 0; i < n; i++) {
    count[a[i] - min]++
    yield { array: [...a], comparing: [i], swapping: [], sorted: [], description: `计数: ${a[i]} 出现 ${count[a[i] - min]} 次` }
  }

  // 累加
  for (let i = 1; i < range; i++) {
    count[i] += count[i - 1]
  }
  yield { array: [...a], comparing: [], swapping: [], sorted: [], description: `计数数组累加完成` }

  // 放置
  for (let i = n - 1; i >= 0; i--) {
    const val = a[i]
    const pos = count[val - min] - 1
    output[pos] = val
    count[val - min]--
    sorted.push(pos)
    yield { array: [...output], comparing: [pos], swapping: [], sorted: [...sorted], description: `放置 ${val} 到位置 ${pos}` }
  }

  yield { array: output, comparing: [], swapping: [], sorted: output.map((_, i) => i), description: '排序完成!' }
}

function* radixSort(arr: number[]): Generator<AnimFrame> {
  let a = [...arr]; const n = a.length
  const max = Math.max(...a)
  let exp = 1

  while (Math.floor(max / exp) > 0) {
    yield { array: [...a], comparing: [], swapping: [], sorted: [], description: `按第 ${Math.log10(exp) + 1} 位排序` }
    const output = new Array(n).fill(0)
    const count = new Array(10).fill(0)

    for (let i = 0; i < n; i++) {
      const digit = Math.floor(a[i] / exp) % 10
      count[digit]++
      yield { array: [...a], comparing: [i], swapping: [], sorted: [], description: `${a[i]} 的第 ${Math.log10(exp) + 1} 位 = ${digit}` }
    }

    for (let i = 1; i < 10; i++) count[i] += count[i - 1]

    for (let i = n - 1; i >= 0; i--) {
      const digit = Math.floor(a[i] / exp) % 10
      output[count[digit] - 1] = a[i]
      count[digit]--
    }

    a = [...output]
    exp *= 10
  }

  yield { array: a, comparing: [], swapping: [], sorted: a.map((_, i) => i), description: '排序完成!' }
}

function* cocktailSort(arr: number[]): Generator<AnimFrame> {
  const a = [...arr]; const n = a.length; const sorted: number[] = []
  let start = 0; let end = n - 1; let swapped = true

  while (swapped) {
    swapped = false
    yield { array: [...a], comparing: [], swapping: [], sorted: [...sorted], description: `从左到右扫描 [${start}..${end}]` }
    for (let i = start; i < end; i++) {
      yield { array: [...a], comparing: [i, i + 1], swapping: [], sorted: [...sorted], description: `比较 ${a[i]} 和 ${a[i + 1]}` }
      if (a[i] > a[i + 1]) {
        yield { array: [...a], comparing: [i, i + 1], swapping: [i, i + 1], sorted: [...sorted], description: `交换 ${a[i]} ↔ ${a[i + 1]}` }
        ;[a[i], a[i + 1]] = [a[i + 1], a[i]]; swapped = true
      }
    }
    sorted.push(end); end--

    if (!swapped) break
    swapped = false
    yield { array: [...a], comparing: [], swapping: [], sorted: [...sorted], description: `从右到左扫描 [${start}..${end}]` }
    for (let i = end; i > start; i--) {
      yield { array: [...a], comparing: [i, i - 1], swapping: [], sorted: [...sorted], description: `比较 ${a[i]} 和 ${a[i - 1]}` }
      if (a[i] < a[i - 1]) {
        yield { array: [...a], comparing: [i, i - 1], swapping: [i, i - 1], sorted: [...sorted], description: `交换 ${a[i]} ↔ ${a[i - 1]}` }
        ;[a[i], a[i - 1]] = [a[i - 1], a[i]]; swapped = true
      }
    }
    sorted.push(start); start++
  }

  yield { array: a, comparing: [], swapping: [], sorted: a.map((_, i) => i), description: '排序完成!' }
}

// ==================== 搜索算法 ====================

function* linearSearch(arr: number[]): Generator<AnimFrame> {
  const a = [...arr]
  const target = a[Math.floor(Math.random() * a.length)]
  for (let i = 0; i < a.length; i++) {
    yield { array: a, comparing: [i], swapping: [], sorted: Array.from({ length: i }, (_, k) => k), description: `检查位置 ${i}: ${a[i]} == ${target}?`, target }
    if (a[i] === target) {
      yield { array: a, comparing: [i], swapping: [], sorted: Array.from({ length: i + 1 }, (_, k) => k), description: `找到目标 ${target} 在位置 ${i}!`, target, found: i }
      return
    }
  }
  yield { array: a, comparing: [], swapping: [], sorted: [], description: `未找到 ${target}`, target }
}

function* binarySearch(arr: number[]): Generator<AnimFrame> {
  const a = [...arr].sort((x, y) => x - y)
  const target = a[Math.floor(Math.random() * a.length)]
  let lo = 0; let hi = a.length - 1

  yield { array: a, comparing: [], swapping: [], sorted: [], description: `二分搜索: 在已排序数组中查找 ${target}`, target, rangeLow: lo, rangeHigh: hi }

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    yield { array: a, comparing: [mid], swapping: [], sorted: [], description: `mid=${mid}, a[${mid}]=${a[mid]}, 范围 [${lo}, ${hi}]`, target, rangeLow: lo, rangeHigh: hi }
    if (a[mid] === target) {
      yield { array: a, comparing: [mid], swapping: [], sorted: [], description: `找到目标 ${target} 在位置 ${mid}!`, target, rangeLow: lo, rangeHigh: hi, found: mid }
      return
    } else if (a[mid] < target) {
      lo = mid + 1
      yield { array: a, comparing: [mid], swapping: [], sorted: [], description: `${a[mid]} < ${target}, 搜索右半 [${lo}, ${hi}]`, target, rangeLow: lo, rangeHigh: hi }
    } else {
      hi = mid - 1
      yield { array: a, comparing: [mid], swapping: [], sorted: [], description: `${a[mid]} > ${target}, 搜索左半 [${lo}, ${hi}]`, target, rangeLow: lo, rangeHigh: hi }
    }
  }
  yield { array: a, comparing: [], swapping: [], sorted: [], description: `未找到 ${target}`, target, rangeLow: lo, rangeHigh: hi }
}

// ==================== 图论算法 ====================

function generateMaze(): { grid: number[][]; start: [number, number]; end: [number, number] } {
  const rows = 12; const cols = 20
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    grid[r] = []
    for (let c = 0; c < cols; c++) {
      grid[r][c] = Math.random() < 0.28 ? 1 : 0
    }
  }
  grid[0][0] = 0
  grid[rows - 1][cols - 1] = 0
  // 保证起点和终点周围畅通
  if (rows > 1) grid[1][0] = 0
  if (cols > 1) grid[0][1] = 0
  if (rows > 1) grid[rows - 2][cols - 1] = 0
  if (cols > 1) grid[rows - 1][cols - 2] = 0
  return { grid, start: [0, 0], end: [rows - 1, cols - 1] }
}

const DIRS: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]]

function* bfs(maze: { grid: number[][]; start: [number, number]; end: [number, number] }): Generator<AnimFrame> {
  const { grid, start, end } = maze
  const rows = grid.length; const cols = grid[0].length
  const parent = new Map<string, [number, number]>()
  const visited: [number, number][] = []
  const queue: [number, number][] = [start]
  parent.set(`${start[0]},${start[1]}`, [-1, -1])
  const [er, ec] = end

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    if (visited.some(([vr, vc]) => vr === r && vc === c)) continue
    visited.push([r, c])

    yield {
      grid: grid.map(row => [...row]), visited: [...visited], frontier: [...queue],
      currentCell: [r, c], startCell: start, endCell: end,
      description: `BFS: 访问 (${r},${c}), 队列长度=${queue.length}, 已访问=${visited.length}`
    }

    if (r === er && c === ec) {
      // 回溯路径
      const path: [number, number][] = []
      let cr: number = r, cc: number = c
      while (cr !== -1 && cc !== -1) {
        path.unshift([cr, cc])
        const p = parent.get(`${cr},${cc}`) || [-1, -1]
        cr = p[0]; cc = p[1]
      }
      yield {
        grid: grid.map(row => [...row]), visited: [...visited], frontier: [],
        currentCell: [r, c], startCell: start, endCell: end, path,
        description: `BFS 完成! 找到最短路径 (${path.length} 步)`
      }
      return
    }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr; const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0) {
        const key = `${nr},${nc}`
        if (!parent.has(key)) {
          parent.set(key, [r, c])
          queue.push([nr, nc])
        }
      }
    }
  }

  yield {
    grid: grid.map(row => [...row]), visited: [...visited], frontier: [],
    currentCell: [-1, -1], startCell: start, endCell: end,
    description: `无法到达终点 (已探索 ${visited.length} 个格子)`
  }
}

function* dfs(maze: { grid: number[][]; start: [number, number]; end: [number, number] }): Generator<AnimFrame> {
  const { grid, start, end } = maze
  const rows = grid.length; const cols = grid[0].length
  const visited: [number, number][] = []
  const stack: [number, number][] = [start]
  const parent = new Map<string, [number, number]>()
  parent.set(`${start[0]},${start[1]}`, [-1, -1])
  const [er, ec] = end

  while (stack.length > 0) {
    const [r, c] = stack.pop()!
    if (visited.some(([vr, vc]) => vr === r && vc === c)) continue
    visited.push([r, c])

    yield {
      grid: grid.map(row => [...row]), visited: [...visited], frontier: [...stack],
      currentCell: [r, c], startCell: start, endCell: end,
      description: `DFS: 访问 (${r},${c}), 栈深度=${stack.length}, 已访问=${visited.length}`
    }

    if (r === er && c === ec) {
      const path: [number, number][] = []
      let cr: number = r, cc: number = c
      while (cr !== -1 && cc !== -1) {
        path.unshift([cr, cc])
        const p = parent.get(`${cr},${cc}`) || [-1, -1]
        cr = p[0]; cc = p[1]
      }
      yield {
        grid: grid.map(row => [...row]), visited: [...visited], frontier: [],
        currentCell: [r, c], startCell: start, endCell: end, path,
        description: `DFS 完成! 找到路径 (${path.length} 步)`
      }
      return
    }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr; const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0) {
        const key = `${nr},${nc}`
        if (!parent.has(key)) {
          parent.set(key, [r, c])
          stack.push([nr, nc])
        }
      }
    }
  }

  yield {
    grid: grid.map(row => [...row]), visited: [...visited], frontier: [],
    currentCell: [-1, -1], startCell: start, endCell: end,
    description: `无法到达终点 (已探索 ${visited.length} 个格子)`
  }
}

function* dijkstra(maze: { grid: number[][]; start: [number, number]; end: [number, number] }): Generator<AnimFrame> {
  const { grid, start, end } = maze
  const rows = grid.length; const cols = grid[0].length
  const dist: number[][] = Array.from({ length: rows }, () => Array(cols).fill(Infinity))
  const parent = new Map<string, [number, number]>()
  const visited: [number, number][] = []

  dist[start[0]][start[1]] = 0
  const pq: [number, number][] = [[start[0], start[1]]] // 简化: BFS变体
  const [er, ec] = end

  while (pq.length > 0) {
    // 找最小距离 (简单实现, 非真实堆)
    let minIdx = 0
    for (let i = 1; i < pq.length; i++) {
      if (dist[pq[i][0]][pq[i][1]] < dist[pq[minIdx][0]][pq[minIdx][1]]) minIdx = i
    }
    const [r, c] = pq.splice(minIdx, 1)[0]
    if (visited.some(([vr, vc]) => vr === r && vc === c)) continue
    visited.push([r, c])

    yield {
      grid: grid.map(row => [...row]), visited: [...visited], frontier: [...pq],
      currentCell: [r, c], startCell: start, endCell: end,
      description: `Dijkstra: 访问 (${r},${c}), dist=${dist[r][c]}, 已访问=${visited.length}`
    }

    if (r === er && c === ec) {
      const path: [number, number][] = []
      let cr: number = r, cc: number = c
      while (cr !== -1 && cc !== -1) {
        path.unshift([cr, cc])
        const p = parent.get(`${cr},${cc}`) || [-1, -1]
        cr = p[0]; cc = p[1]
      }
      yield {
        grid: grid.map(row => [...row]), visited: [...visited], frontier: [],
        currentCell: [r, c], startCell: start, endCell: end, path,
        description: `Dijkstra 完成! 最短距离=${dist[r][c]}, 路径 ${path.length} 步`
      }
      return
    }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr; const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0) {
        const newDist = dist[r][c] + 1
        if (newDist < dist[nr][nc]) {
          dist[nr][nc] = newDist
          parent.set(`${nr},${nc}`, [r, c])
          pq.push([nr, nc])
        }
      }
    }
  }

  yield {
    grid: grid.map(row => [...row]), visited: [...visited], frontier: [],
    currentCell: [-1, -1], startCell: start, endCell: end,
    description: `无法到达终点 (已探索 ${visited.length} 个格子)`
  }
}

// ==================== 通用生成器入口 ====================

type AlgoGenerator = Generator<AnimFrame>

function createGenerator(algo: Algorithm, arr: number[]): AlgoGenerator {
  const sortGens: Record<string, (a: number[]) => Generator<AnimFrame>> = {
    bubble: bubbleSort, quick: quickSort, merge: mergeSort,
    insertion: insertionSort, selection: selectionSort, shell: shellSort,
    heap: heapSort, counting: countingSort, radix: radixSort, cocktail: cocktailSort,
    linear_search: linearSearch, binary_search: binarySearch,
  }
  if (sortGens[algo]) return sortGens[algo](arr)

  // 图论算法使用迷宫
  const maze = generateMaze()
  const graphGens: Record<string, (m: typeof maze) => Generator<AnimFrame>> = {
    bfs, dfs, dijkstra,
  }
  if (graphGens[algo]) return graphGens[algo](maze)

  return bubbleSort(arr) // fallback
}

// ==================== 组件 ====================

export default function AlgorithmAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<AlgoGenerator | null>(null)
  const rafRef = useRef<number>(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [category, setCategory] = useState<Category>('sort')
  const [algo, setAlgo] = useState<Algorithm>('bubble')
  const [speed, setSpeed] = useState(3)
  const [count, setCount] = useState(25)
  const [playing, setPlaying] = useState(false)
  const [done, setDone] = useState(false)
  const [description, setDescription] = useState('点击播放开始动画')
  const [recording, setRecording] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [frameData, setFrameData] = useState<AnimFrame | null>(null)

  const isGraph = ALGOS.find(a => a.id === algo)?.category === 'graph'
  const currentAlgos = ALGOS.filter(a => a.category === category)

  const generateArray = useCallback(() => {
    const arr: number[] = []
    for (let i = 0; i < count; i++) {
      arr.push(Math.floor(Math.random() * 95) + 5)
    }
    return arr
  }, [count])

  const init = useCallback(() => {
    setPlaying(false)
    setDone(false)
    setDescription('点击播放开始动画')
    setDownloadUrl('')
    const arr = generateArray()
    const gen = createGenerator(algo, arr)
    animRef.current = gen
    setFrameData({ array: arr, comparing: [], swapping: [], sorted: [], description: '就绪' })
  }, [algo, generateArray])

  useEffect(() => { init() }, [init])

  // 切换分类时自动选第一个算法
  const switchCategory = (cat: Category) => {
    const first = ALGOS.find(a => a.category === cat)
    if (first) {
      setCategory(cat)
      setAlgo(first.id)
    }
  }

  const switchAlgo = (id: Algorithm) => {
    setAlgo(id)
  }

  // ===== Canvas 渲染 =====

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frameData) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = CANVAS_W * dpr
    canvas.height = CANVAS_H * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#0f1117'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // 网格线
    ctx.strokeStyle = '#1a1d2e'
    ctx.lineWidth = 0.5
    for (let y = 0; y < CANVAS_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke()
    }

    if (isGraph && frameData.grid) {
      drawGridMode(ctx, frameData)
    } else if (frameData.array) {
      drawBarMode(ctx, frameData)
    }
  }, [frameData, isGraph])

  function drawBarMode(ctx: CanvasRenderingContext2D, f: AnimFrame) {
    const array = f.array!
    const n = array.length
    const maxVal = Math.max(...array, 1)
    const { comparing = [], swapping = [], sorted = [] } = f

    const barW = Math.max(2, Math.floor((CANVAS_W - (n + 1) * BAR_GAP) / n))
    const totalGap = BAR_GAP * (n + 1)
    const barAreaW = barW * n + totalGap
    const startX = (CANVAS_W - barAreaW) / 2 + BAR_GAP

    for (let i = 0; i < n; i++) {
      const x = startX + i * (barW + BAR_GAP)
      const h = (array[i] / maxVal) * (CANVAS_H - 80)
      const y = CANVAS_H - h - 10

      let color = '#3b82f6'
      if (f.found === i) color = '#a855f7' // 找到目标紫色
      else if (sorted.includes(i)) color = '#22c55e' // 已处理绿色
      else if (comparing.includes(i)) color = '#f59e0b' // 比较中黄色
      else if (swapping.includes(i)) color = '#ef4444' // 交换中红色

      const grad = ctx.createLinearGradient(x, y, x, CANVAS_H - 10)
      grad.addColorStop(0, color)
      grad.addColorStop(1, color + '44')
      ctx.fillStyle = grad

      const r = Math.min(4, barW / 2)
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + barW - r, y)
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r)
      ctx.lineTo(x + barW, CANVAS_H - 10)
      ctx.lineTo(x, CANVAS_H - 10)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.fill()

      // 搜索范围高亮
      if (f.rangeLow !== undefined && f.rangeHigh !== undefined) {
        if (i >= f.rangeLow && i <= f.rangeHigh) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
          ctx.fillRect(x - 1, 0, barW + 2, CANVAS_H)
        }
      }

      if (barW > 16) {
        ctx.fillStyle = f.found === i ? '#e9d5ff' : '#fff'
        ctx.font = `${Math.min(11, barW - 2)}px monospace`
        ctx.textAlign = 'center'
        ctx.fillText(String(array[i]), x + barW / 2, y - 4)
      }
    }

    // 搜索目标值显示
    if (f.target !== undefined) {
      ctx.fillStyle = '#f59e0b'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`目标: ${f.target}`, 10, 20)
    }
  }

  function drawGridMode(ctx: CanvasRenderingContext2D, f: AnimFrame) {
    const grid = f.grid!
    const rows = grid.length
    const cols = grid[0].length
    const cellW = CANVAS_W / cols
    const cellH = CANVAS_H / rows

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW; const y = r * cellH

        // 基础颜色
        if (grid[r][c] === 1) {
          ctx.fillStyle = '#1e293b' // 障碍物
        } else {
          ctx.fillStyle = '#0f172a' // 空地
        }

        // 起点/终点
        if (f.startCell && r === f.startCell[0] && c === f.startCell[1]) {
          ctx.fillStyle = '#22c55e'
        }
        if (f.endCell && r === f.endCell[0] && c === f.endCell[1]) {
          ctx.fillStyle = '#ef4444'
        }

        // 已访问
        if (f.visited?.some(([vr, vc]) => vr === r && vc === c)) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.4)'
        }

        // 前沿 (Froniter)
        if (f.frontier?.some(([fr, fc]) => fr === r && fc === c)) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.5)'
        }

        // 当前格子
        if (f.currentCell && f.currentCell[0] === r && f.currentCell[1] === c) {
          ctx.fillStyle = '#f59e0b'
        }

        // 路径
        if (f.path?.some(([pr, pc]) => pr === r && pc === c)) {
          ctx.fillStyle = '#a855f7'
        }

        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2)

        // 起点终点标记
        if (f.startCell && r === f.startCell[0] && c === f.startCell[1]) {
          ctx.fillStyle = '#fff'
          ctx.font = `${Math.min(14, cellH - 4)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText('S', x + cellW / 2, y + cellH / 2 + 5)
        }
        if (f.endCell && r === f.endCell[0] && c === f.endCell[1]) {
          ctx.fillStyle = '#fff'
          ctx.font = `${Math.min(14, cellH - 4)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText('E', x + cellW / 2, y + cellH / 2 + 5)
        }
      }
    }
  }

  // ===== 动画帧推进 =====

  const nextFrame = useCallback(() => {
    const gen = animRef.current
    if (!gen) return
    const result = gen.next()
    if (result.done) {
      setPlaying(false)
      setDone(true)
      setDescription('动画播放完毕')
      return
    }
    setFrameData(result.value)
    setDescription(result.value.description)
  }, [])

  useEffect(() => {
    if (!playing) return
    const delay = Math.max(10, 300 - speed * 75)
    let lastTime = 0
    let elapsed = 0
    const tick = (time: number) => {
      if (!lastTime) lastTime = time
      elapsed += time - lastTime
      lastTime = time
      if (elapsed >= delay) { elapsed = 0; nextFrame() }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, speed, nextFrame])

  const togglePlay = () => {
    if (done) { init(); setTimeout(() => setPlaying(true), 50); return }
    setPlaying(!playing)
  }
  const stepFrame = () => { if (!playing) nextFrame() }

  const startRecord = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const stream = (canvas as any).captureStream(30)
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
    chunksRef.current = []
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setRecording(false)
    }
    mr.start()
    mediaRecorderRef.current = mr
    setRecording(true)
    setDownloadUrl('')
    init()
    setTimeout(() => setPlaying(true), 100)
  }

  const stopRecord = () => {
    mediaRecorderRef.current?.stop()
    setPlaying(false)
  }

  return (
    <div className="bg-surface-200/80 rounded-xl border border-gray-700/30 p-4 space-y-4">
      {/* 标题 */}
      <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
        <span>🎬</span> 算法动画演示器
        <span className="text-[10px] text-gray-500 font-normal ml-auto">
          {isGraph ? 'Grid Maze' : 'Canvas Bar Chart'} · {ALGOS.length}种算法
        </span>
      </h3>

      {/* 分类 Tab */}
      <div className="flex gap-1 bg-surface-400/60 rounded-lg p-1">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => switchCategory(cat.id)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
              category === cat.id
                ? 'bg-surface-300/60 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* 算法选择 */}
      <div>
        <label className="text-[10px] text-gray-500 mb-1.5 block">
          {CATEGORIES.find(c => c.id === category)?.icon} 选择算法 ({currentAlgos.length}种)
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {currentAlgos.map(a => (
            <button key={a.id} onClick={() => switchAlgo(a.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
                algo === a.id
                  ? 'bg-primary-500/15 text-primary-300 border-primary-500/30'
                  : 'bg-surface-300/20 text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600/30'
              }`}
              title={a.desc}
            >{a.icon} {a.name}</button>
          ))}
        </div>
      </div>

      {/* 速度 + 数量 */}
      <div className="flex gap-4">
        <div>
          <label className="text-[10px] text-gray-500 mb-1 block">速度 {speed}/5</label>
          <input type="range" min={1} max={5} value={speed} onChange={e => setSpeed(+e.target.value)}
            className="w-20 accent-primary-500" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 mb-1 block">数量 {count}</label>
          <select value={count} onChange={e => { setCount(+e.target.value) }}
            className="bg-surface-300/50 border border-gray-600/30 rounded px-1.5 py-0.5 text-[11px] text-gray-200">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={40}>40</option>
            <option value={60}>60</option>
          </select>
        </div>
        <div className="ml-auto flex items-end">
          <span className="text-[10px] text-gray-500">{ALGOS.find(a=>a.id===algo)?.desc}</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-gray-700/30 bg-[#0f1117]">
        <canvas ref={canvasRef} className="w-full h-auto" style={{ width: '100%', aspectRatio: '680/400' }} />
        {done && (
          <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center pointer-events-none">
            <span className="text-green-400 text-2xl font-bold animate-pulse-soft">
              {isGraph ? '🏁 路径找到!' : '✅ 完成!'}
            </span>
          </div>
        )}
      </div>

      {/* 状态文本 */}
      <div className="text-center">
        <span className="text-sm text-gray-300 font-mono">{description}</span>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={togglePlay}
          className="px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          {playing ? '⏸️ 暂停' : done ? '🔄 重播' : '▶️ 播放'}
        </button>
        <button onClick={stepFrame} disabled={playing || done}
          className="px-3 py-2 bg-surface-300/30 hover:bg-surface-300/50 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-30"
        >⏭️ 单步</button>
        <button onClick={init}
          className="px-3 py-2 bg-surface-300/30 hover:bg-surface-300/50 text-gray-300 rounded-lg text-sm transition-colors"
        >🔀 换数据</button>

        <div className="w-px h-6 bg-gray-600/50 mx-1" />

        {recording ? (
          <button onClick={stopRecord}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 animate-pulse-soft"
          >⏹️ 停止录制</button>
        ) : (
          <button onClick={startRecord}
            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          >🎥 录制 MP4</button>
        )}

        {downloadUrl && (
          <a href={downloadUrl} download="algorithm-animation.webm"
            className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors flex items-center gap-1"
          >⬇️ 下载</a>
        )}
      </div>

      <p className="text-[10px] text-gray-600 text-center">
        录制时自动重播完整动画，录制完成后下载 WebM 格式视频。也可使用 OBS/FFmpeg 进行更高质量录制。
      </p>
    </div>
  )
}
