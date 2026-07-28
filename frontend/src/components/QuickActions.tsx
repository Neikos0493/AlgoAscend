import { useRef, useState } from 'react'
import { AppIcon } from './Icon'

interface Action {
  icon: string
  label: string
  prompt: string
  key: string
}

const allActions: Action[] = [
  { key: 'mindmap', icon: '🧠', label: '生成思维导图', prompt: '请为我生成关于「排序算法」的思维导图' },
  { key: 'exercise', icon: '🏋️', label: '出几道练习题', prompt: '请为我出几道关于数组和字符串的练习题，基础难度' },
  { key: 'path', icon: '🗺️', label: '规划学习路径', prompt: '请帮我规划一个完整的C++算法学习路径' },
  { key: 'assess', icon: '📊', label: '评估学习效果', prompt: '请帮我评估一下目前的学习效果，给出改进建议' },
  { key: 'code_case', icon: '💻', label: '生成代码案例', prompt: '请生成一个关于二分查找的完整代码实操案例' },
  { key: 'image', icon: '🎨', label: 'AI 生成图片', prompt: '请为我生成一张讲解快速排序算法的示意图，蓝色背景，简洁风格' },
  { key: 'ppt', icon: '📊', label: 'AI 生成PPT', prompt: '请帮我生成一个关于动态规划的PPT课件，包含算法原理、代码实现、时间复杂度分析' },
  { key: 'video', icon: '🎬', label: 'AI 生成视频', prompt: '请为我生成冒泡排序的算法动画视频' },
  { key: 'project', icon: '🏗️', label: '生成项目案例', prompt: '请为我设计一个完整的多线程LRU缓存项目，包含代码实现和讲解' },
]

const STORAGE_KEY = 'algoascend_action_freq'

function loadFreq(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}')
  } catch { return {} }
}

function saveFreq(freq: Record<string, number>) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(freq)) } catch {}
}

function bumpFreq(key: string): Record<string, number> {
  const freq = loadFreq()
  freq[key] = (freq[key] || 0) + 1
  saveFreq(freq)
  return freq
}

function sortByFreq(actions: Action[], freq: Record<string, number>): Action[] {
  return [...actions].sort((a, b) => (freq[b.key] || 0) - (freq[a.key] || 0))
}

export default function QuickActions({ onFill }: { onFill: (text: string) => void }) {
  const [freq, setFreq] = useState<Record<string, number>>(() => loadFreq())
  const containerRef = useRef<HTMLDivElement>(null)
  const sorted = sortByFreq(allActions, freq)

  const handleClick = (action: Action) => {
    const updated = bumpFreq(action.key)
    setFreq(updated)
    onFill(action.prompt)
  }

  const handleWheel = (e: React.WheelEvent) => {
    const el = containerRef.current
    if (el) {
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="overflow-x-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
        {sorted.map((action) => (
          <button
            key={action.key}
            onClick={() => handleClick(action)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-300/50 border border-gray-600/50 rounded-full text-xs text-gray-400 hover:border-primary-300 hover:text-primary-300 hover:bg-primary-50 transition-all duration-200 shadow-sm whitespace-nowrap shrink-0"
          >
            <AppIcon name={action.icon} size={13} />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
