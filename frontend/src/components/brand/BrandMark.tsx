import { useId, useMemo } from 'react'
import {
  BRAND_INTRO_DURATION,
  BRAND_ROUTE_PATH,
  BRAND_STARS,
  getBrandMotionFrame,
  type BrandMotionFrame,
} from './brandMotion'
import './brand.css'

interface BrandMarkProps {
  className?: string
  decorative?: boolean
  frame?: BrandMotionFrame
  fullScene?: boolean
  mode?: 'light' | 'dark'
  size?: number | string
  time?: number
  title?: string
}

const STAR_COLORS = {
  white: '#ffffff',
  cyan: '#9df7ff',
  violet: '#d7bdff',
} as const

const FLAG_POLE_PATH = 'M519 138 L519 99'

function safeSvgId(prefix: string, reactId: string) {
  return `${prefix}-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

export default function BrandMark({
  className = '',
  decorative = false,
  frame: suppliedFrame,
  fullScene = false,
  mode,
  size,
  time = BRAND_INTRO_DURATION,
  title = 'AlgoAscend 动态标志',
}: BrandMarkProps) {
  const reactId = useId()
  const frame = useMemo(
    () => suppliedFrame ?? getBrandMotionFrame(time),
    [suppliedFrame, time],
  )
  const ids = useMemo(() => {
    const id = (prefix: string) => safeSvgId(`brand-${prefix}`, reactId)
    return {
      description: id('description'),
      daySky: id('day-sky'),
      nightSky: id('night-sky'),
      tileStroke: id('tile-stroke'),
      rearGradient: id('rear-gradient'),
      frontGradient: id('front-gradient'),
      flagGradient: id('flag-gradient'),
      dayHaze: id('day-haze'),
      nightHaze: id('night-haze'),
      tileClip: id('tile-clip'),
      softGlow: id('soft-glow'),
      summitGlow: id('summit-glow'),
      routeMask: id('route-mask'),
    }
  }, [reactId])

  return (
    <svg
      className={`brand-mark ${className}`.trim()}
      viewBox={fullScene ? '0 0 1000 520' : '320 60 360 360'}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
      aria-describedby={decorative ? undefined : ids.description}
      data-brand-mode={mode}
      style={size === undefined ? undefined : { width: size, height: size }}
    >
      {!decorative && (
        <desc id={ids.description}>
          AlgoAscend 字标留下两个 A 并变为前后重叠的山峰，路线攀至顶峰并插旗。
        </desc>
      )}

      <defs aria-hidden="true">
        <linearGradient id={ids.daySky} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7feff" />
          <stop offset="0.48" stopColor="#dff5fa" />
          <stop offset="1" stopColor="#d9ddfa" />
        </linearGradient>
        <linearGradient id={ids.nightSky} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#151b36" />
          <stop offset="0.55" stopColor="#0c1023" />
          <stop offset="1" stopColor="#070914" />
        </linearGradient>
        <linearGradient id={ids.tileStroke} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#67f5ff" />
          <stop offset="0.48" stopColor="#20c8e9" />
          <stop offset="1" stopColor="#a86cff" />
        </linearGradient>
        <linearGradient id={ids.rearGradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#805be6" />
          <stop offset="1" stopColor="#37306f" />
        </linearGradient>
        <linearGradient id={ids.frontGradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#64f4ff" />
          <stop offset="0.48" stopColor="#20cadf" />
          <stop offset="1" stopColor="#7961ed" />
        </linearGradient>
        <linearGradient id={ids.flagGradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d5b9ff" />
          <stop offset="1" stopColor="#9a5cff" />
        </linearGradient>
        <radialGradient id={ids.dayHaze} cx="48%" cy="39%" r="65%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="0.6" stopColor="#65dce7" stopOpacity="0.08" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.nightHaze} cx="52%" cy="42%" r="63%">
          <stop offset="0" stopColor="#35dbe9" stopOpacity="0.18" />
          <stop offset="0.58" stopColor="#7455de" stopOpacity="0.08" />
          <stop offset="1" stopColor="#070912" stopOpacity="0" />
        </radialGradient>
        <clipPath id={ids.tileClip}>
          <rect x="330" y="70" width="340" height="340" rx="78" />
        </clipPath>
        <filter id={ids.softGlow} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id={ids.summitGlow} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <mask id={ids.routeMask}>
          <rect width="1000" height="520" fill="black" />
          <path
            d={BRAND_ROUTE_PATH}
            pathLength="1"
            fill="none"
            stroke="white"
            strokeWidth="22"
            strokeLinecap="round"
            strokeDasharray="1"
            strokeDashoffset={frame.routeMaskOffset}
          />
        </mask>
      </defs>

      <g aria-hidden="true">
        <ellipse
          className="brand-mark__tile-glow"
          cx="500"
          cy="398"
          rx="176"
          ry="30"
          filter={`url(#${ids.softGlow})`}
          opacity={frame.tileGlowOpacity}
        />

        <g className="brand-mark__tile" opacity={frame.tileOpacity} transform={frame.tileTransform}>
          <g clipPath={`url(#${ids.tileClip})`}>
            <rect className="brand-mark__sky brand-mark__sky--day" x="330" y="70" width="340" height="340" fill={`url(#${ids.daySky})`} />
            <rect className="brand-mark__sky brand-mark__sky--night" x="330" y="70" width="340" height="340" fill={`url(#${ids.nightSky})`} />
            <circle className="brand-mark__haze brand-mark__haze--day" cx="500" cy="225" r="165" fill={`url(#${ids.dayHaze})`} />
            <circle className="brand-mark__haze brand-mark__haze--night" cx="500" cy="225" r="165" fill={`url(#${ids.nightHaze})`} />
            <g className="brand-mark__stars">
              {BRAND_STARS.map((star, index) => (
                <circle
                  key={`${star.cx}-${star.cy}`}
                  cx={star.cx}
                  cy={star.cy}
                  r={star.r}
                  fill={STAR_COLORS[star.tone]}
                  opacity={frame.starOpacities[index]}
                />
              ))}
            </g>
          </g>
          <rect
            className="brand-mark__border"
            x="331"
            y="71"
            width="338"
            height="338"
            rx="77"
            fill="none"
            stroke={`url(#${ids.tileStroke})`}
            strokeWidth="2"
          />
        </g>

        <g className="brand-mark__wordmark">
          <text
            className="brand-mark__word-fragment"
            x="218"
            y="330"
            opacity={frame.fragmentOpacity}
            transform={frame.fragmentLeftTransform}
          >
            lgo
          </text>
          <text
            className="brand-mark__word-fragment"
            x="529"
            y="330"
            opacity={frame.fragmentOpacity}
            transform={frame.fragmentRightTransform}
          >
            scend
          </text>
          <g transform={frame.rearTransform}>
            <path fill={`url(#${ids.rearGradient})`} fillRule="evenodd" d={frame.rearPath} />
            <rect
              className="brand-mark__crossbar"
              x="0.265"
              y="0.68"
              width="0.47"
              height="0.12"
              rx="0.035"
              fill="#d8cfff"
              opacity={frame.rearCrossbarOpacity}
              transform={frame.rearCrossbarTransform}
            />
          </g>
          <g transform={frame.frontTransform}>
            <path fill={`url(#${ids.frontGradient})`} fillRule="evenodd" d={frame.frontPath} />
            <rect
              className="brand-mark__crossbar"
              x="0.265"
              y="0.68"
              width="0.47"
              height="0.12"
              rx="0.035"
              fill="#e5fdff"
              opacity={frame.frontCrossbarOpacity}
              transform={frame.frontCrossbarTransform}
            />
          </g>
        </g>

        <g mask={`url(#${ids.routeMask})`} opacity={frame.routeOpacity}>
          <path
            className="brand-mark__route-contrast"
            d={BRAND_ROUTE_PATH}
            fill="none"
            stroke="#176a78"
            strokeOpacity="0.38"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="3 13"
            strokeDashoffset={frame.routeDashOffset}
          />
          <path
            d={BRAND_ROUTE_PATH}
            fill="none"
            stroke="#f4ffff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="3 13"
            strokeDashoffset={frame.routeDashOffset}
          />
        </g>
        <circle
          className="brand-mark__route-guide"
          cx={frame.guideX}
          cy={frame.guideY}
          r={frame.guideRadius}
          fill="#eaffff"
          opacity={frame.guideOpacity}
        />
        <circle
          cx="519"
          cy="136"
          r="10"
          fill="#7ff7ff"
          filter={`url(#${ids.summitGlow})`}
          opacity={frame.summitGlowOpacity}
        />
        <g opacity={frame.flagOpacity}>
          <path
            d={FLAG_POLE_PATH}
            pathLength="1"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="1"
            strokeDashoffset={frame.poleOffset}
          />
          <g transform={frame.clothTransform}>
            <path d="M523 101 L558 110 L523 124 Z" fill={`url(#${ids.flagGradient})`} />
            <path d="M523 101 L558 110" fill="none" stroke="#e8d9ff" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
          </g>
        </g>
      </g>
    </svg>
  )
}
