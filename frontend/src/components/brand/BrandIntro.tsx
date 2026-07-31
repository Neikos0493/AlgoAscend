import { useEffect, useRef, useState } from 'react'
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion'
import BrandMark from './BrandMark'
import { BRAND_INTRO_DURATION, getBrandMotionFrame } from './brandMotion'
import './brand.css'

interface BrandIntroProps {
  className?: string
  completed?: boolean
  onComplete?: () => void
}

export default function BrandIntro({ className = '', completed = false, onComplete }: BrandIntroProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [time, setTime] = useState(completed || prefersReducedMotion ? BRAND_INTRO_DURATION : 0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (completed) {
      setTime(BRAND_INTRO_DURATION)
      return
    }

    const finish = () => {
      setTime(BRAND_INTRO_DURATION)
      if (!completedRef.current) {
        completedRef.current = true
        onCompleteRef.current?.()
      }
    }

    if (prefersReducedMotion) {
      const animationFrame = window.requestAnimationFrame(finish)
      return () => window.cancelAnimationFrame(animationFrame)
    }

    let animationFrame = 0
    let startTime: number | undefined
    let hiddenAt: number | undefined

    const tick = (timestamp: number) => {
      if (startTime === undefined) startTime = timestamp
      const elapsed = timestamp - startTime

      if (elapsed < BRAND_INTRO_DURATION) {
        setTime(elapsed)
        animationFrame = window.requestAnimationFrame(tick)
      } else {
        finish()
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = performance.now()
        window.cancelAnimationFrame(animationFrame)
        return
      }

      if (hiddenAt !== undefined && startTime !== undefined) {
        startTime += performance.now() - hiddenAt
      }
      hiddenAt = undefined
      animationFrame = window.requestAnimationFrame(tick)
    }

    setTime(0)
    animationFrame = window.requestAnimationFrame(tick)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [completed, prefersReducedMotion])

  return (
    <div className={`brand-intro ${className}`.trim()} data-complete={time >= BRAND_INTRO_DURATION}>
      <BrandMark frame={getBrandMotionFrame(time)} fullScene />
    </div>
  )
}
