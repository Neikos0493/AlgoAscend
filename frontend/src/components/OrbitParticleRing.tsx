/**
 * 粒子环 — 果冻弹性 + 持续排斥力场 + 边界柔化 + 点击聚焦随机出题
 * rotateX(75deg) + rotate(-15deg) 透视投影
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getRandomProblem, type RandomProblem } from '../services/randomProblem'

// ===== 参数 =====
const PARTICLE_COUNT = 3500
const HOVER_RADIUS = 18
const RING_OUTER = 750
const TILT_DEG = 75
const ROTATE_DEG = -15
const VIEW_DIST = 1500
const SPRING_K = 2.5          // 软弹簧（果冻感）
const DAMPING = 0.92          // 高阻尼、少震荡
const REPEL_RADIUS = 180      // 排斥半径
const REPEL_FORCE = 400       // 每帧最大力（连续衰减）
const REPEL_DECAY = 0.85      // 力场每帧衰减（60fps基准）
const BAND_SPREAD = 0.04      // 环带边界溢出比例
const PARTICLE_HIT_RADIUS = 18
const FOCUS_ZOOM = 8

// 投影常量
const tiltRad = TILT_DEG * Math.PI / 180
const COS_T = Math.cos(tiltRad)
const SIN_T = Math.sin(tiltRad)
const rotRad = ROTATE_DEG * Math.PI / 180
const COS_R = Math.cos(rotRad)
const SIN_R = Math.sin(rotRad)
const MAX_Z = RING_OUTER * SIN_T

// 环带
const BANDS = [
  { from: 0.18, to: 0.32, weight: 0.8 },
  { from: 0.40, to: 0.58, weight: 1.5 },
  { from: 0.66, to: 0.76, weight: 0.9 },
  { from: 0.82, to: 1.00, weight: 0.6 },
]
const TOTAL_WEIGHT = BANDS.reduce((s, b) => s + b.weight, 0)

interface Particle {
  targetR: number
  targetTheta: number
  r: number
  theta: number
  speed: number
  vr: number
  vTheta: number
  h: number
  s: number
  l: number
  prevSx: number   // 上一帧屏幕坐标（轨迹）
  prevSy: number
}

interface RepelState {
  x: number
  y: number
  life: number  // 0~1，衰减到 0 后失效
}

interface OrbitParticleRingProps {
  enabled?: boolean
  onFocusChange?: (focused: boolean) => void
}

function project(
  r: number, theta: number, cx: number, cy: number
): { sx: number; sy: number; zTilt: number; scale: number } {
  const x3d = r * Math.cos(theta)
  const y3d = r * Math.sin(theta)
  const yTilt = y3d * COS_T
  const zTilt = y3d * SIN_T
  const scale = VIEW_DIST / (VIEW_DIST - zTilt)
  const rx = (x3d * COS_R - yTilt * SIN_R) * scale
  const ry = (x3d * SIN_R + yTilt * COS_R) * scale
  return { sx: cx + rx, sy: cy + ry, zTilt, scale }
}

export default function OrbitParticleRing({ enabled = true, onFocusChange }: OrbitParticleRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const sizeRef = useRef({ w: 0, h: 0 })
  const repelRef = useRef<RepelState>({ x: 0, y: 0, life: 0 })
  const animRef = useRef(0)
  const selectedRef = useRef<Particle | null>(null)
  const focusRef = useRef(false)
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 })
  const cameraTransitionRef = useRef({
    active: false,
    startTime: 0,
    duration: 850,
    fromX: 0,
    fromY: 0,
  })
  const requestRef = useRef(0)
  const [focused, setFocused] = useState(false)
  const [problem, setProblem] = useState<RandomProblem | null>(null)
  const [problemLoading, setProblemLoading] = useState(false)

  const loadProblem = useCallback(async () => {
    const requestId = ++requestRef.current
    setProblemLoading(true)
    try {
      const next = await getRandomProblem()
      if (requestId === requestRef.current) setProblem(next)
    } finally {
      if (requestId === requestRef.current) setProblemLoading(false)
    }
  }, [])

  const exitFocus = useCallback(() => {
    requestRef.current += 1
    focusRef.current = false
    selectedRef.current = null
    cameraTransitionRef.current.active = false
    setFocused(false)
    setProblem(null)
    setProblemLoading(false)
    onFocusChange?.(false)
  }, [onFocusChange])

  const enterFocus = useCallback((particle: Particle) => {
    selectedRef.current = particle
    focusRef.current = true
    cameraRef.current = {
      x: Number.isFinite(particle.prevSx) ? particle.prevSx : window.innerWidth / 2,
      y: Number.isFinite(particle.prevSy) ? particle.prevSy : window.innerHeight / 2,
      zoom: 1,
    }
    cameraTransitionRef.current.active = false
    setFocused(true)
    onFocusChange?.(true)
    void loadProblem()
  }, [loadProblem, onFocusChange])

  const jumpToRandomParticle = useCallback(() => {
    const current = selectedRef.current
    const camera = cameraRef.current
    const minDistance = Math.min(window.innerWidth, window.innerHeight) * 0.28
    const available = particlesRef.current.filter((particle) => {
      if (particle === current || !Number.isFinite(particle.prevSx) || !Number.isFinite(particle.prevSy)) return false
      const dx = particle.prevSx - camera.x
      const dy = particle.prevSy - camera.y
      return Math.sqrt(dx * dx + dy * dy) >= minDistance
    })
    const candidates = available.length > 0
      ? available
      : particlesRef.current.filter((particle) => particle !== current && Number.isFinite(particle.prevSx))
    if (candidates.length === 0) return

    const nextParticle = candidates[Math.floor(Math.random() * candidates.length)]
    cameraTransitionRef.current = {
      active: true,
      startTime: performance.now(),
      duration: 850,
      fromX: camera.x,
      fromY: camera.y,
    }
    selectedRef.current = nextParticle
  }, [])

  const changeProblemAndParticle = useCallback(() => {
    jumpToRandomParticle()
    void loadProblem()
  }, [jumpToRandomParticle, loadProblem])

  useEffect(() => {
    if (!enabled && focusRef.current) exitFocus()
  }, [enabled, exitFocus])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && focusRef.current) exitFocus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [exitFocus])

  // 初始化粒子（边界柔化）
  useEffect(() => {
    const ps: Particle[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let frac: number

      // 8% 离群粒子，大范围散布
      if (Math.random() < 0.08) {
        frac = 0.12 + Math.random() * 0.90
      } else {
        // 92% 正常环带粒子，允许轻微溢出边界
        let bandRand = Math.random() * TOTAL_WEIGHT
        let band = BANDS[0]
        let accum = 0
        for (const b of BANDS) {
          accum += b.weight
          if (bandRand <= accum) { band = b; break }
        }
        frac = (band.from - BAND_SPREAD) + Math.random() * (band.to - band.from + 2 * BAND_SPREAD)
      }

      const r = Math.max(30, Math.min(RING_OUTER * 1.05, frac * RING_OUTER))
      const speedNorm = Math.max(0, Math.min(1, 1 - (frac - 0.12) / 0.90))
      ps.push({
        targetR: r,
        targetTheta: Math.random() * Math.PI * 2,
        r,
        theta: Math.random() * Math.PI * 2,
        speed: 0.002 + speedNorm * 0.006,
        vr: 0,
        vTheta: 0,
        h: Math.random() * 360,
        s: 70 + Math.random() * 30,
        l: 45 + Math.random() * 20,
        prevSx: NaN,
        prevSy: NaN,
      })
    }
    particlesRef.current = ps
  }, [])

  // 动画循环
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      sizeRef.current.w = canvas.width = window.innerWidth
      sizeRef.current.h = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove)

    // 首页点击命中粒子后进入镜头跟随；未命中时保留原来的果冻排斥反馈。
    const onClick = (e: MouseEvent) => {
      if (focusRef.current || !enabled) return

      const target = e.target as HTMLElement | null
      if (target?.closest('button, a, input, textarea, select, [role="button"], [data-particle-ui]')) return

      let nearest: Particle | null = null
      let nearestDistance = Number.POSITIVE_INFINITY
      for (const particle of particlesRef.current) {
        if (!Number.isFinite(particle.prevSx) || !Number.isFinite(particle.prevSy)) continue
        const dx = particle.prevSx - e.clientX
        const dy = particle.prevSy - e.clientY
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < nearestDistance) {
          nearest = particle
          nearestDistance = distance
        }
      }

      if (nearest && nearestDistance <= PARTICLE_HIT_RADIUS) {
        enterFocus(nearest)
        return
      }

      repelRef.current = { x: e.clientX, y: e.clientY, life: 1 }
    }
    window.addEventListener('click', onClick)

    let lastTime = performance.now()

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      const { w, h } = sizeRef.current
      ctx.clearRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      const dampFactor = Math.pow(DAMPING, dt * 60)

      // 排斥力场衰减
      const repel = repelRef.current
      const repelActive = repel.life > 0.001
      if (repelActive) {
        repel.life *= Math.pow(REPEL_DECAY, dt * 60)
      }

      const trackedParticle = selectedRef.current
      const focusActive = focusRef.current && trackedParticle !== null
      const camera = cameraRef.current
      if (focusActive && trackedParticle) {
        const trackedPosition = project(trackedParticle.r, trackedParticle.theta, cx, cy)
        const transition = cameraTransitionRef.current
        const zoomEase = 1 - Math.exp(-4.5 * dt)
        if (transition.active) {
          const progress = Math.min(1, (now - transition.startTime) / transition.duration)
          const eased = 1 - Math.pow(1 - progress, 3)
          camera.x = transition.fromX + (trackedPosition.sx - transition.fromX) * eased
          camera.y = transition.fromY + (trackedPosition.sy - transition.fromY) * eased
          if (progress >= 1) transition.active = false
        } else {
          camera.x = trackedPosition.sx
          camera.y = trackedPosition.sy
        }
        camera.zoom += (FOCUS_ZOOM - camera.zoom) * zoomEase
      }

      for (const p of particlesRef.current) {
        // —— 轨道运动 ——
        p.targetTheta -= p.speed * dt * 60
        if (p.targetTheta < -Math.PI * 2) p.targetTheta += Math.PI * 2
        if (p.targetTheta > Math.PI * 2) p.targetTheta -= Math.PI * 2

        // —— 投影（排斥力需要屏幕坐标）——
        const { sx, sy, zTilt, scale } = project(p.r, p.theta, cx, cy)

        // —— 持续排斥力（果冻挤压）——
        if (repelActive) {
          const dxR = sx - repel.x
          const dyR = sy - repel.y
          const distR = Math.sqrt(dxR * dxR + dyR * dyR)

          if (distR < REPEL_RADIUS && distR > 0.1) {
            const t = 1 - distR / REPEL_RADIUS
            const strength = t * t * repel.life * REPEL_FORCE * dt
            p.vr += strength * 0.025
            p.vTheta += (Math.random() - 0.5) * strength * 0.003
          }
        }

        // —— 弹簧力拉回目标 ——
        const dR = p.targetR - p.r
        let dT = p.targetTheta - p.theta
        if (dT > Math.PI) dT -= Math.PI * 2
        if (dT < -Math.PI) dT += Math.PI * 2

        p.vr += dR * SPRING_K * dt
        p.vTheta += dT * SPRING_K * dt

        // —— 积分 ——
        p.r += p.vr * dt
        p.theta += p.vTheta * dt

        // —— 阻尼 ——
        p.vr *= dampFactor
        p.vTheta *= dampFactor

        // —— 绘制（专注模式下以被选粒子为镜头中心）——
        const zNorm = (zTilt + MAX_Z) / (2 * MAX_Z)
        const alpha = 0.04 + 0.96 * zNorm
        const size = (0.2 + 0.4 * zNorm)
        const renderSx = focusActive ? (sx - camera.x) * camera.zoom + cx : sx
        const renderSy = focusActive ? (sy - camera.y) * camera.zoom + cy : sy
        const renderScale = scale * (focusActive ? camera.zoom : 1)

        // 轨迹
        if (!isNaN(p.prevSx)) {
          const prevRenderSx = focusActive ? (p.prevSx - camera.x) * camera.zoom + cx : p.prevSx
          const prevRenderSy = focusActive ? (p.prevSy - camera.y) * camera.zoom + cy : p.prevSy
          ctx.beginPath()
          ctx.moveTo(prevRenderSx, prevRenderSy)
          ctx.lineTo(renderSx, renderSy)
          ctx.strokeStyle = `hsla(${p.h}, ${p.s}%, ${p.l}%, ${alpha * 0.3})`
          ctx.lineWidth = Math.min(3, size * renderScale * 0.7)
          ctx.stroke()
        }
        p.prevSx = sx
        p.prevSy = sy

        const hoverDist = HOVER_RADIUS * scale
        const dx = sx - mx
        const dy = sy - my
        const hovered = !focusActive && Math.sqrt(dx * dx + dy * dy) < hoverDist
        const selected = focusActive && p === trackedParticle

        if (selected) {
          const pulse = 1 + Math.sin(now * 0.004) * 0.08
          const glowSize = 42 * pulse
          const glow = ctx.createRadialGradient(renderSx, renderSy, 0, renderSx, renderSy, glowSize)
          glow.addColorStop(0, `hsla(${p.h}, 100%, 92%, 1)`)
          glow.addColorStop(0.18, `hsla(${p.h}, 100%, 72%, 0.9)`)
          glow.addColorStop(0.52, `hsla(${p.h}, 90%, 58%, 0.28)`)
          glow.addColorStop(1, 'transparent')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(renderSx, renderSy, glowSize, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = '#ffffff'
          ctx.shadowColor = `hsla(${p.h}, 100%, 70%, 1)`
          ctx.shadowBlur = 24
          ctx.beginPath()
          ctx.arc(renderSx, renderSy, 7 * pulse, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        } else if (hovered) {
          const glowSize = 10 * scale
          const glow = ctx.createRadialGradient(renderSx, renderSy, 0, renderSx, renderSy, glowSize)
          glow.addColorStop(0, `hsla(${p.h}, 100%, 80%, 0.9)`)
          glow.addColorStop(0.5, `hsla(${p.h}, 80%, 60%, 0.3)`)
          glow.addColorStop(1, 'transparent')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(renderSx, renderSy, glowSize, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(renderSx, renderSy, 2.5 * scale, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = `hsla(${p.h}, ${p.s}%, ${p.l}%, ${alpha})`
          ctx.beginPath()
          ctx.arc(renderSx, renderSy, Math.min(4, size * renderScale), 0, Math.PI * 2)
          ctx.fill()
        }
      }

      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onClick)
    }
  }, [enabled, enterFocus])

  return (
    <>
      <div
        className={`fixed inset-0 pointer-events-none transition-all duration-500 ${focused ? 'z-30 bg-[#05050c]/90 backdrop-blur-[2px]' : 'z-0 bg-transparent'}`}
      />
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 pointer-events-none transition-[z-index] ${focused ? 'z-40' : 'z-[1]'}`}
        style={{ background: 'transparent' }}
        aria-label="可交互粒子轨道"
      />

      {focused && (
        <div className="fixed inset-0 z-50 pointer-events-none" data-particle-ui>
          <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-cyan-300/20 bg-black/35 px-3 py-2 text-xs text-cyan-100/70 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
            镜头正在跟踪选中粒子
          </div>

          <button
            type="button"
            onClick={exitFocus}
            className="pointer-events-auto absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 text-xl text-white/70 backdrop-blur-xl transition hover:border-white/30 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
            aria-label="退出粒子专注模式"
            title="退出（Esc）"
          >
            ×
          </button>

          <section
            className="pointer-events-auto absolute bottom-5 left-1/2 w-[min(92vw,390px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#0b1020]/85 shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-2xl sm:bottom-8 sm:left-auto sm:right-8 sm:translate-x-0"
            aria-live="polite"
          >
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/70">Random challenge</p>
                  <h2 className="mt-1 text-base font-semibold text-white">随机一题</h2>
                </div>
                <button
                  type="button"
                  onClick={changeProblemAndParticle}
                  disabled={problemLoading}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-wait disabled:opacity-50"
                >
                  换一题
                </button>
              </div>

              {problemLoading && !problem ? (
                <div className="space-y-3 py-2">
                  <div className="h-5 w-4/5 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-2/5 animate-pulse rounded bg-white/[0.07]" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-white/[0.07]" />
                </div>
              ) : problem ? (
                <div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xl" aria-hidden="true">{problem.platform_icon || '💻'}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold leading-6 text-gray-100">{problem.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-[11px] text-cyan-200">{problem.platform_name}</span>
                        <span className="rounded-full bg-violet-300/10 px-2 py-0.5 text-[11px] text-violet-200">{problem.difficulty}</span>
                        {problem.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex w-full items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/20 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                  >
                    打开原题 <span className="ml-1" aria-hidden="true">↗</span>
                  </a>
                </div>
              ) : (
                <p className="py-3 text-sm text-gray-400">题目加载失败，请点击"换一题"重试。</p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
