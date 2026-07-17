/**
 * 知识图谱 SVG 组件 — C++ 算法课程体系可视化
 * 展示课程模块之间的前置依赖关系
 * 纯 SVG + CSS 动画实现
 */
import { CURRICULUM_MODULES } from '../services/curriculum'
import { useState } from 'react'

interface KnowledgeGraphProps {
  width?: number
  height?: number
  className?: string
}

export default function KnowledgeGraph({ width = 760, height = 520, className = '' }: KnowledgeGraphProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  // 课程模块节点布局（分层布局）
  const layers = [
    { y: 60, modules: ['cpp-basics'] },
    { y: 140, modules: ['arrays-strings', 'pointers-memory', 'functions-recursion'] },
    { y: 220, modules: ['structs-classes', 'stl', 'basic-ds'] },
    { y: 300, modules: ['sorting-search', 'backtracking', 'greedy'] },
    { y: 380, modules: ['dp', 'search', 'graph'] },
    { y: 460, modules: ['advanced-ds', 'strings', 'number-theory', 'contest'] },
  ]

  const getNodePos = (moduleId: string): { x: number; y: number } | null => {
    for (const layer of layers) {
      const idx = layer.modules.indexOf(moduleId)
      if (idx !== -1) {
        const totalW = width - 100
        const x = 50 + (totalW / (layer.modules.length + 1)) * (idx + 1)
        return { x, y: layer.y }
      }
    }
    return null
  }

  // 前置依赖关系（模块A → 模块B 表示 A是B的前置）
  const dependencies: [string, string][] = [
    ['cpp-basics', 'arrays-strings'],
    ['cpp-basics', 'pointers-memory'],
    ['cpp-basics', 'functions-recursion'],
    ['arrays-strings', 'sorting-search'],
    ['pointers-memory', 'basic-ds'],
    ['functions-recursion', 'backtracking'],
    ['stl', 'basic-ds'],
    ['basic-ds', 'advanced-ds'],
    ['sorting-search', 'greedy'],
    ['backtracking', 'search'],
    ['backtracking', 'dp'],
    ['greedy', 'dp'],
    ['search', 'graph'],
    ['graph', 'advanced-ds'],
    ['dp', 'contest'],
    ['graph', 'contest'],
    ['advanced-ds', 'contest'],
    ['strings', 'contest'],
    ['number-theory', 'contest'],
  ]

  const nodeRadius = 16

  return (
    <div className={`relative ${className}`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#4b5563" />
          </marker>
          <filter id="nodeShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>

        {/* 依赖连线 */}
        {dependencies.map(([fromId, toId]) => {
          const fromPos = getNodePos(fromId)
          const toPos = getNodePos(toId)
          if (!fromPos || !toPos) return null
          const isActive = hovered === fromId || hovered === toId
          return (
            <line
              key={`${fromId}-${toId}`}
              x1={fromPos.x} y1={fromPos.y}
              x2={toPos.x} y2={toPos.y}
              stroke={isActive ? '#6366f1' : '#e2e8f0'}
              strokeWidth={isActive ? 1.5 : 0.8}
              markerEnd="url(#arrowhead)"
              className="transition-all duration-300"
            />
          )
        })}

        {/* 课程节点 */}
        {CURRICULUM_MODULES.map((mod) => {
          const pos = getNodePos(mod.id)
          if (!pos) return null
          const isActive = hovered === mod.id

          return (
            <g
              key={mod.id}
              onMouseEnter={() => setHovered(mod.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              {/* 背景圆 */}
              <circle
                cx={pos.x} cy={pos.y}
                r={isActive ? nodeRadius + 4 : nodeRadius}
                fill={isActive ? '#1e1b4b' : '#16162a'}
                stroke={isActive ? '#6366f1' : '#cbd5e1'}
                strokeWidth={isActive ? 2 : 1}
                filter="url(#nodeShadow)"
                className="transition-all duration-200"
              />
              {/* 图标 */}
              <text
                x={pos.x} y={pos.y + 5}
                textAnchor="middle"
                className="text-sm pointer-events-none"
              >
                {mod.icon}
              </text>
              {/* 标签 */}
              <text
                x={pos.x} y={pos.y + nodeRadius + 16}
                textAnchor="middle"
                className={`text-[10px] pointer-events-none transition-colors duration-200 ${isActive ? 'fill-primary-600 font-semibold' : 'fill-gray-500'}`}
              >
                {mod.name}
              </text>
              {/* 资源数 */}
              {mod.resourceIds.length > 0 && (
                <text
                  x={pos.x} y={pos.y + nodeRadius + 28}
                  textAnchor="middle"
                  className="text-[9px] fill-gray-300 pointer-events-none"
                >
                  {mod.resourceIds.length}个资源
                </text>
              )}
            </g>
          )
        })}

        {/* 标题 */}
        <text x={width / 2} y={18} textAnchor="middle" className="text-xs font-medium" fill="#6b7280">
          C++ 算法课程体系 — 模块前置依赖关系
        </text>
      </svg>

      {/* 悬浮提示 */}
      {hovered && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-surface-100/90 backdrop-blur border border-gray-700/30 rounded-lg px-3 py-2 shadow-md text-xs text-gray-300">
          {(() => {
            const mod = CURRICULUM_MODULES.find((m) => m.id === hovered)
            if (!mod) return null
            return (
              <>
                <span className="font-semibold text-gray-800">
                  第{mod.chapter}章 {mod.icon} {mod.name}
                </span>
                <span className="text-gray-400 ml-2">{mod.desc}</span>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
