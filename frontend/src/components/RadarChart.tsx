/**
 * 雷达图组件 — 五维学习评估可视化
 * 纯 SVG 实现，数值从画像 + 统计数据动态计算
 */

// ===== 类型 =====

interface Dimension {
  label: string
  value: number // 0-100
  color: string
  detail?: string  // 鼠标悬浮提示
}

interface RadarChartProps {
  dimensions: Dimension[]
  size?: number
  className?: string
}

// ===== 知识水平映射 =====

const LEVEL_SCORE: Record<string, number> = {
  '入门': 25,
  '基础': 40,
  '良好': 55,
  '中级': 65,
  '进阶': 80,
  '竞赛': 95,
  '高级': 90,
}
const LEVEL_SCORE_LOOSE: Record<string, number> = {
  '入门': 20,
  '基础': 35,
  '良好': 50,
  '中等': 60,
  '中级': 65,
  '进阶': 80,
  '竞赛': 95,
}

// ===== SVG 雷达图组件 =====

export default function RadarChart({ dimensions, size = 280, className = '' }: RadarChartProps) {
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.35
  const levels = 5
  const angleSlice = (2 * Math.PI) / dimensions.length

  // 计算多边形顶点坐标
  const getPolygonPoints = (values: number[], scale: number = 1) => {
    return values
      .map((v, i) => {
        const r = (v / 100) * radius * scale
        const x = cx + r * Math.cos(angleSlice * i - Math.PI / 2)
        const y = cy + r * Math.sin(angleSlice * i - Math.PI / 2)
        return `${x},${y}`
      })
      .join(' ')
  }

  // 生成参考网格
  const gridLevels = Array.from({ length: levels }, (_, i) => {
    const r = ((i + 1) / levels) * radius
    const points = dimensions
      .map((_, j) => {
        const x = cx + r * Math.cos(angleSlice * j - Math.PI / 2)
        const y = cy + r * Math.sin(angleSlice * j - Math.PI / 2)
        return `${x},${y}`
      })
      .join(' ')
    return points
  })

  // 轴线
  const axes = dimensions.map((_, i) => {
    const x = cx + radius * Math.cos(angleSlice * i - Math.PI / 2)
    const y = cy + radius * Math.sin(angleSlice * i - Math.PI / 2)
    return { x, y }
  })

  const dataPoints = getPolygonPoints(dimensions.map((d) => d.value))

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        {/* 网格 */}
        {gridLevels.map((points, i) => (
          <polygon
            key={`grid-${i}`}
            points={points}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={i === levels - 1 ? 1.5 : 0.5}
            opacity={i === levels - 1 ? 0.8 : 0.4}
          />
        ))}

        {/* 轴线 */}
        {axes.map((axis, i) => (
          <line
            key={`axis-${i}`}
            x1={cx} y1={cy}
            x2={axis.x} y2={axis.y}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}

        {/* 数据区域 */}
        <polygon
          points={dataPoints}
          fill="rgba(99, 102, 241, 0.15)"
          stroke="rgb(99, 102, 241)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* 数据点 */}
        {dimensions.map((d, i) => {
          const r = (d.value / 100) * radius
          const x = cx + r * Math.cos(angleSlice * i - Math.PI / 2)
          const y = cy + r * Math.sin(angleSlice * i - Math.PI / 2)
          return (
            <circle
              key={`dot-${i}`}
              cx={x} cy={y}
              r={4}
              fill="#0d0d1a"
              stroke={d.color}
              strokeWidth={2.5}
            />
          )
        })}

        {/* 标签 */}
        {dimensions.map((d, i) => {
          const labelR = radius + 28
          const x = cx + labelR * Math.cos(angleSlice * i - Math.PI / 2)
          const y = cy + labelR * Math.sin(angleSlice * i - Math.PI / 2)
          return (
            <text
              key={`label-${i}`}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[11px] font-medium"
              fill={d.color}
            >
              {d.label}
            </text>
          )
        })}

        {/* 数值 */}
        {dimensions.map((d, i) => {
          const r = (d.value / 100) * radius + 14
          const x = cx + r * Math.cos(angleSlice * i - Math.PI / 2)
          const y = cy + r * Math.sin(angleSlice * i - Math.PI / 2)
          return (
            <text
              key={`val-${i}`}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-bold"
              fill={d.color}
            >
              {d.value}%
            </text>
          )
        })}
      </svg>

      {/* 详细说明 */}
      <div className="grid grid-cols-5 gap-2 mt-2 w-full max-w-md">
        {dimensions.map((d, i) => (
          <div key={i} className="text-center" title={d.detail || ''}>
            <div className="text-[10px] text-gray-400">{d.label}</div>
            <div className="text-sm font-bold" style={{ color: d.color }}>{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== 动态计算雷达图维度 =====

interface ProfileData {
  knowledge_base?: Record<string, string>
  cognitive_style?: Record<string, string>
  learning_goals?: Record<string, string>
  error_patterns?: Record<string, string | string[]>
  learning_pace?: Record<string, string>
  interests?: Record<string, string | string[]>
  confidence_score?: number
  version?: number
}

interface StatsData {
  total_exercises?: number
  correct_exercises?: number
  accuracy?: number
  total_resources?: number
  total_paths?: number
  total_assessments?: number
}

/**
 * 根据学生画像和统计数据动态计算五维雷达图
 * 每个维度 0-100 分，完全由数据驱动
 */
export function computeRadarDimensions(
  profile: ProfileData | null,
  stats: StatsData | null,
  conversationCount: number = 0,
): Dimension[] {
  if (!profile) {
    // 无画像：所有维度归零
    return [
      { label: '知识掌握', value: 0, color: '#6366f1', detail: '尚未收集知识基础信息' },
      { label: '练习质量', value: 0, color: '#10b981', detail: '尚未进行练习' },
      { label: '学习投入', value: 0, color: '#f59e0b', detail: '尚未收集学习节奏信息' },
      { label: '画像完善', value: 0, color: '#ef4444', detail: '画像尚未构建' },
      { label: '薄弱识别', value: 0, color: '#8b5cf6', detail: '尚未收集易错点信息' },
    ]
  }

  const kb = profile.knowledge_base || {}
  const lp = profile.learning_pace || {}
  const ep = profile.error_patterns || {}
  const ss = stats || {}

  // 1. 知识掌握 (Knowledge) — 从 knowledge_base 计算平均分
  const knowledgeScore = computeKnowledgeScore(kb)

  // 2. 练习质量 (Practice Quality) — 从 stats 计算
  const practiceScore = computePracticeScore(ss)

  // 3. 学习投入 (Engagement) — 从 learning_pace 计算
  const engagementScore = computeEngagementScore(lp, conversationCount)

  // 4. 画像完善度 (Profile Completeness) — 六维中有多少已填充
  const completenessScore = computeCompletenessScore(profile)

  // 5. 薄弱识别 (Weakness Identification) — 是否识别了易错点和薄弱领域
  const weaknessScore = computeWeaknessScore(ep)

  return [
    {
      label: '知识掌握',
      value: knowledgeScore,
      color: '#6366f1',
      detail: getKnowledgeDetail(kb),
    },
    {
      label: '练习质量',
      value: practiceScore,
      color: '#10b981',
      detail: getPracticeDetail(ss),
    },
    {
      label: '学习投入',
      value: engagementScore,
      color: '#f59e0b',
      detail: getEngagementDetail(lp, conversationCount),
    },
    {
      label: '画像完善',
      value: completenessScore,
      color: '#ef4444',
      detail: getCompletenessDetail(profile),
    },
    {
      label: '薄弱识别',
      value: weaknessScore,
      color: '#8b5cf6',
      detail: getWeaknessDetail(ep),
    },
  ]
}

// ===== 各维度计算函数 =====

function computeKnowledgeScore(kb: Record<string, string>): number {
  const fields = ['cpp_level', 'algorithm_level', 'math_level', 'data_structure_level']
  const scores = fields
    .map((f) => {
      const val = kb[f]
      if (!val) return null
      return LEVEL_SCORE[val] || LEVEL_SCORE_LOOSE[val] || 30
    })
    .filter((s): s is number => s !== null)

  if (scores.length === 0) return 0
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

function computePracticeScore(ss: StatsData): number {
  const total = ss.total_exercises || 0
  if (total === 0) return 0

  const accuracy = ss.accuracy ?? (
    ss.correct_exercises != null && total > 0
      ? (ss.correct_exercises / total) * 100
      : 0
  )

  // 综合：做题量(30%) + 正确率(70%)
  const volumeScore = Math.min(total / 2, 100) // 200题封顶
  const accuracyScore = Math.min(accuracy, 100)
  return Math.round(volumeScore * 0.3 + accuracyScore * 0.7)
}

function computeEngagementScore(lp: Record<string, string>, conversationCount: number): number {
  let score = 0
  let factors = 0

  // 每周学习时间
  const hours = lp['weekly_hours']
  if (hours) {
    const match = hours.match(/(\d+)/)
    if (match) {
      const h = parseInt(match[1])
      score += Math.min(h * 5, 100) // 20小时封顶
      factors++
    }
  }

  // 学习频率
  const freq = lp['study_frequency']
  if (freq) {
    if (freq.includes('每天')) { score += 90; factors++ }
    else if (freq.includes('经常')) { score += 70; factors++ }
    else if (freq.includes('偶尔')) { score += 40; factors++ }
    else { score += 20; factors++ }
  }

  // 专注时长
  const session = lp['session_duration']
  if (session) {
    const match = session.match(/(\d+)/)
    if (match) {
      const m = parseInt(match[1])
      score += Math.min(m / 3 * 100, 100) // 3小时封顶
      factors++
    }
  }

  // 对话次数
  if (conversationCount > 0) {
    score += Math.min(conversationCount * 5, 50)
    factors++
  }

  if (factors === 0) return 0
  return Math.round(score / factors)
}

function computeCompletenessScore(profile: ProfileData): number {
  const dims: (keyof ProfileData)[] = [
    'knowledge_base', 'cognitive_style', 'learning_goals',
    'error_patterns', 'learning_pace', 'interests',
  ]

  let filled = 0
  for (const dim of dims) {
    const data = profile[dim]
    if (data && typeof data === 'object') {
      const vals = Object.values(data as Record<string, unknown>).filter(
        (v) => v && (typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : true)
      )
      if (vals.length > 0) filled++
    }
  }

  // 置信度加权
  const confidence = profile.confidence_score || 0
  return Math.round((filled / 6) * 70 + confidence * 30)
}

function computeWeaknessScore(ep: Record<string, string | string[]>): number {
  let score = 0

  // 常见错误
  const errors = ep['common_errors']
  if (Array.isArray(errors) && errors.length > 0) {
    score += Math.min(errors.length * 25, 60)
  }

  // 薄弱领域
  const weak = ep['weak_areas']
  if (Array.isArray(weak) && weak.length > 0) {
    score += Math.min(weak.length * 20, 40)
  }

  return Math.min(score, 100)
}

// ===== 详情文本 =====

function getKnowledgeDetail(kb: Record<string, string>): string {
  const parts: string[] = []
  if (kb.cpp_level) parts.push(`C++: ${kb.cpp_level}`)
  if (kb.algorithm_level) parts.push(`算法: ${kb.algorithm_level}`)
  if (kb.math_level) parts.push(`数学: ${kb.math_level}`)
  if (kb.data_structure_level) parts.push(`数据结构: ${kb.data_structure_level}`)
  return parts.length > 0 ? parts.join(' / ') : '未收集'
}

function getPracticeDetail(ss: StatsData): string {
  const total = ss.total_exercises || 0
  const accuracy = ss.accuracy || 0
  if (total === 0) return '尚未练习'
  return `${total}题 / 正确率 ${accuracy}%`
}

function getEngagementDetail(lp: Record<string, string>, cc: number): string {
  const parts: string[] = []
  if (lp.weekly_hours) parts.push(`周${lp.weekly_hours}`)
  if (lp.study_frequency) parts.push(lp.study_frequency)
  if (cc > 0) parts.push(`${cc}轮对话`)
  return parts.length > 0 ? parts.join(' / ') : '未收集'
}

function getCompletenessDetail(profile: ProfileData): string {
  const dims: (keyof ProfileData)[] = [
    'knowledge_base', 'cognitive_style', 'learning_goals',
    'error_patterns', 'learning_pace', 'interests',
  ]
  let filled = 0
  for (const dim of dims) {
    const data = profile[dim]
    if (data && typeof data === 'object') {
      const vals = Object.values(data as Record<string, unknown>).filter(
        (v) => v != null && v !== '' && (!Array.isArray(v) || v.length > 0)
      )
      if (vals.length > 0) filled++
    }
  }
  return `${filled}/6 维度已填充 · 置信度 ${((profile.confidence_score || 0) * 100).toFixed(0)}%`
}

function getWeaknessDetail(ep: Record<string, string | string[]>): string {
  const parts: string[] = []
  const errors = ep['common_errors']
  const weak = ep['weak_areas']
  if (Array.isArray(errors)) parts.push(`${errors.length}类错误`)
  if (Array.isArray(weak)) parts.push(`${weak.length}个薄弱点`)
  return parts.length > 0 ? parts.join(' / ') : '未收集'
}
