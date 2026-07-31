export const BRAND_INTRO_DURATION = 4800

export interface BrandStar {
  cx: number
  cy: number
  r: number
  tone: 'white' | 'cyan' | 'violet'
}

export const BRAND_STARS: BrandStar[] = [
  { cx: 378, cy: 120, r: 2.1, tone: 'white' },
  { cx: 423, cy: 102, r: 1.3, tone: 'white' },
  { cx: 563, cy: 113, r: 1.8, tone: 'white' },
  { cx: 627, cy: 146, r: 1.2, tone: 'white' },
  { cx: 600, cy: 210, r: 1.4, tone: 'white' },
  { cx: 402, cy: 178, r: 1.4, tone: 'cyan' },
  { cx: 466, cy: 126, r: 1.1, tone: 'cyan' },
  { cx: 589, cy: 171, r: 1.7, tone: 'cyan' },
  { cx: 642, cy: 257, r: 1.1, tone: 'cyan' },
  { cx: 367, cy: 238, r: 1.2, tone: 'violet' },
  { cx: 446, cy: 155, r: 1.5, tone: 'violet' },
  { cx: 545, cy: 91, r: 1.1, tone: 'violet' },
  { cx: 622, cy: 110, r: 1.5, tone: 'violet' },
]

type Point = [number, number]

interface Geometry {
  outer: Point[]
  inner: Point[]
}

interface TransformBounds {
  x: number
  y: number
  width: number
  height: number
}

interface TransformRange {
  from: TransformBounds
  to: TransformBounds
}

export interface BrandMotionFrame {
  time: number
  fragmentOpacity: number
  fragmentLeftTransform: string
  fragmentRightTransform: string
  rearTransform: string
  frontTransform: string
  rearPath: string
  frontPath: string
  rearCrossbarOpacity: number
  frontCrossbarOpacity: number
  rearCrossbarTransform: string
  frontCrossbarTransform: string
  tileOpacity: number
  tileTransform: string
  tileGlowOpacity: number
  starOpacities: number[]
  routeOpacity: number
  routeMaskOffset: number
  routeDashOffset: number
  guideX: number
  guideY: number
  guideRadius: number
  guideOpacity: number
  summitGlowOpacity: number
  flagOpacity: number
  poleOffset: number
  clothTransform: string
}

const A_GEOMETRY: Geometry = {
  outer: [[0, 1], [0.5, 0], [1, 1]],
  inner: [[0.335, 0.71], [0.5, 0.34], [0.665, 0.71]],
}

const MOUNTAIN_GEOMETRY: Record<'rear' | 'front', Geometry> = {
  rear: {
    outer: [[0, 1], [0.42, 0.055], [1, 1]],
    inner: [[0.419, 0.07], [0.42, 0.068], [0.421, 0.07]],
  },
  front: {
    outer: [[0, 1], [0.46, 0.035], [1, 1]],
    inner: [[0.459, 0.052], [0.46, 0.05], [0.461, 0.052]],
  },
}

const TRANSFORMS: Record<'rear' | 'front', TransformRange> = {
  rear: {
    from: { x: 120, y: 215, width: 90, height: 115 },
    to: { x: 374, y: 182, width: 170, height: 165 },
  },
  front: {
    from: { x: 398, y: 185, width: 125, height: 145 },
    to: { x: 420, y: 127, width: 215, height: 225 },
  },
}

type CubicSegment = [Point, Point, Point, Point]

const ROUTE_SEGMENTS: CubicSegment[] = [
  [[458, 338], [448, 302], [482, 292], [470, 259]],
  [[470, 259], [458, 230], [505, 217], [493, 188]],
  [[493, 188], [486, 170], [502, 154], [519, 137]],
]

function routePathFor(segments: CubicSegment[]) {
  const [first, ...rest] = segments
  return [
    `M${first[0][0]} ${first[0][1]}`,
    ...[first, ...rest].map(([, controlA, controlB, end]) =>
      `C${controlA[0]} ${controlA[1]} ${controlB[0]} ${controlB[1]} ${end[0]} ${end[1]}`,
    ),
  ].join(' ')
}

export const BRAND_ROUTE_PATH = routePathFor(ROUTE_SEGMENTS)

interface RouteSample {
  length: number
  point: Point
}

const ROUTE_SAMPLES_PER_SEGMENT = 48

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function progress(time: number, start: number, end: number) {
  return clamp((time - start) / (end - start))
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function easeOut(value: number) {
  return 1 - Math.pow(1 - clamp(value), 3)
}

function easeInOut(value: number) {
  const t = clamp(value)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function cubicPoint([start, controlA, controlB, end]: CubicSegment, t: number): Point {
  const inverse = 1 - t
  const a = inverse * inverse * inverse
  const b = 3 * inverse * inverse * t
  const c = 3 * inverse * t * t
  const d = t * t * t
  return [
    a * start[0] + b * controlA[0] + c * controlB[0] + d * end[0],
    a * start[1] + b * controlA[1] + c * controlB[1] + d * end[1],
  ]
}

function buildRouteSamples() {
  const samples: RouteSample[] = [{ length: 0, point: ROUTE_SEGMENTS[0][0] }]
  let length = 0
  let previous = ROUTE_SEGMENTS[0][0]

  ROUTE_SEGMENTS.forEach(segment => {
    for (let index = 1; index <= ROUTE_SAMPLES_PER_SEGMENT; index += 1) {
      const point = cubicPoint(segment, index / ROUTE_SAMPLES_PER_SEGMENT)
      length += Math.hypot(point[0] - previous[0], point[1] - previous[1])
      samples.push({ length, point })
      previous = point
    }
  })

  return { samples, length }
}

const ROUTE_LOOKUP = buildRouteSamples()

function pointAlongRoute(amount: number): Point {
  const target = clamp(amount) * ROUTE_LOOKUP.length
  const samples = ROUTE_LOOKUP.samples
  let low = 0
  let high = samples.length - 1

  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (samples[middle].length < target) low = middle + 1
    else high = middle
  }

  const next = samples[low]
  const previous = samples[Math.max(0, low - 1)]
  const span = next.length - previous.length
  const localProgress = span === 0 ? 0 : (target - previous.length) / span
  return [
    mix(previous.point[0], next.point[0], localProgress),
    mix(previous.point[1], next.point[1], localProgress),
  ]
}

function mixPoint(from: Point, to: Point, amount: number): Point {
  return [mix(from[0], to[0], amount), mix(from[1], to[1], amount)]
}

function interpolateGeometry(from: Geometry, to: Geometry, amount: number): Geometry {
  return {
    outer: from.outer.map((point, index) => mixPoint(point, to.outer[index], amount)),
    inner: from.inner.map((point, index) => mixPoint(point, to.inner[index], amount)),
  }
}

function pathFor(geometry: Geometry) {
  const [a, b, c] = geometry.outer
  const [d, e, f] = geometry.inner
  return [
    `M ${a[0].toFixed(4)} ${a[1].toFixed(4)}`,
    `L ${b[0].toFixed(4)} ${b[1].toFixed(4)}`,
    `L ${c[0].toFixed(4)} ${c[1].toFixed(4)} Z`,
    `M ${d[0].toFixed(4)} ${d[1].toFixed(4)}`,
    `L ${e[0].toFixed(4)} ${e[1].toFixed(4)}`,
    `L ${f[0].toFixed(4)} ${f[1].toFixed(4)} Z`,
  ].join(' ')
}

function transformFor(config: TransformRange, amount: number) {
  const x = mix(config.from.x, config.to.x, amount)
  const y = mix(config.from.y, config.to.y, amount)
  const width = mix(config.from.width, config.to.width, amount)
  const height = mix(config.from.height, config.to.height, amount)
  return `translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${width.toFixed(3)} ${height.toFixed(3)})`
}

function crossbarTransform(amount: number) {
  return `translate(${(0.5 * amount).toFixed(3)} 0) scale(${(1 - amount).toFixed(3)} 1) translate(${(-0.5 * amount).toFixed(3)} 0)`
}

const STAR_TOP = Math.min(...BRAND_STARS.map(star => star.cy))
const STAR_BOTTOM = Math.max(...BRAND_STARS.map(star => star.cy))
const STAR_RANGE = Math.max(1, STAR_BOTTOM - STAR_TOP)
const STAR_FADE_SPAN = 0.22
const STAR_FADE_STARTS = BRAND_STARS.map(star =>
  ((STAR_BOTTOM - star.cy) / STAR_RANGE) * (1 - STAR_FADE_SPAN),
)

export function getBrandMotionFrame(rawTime: number): BrandMotionFrame {
  const time = clamp(rawTime, 0, BRAND_INTRO_DURATION)
  const fragmentsOut = easeInOut(progress(time, 700, 1200))
  const converge = easeOut(progress(time, 1350, 2150))
  const tileIn = easeOut(progress(time, 1450, 2050))
  const morph = easeInOut(progress(time, 2150, 3050))
  const rearMorph = easeInOut(progress(time, 2110, 2920))
  const mountainConstruction = Math.pow((rearMorph + morph) / 2, 2.15)
  const routeArrival = easeOut(progress(time, 2880, 3160))
  const routeDraw = easeInOut(progress(time, 2980, 4050))
  const poleDraw = easeOut(progress(time, 4050, 4290))
  const clothOpen = easeOut(progress(time, 4250, 4500))
  const settle = easeOut(progress(time, 4500, BRAND_INTRO_DURATION))
  const guidePoint = pointAlongRoute(routeDraw)
  const guideFadeOut = 1 - easeOut(progress(routeDraw, 0.82, 1))
  const clothScale = 1 + Math.sin(clothOpen * Math.PI) * 0.05

  return {
    time,
    fragmentOpacity: 1 - fragmentsOut,
    fragmentLeftTransform: `translate(${-14 * fragmentsOut} 0) scale(${(1 - 0.07 * fragmentsOut).toFixed(3)} 1)`,
    fragmentRightTransform: `translate(${18 * fragmentsOut} 0) scale(${(1 - 0.07 * fragmentsOut).toFixed(3)} 1)`,
    rearTransform: transformFor(TRANSFORMS.rear, converge),
    frontTransform: transformFor(TRANSFORMS.front, converge),
    rearPath: pathFor(interpolateGeometry(A_GEOMETRY, MOUNTAIN_GEOMETRY.rear, rearMorph)),
    frontPath: pathFor(interpolateGeometry(A_GEOMETRY, MOUNTAIN_GEOMETRY.front, morph)),
    rearCrossbarOpacity: 1 - rearMorph,
    frontCrossbarOpacity: 1 - morph,
    rearCrossbarTransform: crossbarTransform(rearMorph),
    frontCrossbarTransform: crossbarTransform(morph),
    tileOpacity: tileIn,
    tileTransform: `translate(500 240) scale(${mix(0.82, 1, tileIn).toFixed(4)}) translate(-500 -240)`,
    tileGlowOpacity: 0.08 + tileIn * (0.54 + settle * 0.22),
    starOpacities: STAR_FADE_STARTS.map(fadeStart =>
      easeOut(progress(mountainConstruction, fadeStart, fadeStart + STAR_FADE_SPAN)),
    ),
    routeOpacity: routeArrival,
    routeMaskOffset: 1 - routeDraw,
    routeDashOffset: -routeDraw * 8,
    guideX: guidePoint[0],
    guideY: guidePoint[1],
    guideRadius: 4.2 + Math.sin(routeDraw * Math.PI) * 1.8,
    guideOpacity: routeArrival * guideFadeOut * 0.9,
    summitGlowOpacity: clamp(routeDraw * 2 - 1) * (0.42 + settle * 0.26),
    flagOpacity: poleDraw > 0 ? 1 : 0,
    poleOffset: 1 - poleDraw,
    clothTransform: `translate(519 101) scale(${(clothOpen * clothScale).toFixed(4)} 1) translate(-519 -101)`,
  }
}
