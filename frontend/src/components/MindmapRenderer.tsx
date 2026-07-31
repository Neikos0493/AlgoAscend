import { useEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '../stores/useStore'

interface TreeNode {
  text: string
  children: TreeNode[]
}

interface Props {
  tree?: { root: string; children: TreeNode[] }
  mermaid?: string  // 向后兼容
}

const COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6']
const CONTAINER_HEIGHT = 520
const MIN_ZOOM = 0.15
const MAX_ZOOM = 5
const ZOOM_STEP = 1.25  // 每次滚轮缩放倍率

/**
 * 水平树思维导图 SVG 渲染器
 * 通过操作 viewBox 实现缩放和平移（不依赖 CSS transform）
 */
export default function MindmapRenderer({ tree, mermaid }: Props) {
  const theme = useStore(state => state.theme)
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const root = tree || (mermaid ? parseMermaidToTree(mermaid) : null)
  const [canvasSize, setCanvasSize] = useState({ w: 1000, h: 600 })
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 600 })

  // ref 镜像（事件回调里读最新值）
  const vbRef = useRef(viewBox)
  vbRef.current = viewBox
  const canvasRef = useRef(canvasSize)
  canvasRef.current = canvasSize

  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, vx: 0, vy: 0 })

  // ===== 渲染树 =====
  useEffect(() => {
    if (!root || !svgRef.current) return
    const { width, height } = renderTree(svgRef.current, root, theme)
    setCanvasSize({ w: width, h: height })
  }, [root, theme])

  // ===== 画布尺寸确定后，初始适配容器 =====
  useEffect(() => {
    const cw = canvasSize.w
    const ch = canvasSize.h
    if (cw <= 0) return
    // 以画布全貌为初始 viewBox
    setViewBox({ x: 0, y: 0, w: cw, h: ch })
    vbRef.current = { x: 0, y: 0, w: cw, h: ch }
  }, [canvasSize])

  // ===== 原生 wheel 事件（绕过 React onWheel 可能的 passive 问题） =====
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const vb = vbRef.current
      if (vb.w <= 0) return

      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const sx = vb.x + (mx / rect.width) * vb.w
      const sy = vb.y + (my / rect.height) * vb.h

      const dir = e.deltaY > 0 ? 1 : -1
      const factor = dir > 0 ? ZOOM_STEP : 1 / ZOOM_STEP
      let nw = vb.w * factor
      let nh = vb.h * factor

      const maxW = canvasRef.current.w
      const maxH = canvasRef.current.h
      if (nw > maxW / MIN_ZOOM) { nw = maxW / MIN_ZOOM; nh = maxH / MIN_ZOOM }
      if (nw < maxW / MAX_ZOOM) { nw = maxW / MAX_ZOOM; nh = maxH / MAX_ZOOM }

      const nx = sx - (mx / rect.width) * nw
      const ny = sy - (my / rect.height) * nh

      const next = { x: nx, y: ny, w: nw, h: nh }
      vbRef.current = next
      setViewBox(next)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ===== 拖拽平移 =====
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, vx: vbRef.current.x, vy: vbRef.current.y }
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const ds = dragStart.current
    // 鼠标位移量
    const dx = e.clientX - ds.mx
    const dy = e.clientY - ds.my
    // 换算为 viewBox 坐标
    const vb = vbRef.current
    const scaleX = vb.w / rect.width
    const scaleY = vb.h / rect.height
    const next = {
      ...vb,
      x: ds.vx - dx * scaleX,
      y: ds.vy - dy * scaleY,
    }
    vbRef.current = next
    setViewBox(next)
  }, [])

  const handleMouseUp = useCallback(() => {
    dragging.current = false
  }, [])

  // ===== 按钮缩放（以容器中心为锚点） =====
  const zoomAtCenter = useCallback((dir: 1 | -1) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const vb = vbRef.current

    const cx = vb.x + vb.w / 2
    const cy = vb.y + vb.h / 2
    const factor = dir > 0 ? 1 / ZOOM_STEP : ZOOM_STEP  // +按钮=放大=viewBox缩小
    let nw = vb.w * factor
    let nh = vb.h * factor
    const maxW = canvasRef.current.w
    const maxH = canvasRef.current.h
    if (nw > maxW / MIN_ZOOM) { nw = maxW / MIN_ZOOM; nh = maxH / MIN_ZOOM }
    if (nw < maxW / MAX_ZOOM) { nw = maxW / MAX_ZOOM; nh = maxH / MAX_ZOOM }

    const next = {
      x: cx - nw / 2,
      y: cy - nh / 2,
      w: nw,
      h: nh,
    }
    vbRef.current = next
    setViewBox(next)
  }, [])

  const zoomIn = useCallback(() => zoomAtCenter(1), [zoomAtCenter])
  const zoomOut = useCallback(() => zoomAtCenter(-1), [zoomAtCenter])

  const zoomReset = useCallback(() => {
    const cw = canvasRef.current.w
    const ch = canvasRef.current.h
    const next = { x: 0, y: 0, w: cw, h: ch }
    vbRef.current = next
    setViewBox(next)
  }, [])

  if (!root) {
    return <div className="text-xs text-gray-500 text-center py-8">暂无思维导图数据</div>
  }

  // 当前缩放百分比（相对于画布全貌）
  const zoomPct = viewBox.w > 0 ? Math.round((canvasSize.w / viewBox.w) * 100) : 100

  return (
    <div className="relative rounded-xl overflow-hidden border border-line/30 bg-code-bg">
      {/* 画布区域 */}
      <div
        ref={containerRef}
        className="cursor-grab select-none"
        style={{ width: '100%', height: CONTAINER_HEIGHT, overflow: 'hidden', touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          width="100%"
          height="100%"
          style={{ display: 'block' }}
          preserveAspectRatio="none"
        />
      </div>

      {/* 底部工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-code-header/80 border-t border-code-line">
        <span className="text-xs text-gray-400 select-none">
          滚轮缩放 · 拖拽平移
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="w-7 h-7 flex items-center justify-center rounded text-white bg-white/10 hover:bg-white/20 transition text-sm leading-none"
            title="缩小"
          >
            −
          </button>
          <button
            onClick={zoomReset}
            className="text-xs text-gray-300 bg-white/5 hover:bg-white/15 px-2 py-1 rounded transition min-w-[3rem]"
            title="重置缩放"
          >
            {zoomPct}%
          </button>
          <button
            onClick={zoomIn}
            className="w-7 h-7 flex items-center justify-center rounded text-white bg-white/10 hover:bg-white/20 transition text-sm leading-none"
            title="放大"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== 旧格式兼容解析 ====================

function parseMermaidToTree(mermaid: string): { root: string; children: TreeNode[] } {
  const lines = mermaid.split('\n').filter(l => l.trim() && !l.trim().startsWith('mindmap'))
  if (lines.length === 0) return { root: '未命名', children: [] }

  const rootLine = lines[0].trim()
  const rootMatch = rootLine.match(/root\(\((.+?)\)\)/)
  const rootText = rootMatch ? rootMatch[1] : rootLine

  const children: TreeNode[] = []
  for (let i = 1; i < lines.length; i++) {
    const text = lines[i].trim()
    if (text) children.push({ text, children: [] })
  }

  return { root: rootText, children }
}

// ==================== 布局算法（水平树） ====================

interface LayoutNode {
  text: string
  x: number
  y: number
  level: number
  leafCount: number
  width: number
  height: number
  children: LayoutNode[]
  colorIndex: number
}

const COL_WIDTH = 220
const ROW_GAP = 18
const NODE_PAD_Y = 10
const PAD_X = 30
const PAD_Y = 30

function measureNode(text: string, level: number): { w: number; h: number } {
  const fontSize = [20, 16, 14, 12][Math.min(level, 3)]
  const charWidth = fontSize * 0.95
  const textWidth = text.length * charWidth
  const w = Math.max(textWidth + 24, 60)
  const h = fontSize + NODE_PAD_Y * 2
  return { w, h }
}

function buildLayout(
  text: string,
  children: TreeNode[],
  level: number,
  colorIndex: number,
): LayoutNode {
  const { w, h } = measureNode(text, level)
  const node: LayoutNode = {
    text, x: 0, y: 0, level, leafCount: 0, width: w, height: h, children: [], colorIndex,
  }

  if (children.length === 0) {
    node.leafCount = 1
    return node
  }

  let leafSum = 0
  for (let i = 0; i < children.length; i++) {
    const childColor = level === 0 ? i : colorIndex
    const child = buildLayout(children[i].text, children[i].children, level + 1, childColor)
    node.children.push(child)
    leafSum += child.leafCount
  }
  node.leafCount = leafSum
  return node
}

function assignCoords(node: LayoutNode, x: number, yTop: number, rowUnit: number) {
  node.x = x + node.width / 2

  if (node.children.length === 0) {
    node.y = yTop + rowUnit / 2
    return
  }

  let cursor = yTop
  for (const child of node.children) {
    const span = child.leafCount * rowUnit
    assignCoords(child, x + COL_WIDTH, cursor, rowUnit)
    cursor += span
  }
  const first = node.children[0]
  const last = node.children[node.children.length - 1]
  node.y = (first.y + last.y) / 2
}

// ==================== SVG 渲染 ====================

function renderTree(svg: SVGSVGElement, root: { root: string; children: TreeNode[] }, theme: 'light' | 'dark'): { width: number; height: number } {
  while (svg.firstChild) svg.removeChild(svg.firstChild)

  const layoutRoot = buildLayout(root.root, root.children, 0, 0)

  let maxDepth = 0
  let maxNodeWidth = 0
  const queue: { node: LayoutNode; depth: number }[] = [{ node: layoutRoot, depth: 0 }]
  while (queue.length > 0) {
    const { node, depth } = queue.shift()!
    maxDepth = Math.max(maxDepth, depth)
    maxNodeWidth = Math.max(maxNodeWidth, node.width)
    for (const c of node.children) queue.push({ node: c, depth: depth + 1 })
  }

  let maxNodeHeight = 30
  const stack: LayoutNode[] = [layoutRoot]
  while (stack.length > 0) {
    const n = stack.pop()!
    maxNodeHeight = Math.max(maxNodeHeight, n.height)
    for (const c of n.children) stack.push(c)
  }
  const rowUnit = maxNodeHeight + ROW_GAP
  const totalHeight = layoutRoot.leafCount * rowUnit
  assignCoords(layoutRoot, PAD_X, PAD_Y, rowUnit)

  const canvasW = (maxDepth + 1) * COL_WIDTH + maxNodeWidth + PAD_X * 2
  const canvasH = totalHeight + PAD_Y * 2

  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bg.setAttribute('width', String(canvasW))
  bg.setAttribute('height', String(canvasH))
  bg.setAttribute('fill', 'transparent')
  svg.appendChild(bg)

  drawConnections(svg, layoutRoot)
  drawNodes(svg, layoutRoot, theme)

  return { width: canvasW, height: canvasH }
}

function drawConnections(svg: SVGSVGElement, node: LayoutNode) {
  for (const child of node.children) {
    drawHorizontalCurve(
      svg,
      node.x + node.width / 2, node.y,
      child.x - child.width / 2, child.y,
      COLORS[child.colorIndex % COLORS.length],
      child.level,
    )
    drawConnections(svg, child)
  }
}

function drawNodes(svg: SVGSVGElement, node: LayoutNode, theme: 'light' | 'dark') {
  drawNode(svg, node, theme)
  for (const child of node.children) drawNodes(svg, child, theme)
}

function drawNode(svg: SVGSVGElement, node: LayoutNode, theme: 'light' | 'dark') {
  const { x, y, text, width: w, height: h, level, colorIndex } = node
  const isRoot = level === 0
  const fontSize = [20, 16, 14, 12][Math.min(level, 3)]
  const fill = isRoot ? '#3b82f6' : COLORS[colorIndex % COLORS.length]
  const rx = isRoot ? '14' : '8'

  const left = x - w / 2
  const top = y - h / 2

  const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  shadow.setAttribute('x', String(left + 2))
  shadow.setAttribute('y', String(top + 2))
  shadow.setAttribute('width', String(w))
  shadow.setAttribute('height', String(h))
  shadow.setAttribute('rx', rx)
  shadow.setAttribute('fill', theme === 'dark' ? '#00000022' : '#0f172a1f')
  svg.appendChild(shadow)

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('x', String(left))
  rect.setAttribute('y', String(top))
  rect.setAttribute('width', String(w))
  rect.setAttribute('height', String(h))
  rect.setAttribute('rx', rx)
  rect.setAttribute('fill', fill)
  rect.setAttribute('stroke', fill)
  rect.setAttribute('stroke-width', isRoot ? '2' : '1')
  svg.appendChild(rect)

  const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  txt.setAttribute('x', String(x))
  txt.setAttribute('y', String(y + fontSize / 3))
  txt.setAttribute('text-anchor', 'middle')
  txt.setAttribute('fill', '#fff')
  txt.setAttribute('font-size', String(fontSize))
  txt.setAttribute('font-weight', isRoot ? '700' : '500')
  txt.setAttribute('font-family', 'system-ui, sans-serif')
  txt.textContent = text
  svg.appendChild(txt)
}

function drawHorizontalCurve(
  svg: SVGSVGElement,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  level: number,
) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const dx = x2 - x1
  const cx1 = x1 + dx * 0.5
  const cx2 = x2 - dx * 0.5
  const d = `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`

  path.setAttribute('d', d)
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', color)
  path.setAttribute('stroke-width', String(Math.max(2.5 - level * 0.4, 1)))
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('opacity', String(Math.max(0.85 - level * 0.12, 0.4)))
  svg.appendChild(path)
}
