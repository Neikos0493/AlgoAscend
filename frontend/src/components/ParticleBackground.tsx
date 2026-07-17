import { useCallback, useEffect, useState } from 'react'
import Particles from '@tsparticles/react'
import { type Container, tsParticles } from '@tsparticles/engine'
import { loadSlim } from '@tsparticles/slim'

export default function ParticleBackground() {
  const [ready, setReady] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  useEffect(() => {
    loadSlim(tsParticles).then(() => setReady(true))
  }, [])

  // 全局鼠标追踪
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const particlesLoaded = useCallback(async (_container?: Container) => {}, [])

  if (!ready) return null

  return (
    <>
      {/* 动态渐变光晕背景 — 跟随鼠标 */}
      <div
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{
          background: `
            radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, rgba(0,240,255,0.06) 0%, transparent 50%),
            radial-gradient(800px circle at ${100 - mousePos.x}% ${100 - mousePos.y}%, rgba(168,85,247,0.05) 0%, transparent 50%),
            radial-gradient(400px circle at 50% 50%, rgba(99,102,241,0.04) 0%, transparent 60%)
          `,
        }}
      />

      {/* 主粒子系统 */}
      <Particles
        id="tsparticles"
        className="fixed inset-0 -z-10"
        particlesLoaded={particlesLoaded}
        options={{
          fullScreen: false,
          fpsLimit: 60,
          particles: {
            number: {
              value: 120,
              density: { enable: true, width: 1920, height: 1080 },
            },
            color: {
              value: [
                '#00f0ff', '#22d3ee', '#38bdf8',
                '#a855f7', '#c084fc', '#8b5cf6',
                '#6366f1', '#818cf8',
                '#f472b6', '#fb7185',
              ],
            },
            shape: {
              type: ['circle', 'triangle', 'polygon'],
              options: {
                polygon: { sides: 6 },
              },
            },
            opacity: {
              value: { min: 0.1, max: 0.7 },
              animation: {
                enable: true,
                speed: { min: 0.3, max: 1.2 },
                sync: false,
                mode: 'auto',
                startValue: 'random',
              },
            },
            size: {
              value: { min: 1, max: 4 },
              animation: {
                enable: true,
                speed: { min: 0.5, max: 2 },
                sync: false,
                mode: 'auto',
                startValue: 'random',
                destroy: 'none',
              },
            },
            move: {
              enable: true,
              speed: { min: 0.2, max: 1.5 },
              direction: 'none',
              random: true,
              straight: false,
              outModes: { default: 'bounce' },
            },
            links: {
              enable: true,
              distance: 140,
              color: 'random',
              opacity: 0.12,
              width: 0.6,
              triangles: {
                enable: true,
                color: '#6366f1',
                opacity: 0.04,
              },
            },
          },
          interactivity: {
            detectsOn: 'window',
            events: {
              onHover: {
                enable: true,
                mode: ['grab', 'bubble', 'repulse'],
                parallax: {
                  enable: true,
                  force: 40,
                  smooth: 10,
                },
              },
              onClick: {
                enable: true,
                mode: 'push',
              },
              resize: { enable: true },
            },
            modes: {
              grab: {
                distance: 200,
                links: {
                  opacity: 0.5,
                  color: '#00f0ff',
                  blink: true,
                  consent: true,
                },
              },
              bubble: {
                distance: 250,
                size: 8,
                duration: 0.3,
                opacity: 0.8,
                color: { value: ['#a855f7', '#f472b6', '#00f0ff'] },
              },
              repulse: {
                distance: 100,
                duration: 0.4,
                speed: 3,
              },
              push: {
                quantity: 6,
                // 点击时从鼠标位置喷射彩色粒子
              },
              remove: {
                quantity: 2,
              },
            },
          },
          // 背景缓慢移动的星空
          background: { color: 'transparent' },
          detectRetina: true,
          pauseOnBlur: false,
          pauseOnOutsideViewport: false,
        }}
      />

      {/* 鼠标光标辉光 — 跟随鼠标 */}
      <div
        className="fixed pointer-events-none -z-5"
        style={{
          left: `calc(${mousePos.x}% - 150px)`,
          top: `calc(${mousePos.y}% - 150px)`,
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(0,240,255,0.08) 0%, rgba(168,85,247,0.04) 40%, transparent 70%)',
          borderRadius: '50%',
          transition: 'left 0.2s ease-out, top 0.2s ease-out',
        }}
      />
    </>
  )
}
