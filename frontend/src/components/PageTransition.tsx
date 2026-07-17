/**
 * 页面切换过渡动画 — 淡入 + 上滑效果
 */
import { useEffect, useState, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  pageKey: string  // 用于触发动画的 key
}

export default function PageTransition({ children, pageKey }: Props) {
  const [displayed, setDisplayed] = useState(pageKey)
  const [phase, setPhase] = useState<'enter' | 'active'>('enter')

  useEffect(() => {
    if (displayed !== pageKey) {
      // 换页：先触发离开动画（隐式），然后更新内容并触发进入动画
      setPhase('enter')
      const t1 = setTimeout(() => {
        setDisplayed(pageKey)
        // 触发进入动画
        requestAnimationFrame(() => {
          setPhase('active')
        })
      }, 150)
      return () => clearTimeout(t1)
    } else {
      // 首次渲染
      const t = setTimeout(() => setPhase('active'), 50)
      return () => clearTimeout(t)
    }
  }, [pageKey])

  return (
    <div
      key={displayed}
      className="flex-1 flex flex-col overflow-hidden"
      style={{
        opacity: phase === 'enter' ? 0 : 1,
        transform: phase === 'enter' ? 'translateY(12px)' : 'translateY(0)',
        transition: 'opacity 0.25s ease-out, transform 0.3s ease-out',
      }}
    >
      {children}
    </div>
  )
}
