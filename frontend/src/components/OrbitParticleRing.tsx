/**
 * 粒子环 — 果冻弹性 + 持续排斥力场 + 边界柔化
 * rotateX(75deg) + rotate(-15deg) 透视投影
 */
import { useEffect, useRef } from 'react'

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

export default function OrbitParticleRing() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const sizeRef = useRef({ w: 0, h: 0 })
  const repelRef = useRef<RepelState>({ x: 0, y: 0, life: 0 })
  const animRef = useRef(0)

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

    // 点击 → 激活排斥力场（初始 life=1，逐帧衰减）
    const onClick = (e: MouseEvent) => {
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
            // 平滑衰减：t² 曲线（果冻凹陷形状）
            const t = 1 - distR / REPEL_RADIUS
            const strength = t * t * repel.life * REPEL_FORCE * dt

            // 推离方向：沿屏幕径向推开（增大盘面 r）
            p.vr += strength * 0.025
            // 轻微切向扰动（让推开更自然）
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

        // —— 绘制 ——
        const zNorm = (zTilt + MAX_Z) / (2 * MAX_Z)
        const alpha = 0.04 + 0.96 * zNorm
        const size = (0.2 + 0.4 * zNorm)

        // 轨迹：从上一帧位置到当前位置画线
        if (!isNaN(p.prevSx)) {
          ctx.beginPath()
          ctx.moveTo(p.prevSx, p.prevSy)
          ctx.lineTo(sx, sy)
          ctx.strokeStyle = `hsla(${p.h}, ${p.s}%, ${p.l}%, ${alpha * 0.3})`
          ctx.lineWidth = size * scale * 0.7
          ctx.stroke()
        }
        p.prevSx = sx
        p.prevSy = sy

        const hoverDist = HOVER_RADIUS * scale
        const dx = sx - mx
        const dy = sy - my
        const hovered = Math.sqrt(dx * dx + dy * dy) < hoverDist

        if (hovered) {
          const glowSize = 10 * scale
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowSize)
          glow.addColorStop(0, `hsla(${p.h}, 100%, 80%, 0.9)`)
          glow.addColorStop(0.5, `hsla(${p.h}, 80%, 60%, 0.3)`)
          glow.addColorStop(1, 'transparent')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(sx, sy, glowSize, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(sx, sy, 2.5 * scale, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = `hsla(${p.h}, ${p.s}%, ${p.l}%, ${alpha})`
          ctx.beginPath()
          ctx.arc(sx, sy, size * scale, 0, Math.PI * 2)
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
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[1] pointer-events-none"
      style={{ background: 'transparent' }}
    />
  )
}
