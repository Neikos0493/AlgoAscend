import { useState, useEffect } from 'react'
import { useStore } from '../stores/useStore'
import { fetchProfile, updateStudent } from '../services/api'

const DIMENSION_INFO: Record<string, { name: string; icon: string; description: string; color: string }> = {
  knowledge_base: {
    name: '知识基础',
    icon: '📖',
    description: 'C++语法、算法、数据结构、数学基础水平',
    color: 'border-blue-400',
  },
  cognitive_style: {
    name: '认知风格',
    icon: '💭',
    description: '学习方式、思维偏好、媒体偏好',
    color: 'border-purple-400',
  },
  learning_goals: {
    name: '学习目标',
    icon: '🎯',
    description: '短期目标、长期目标、竞赛计划',
    color: 'border-green-400',
  },
  error_patterns: {
    name: '易错点偏好',
    icon: '⚠️',
    description: '常见错误类型、薄弱领域',
    color: 'border-orange-400',
  },
  learning_pace: {
    name: '学习节奏',
    icon: '⏱️',
    description: '每周学习时间、专注时长、学习频率',
    color: 'border-pink-400',
  },
  interests: {
    name: '兴趣领域',
    icon: '💡',
    description: '偏好主题、难度偏好',
    color: 'border-teal-400',
  },
}

const FIELD_LABELS: Record<string, string> = {
  cpp_level: 'C++水平',
  algorithm_level: '算法水平',
  math_level: '数学基础',
  data_structure_level: '数据结构水平',
  learning_type: '学习类型',
  thinking_style: '思维风格',
  preferred_media: '偏好媒体',
  short_term: '短期目标',
  long_term: '长期目标',
  target_competition: '竞赛目标',
  common_errors: '常见错误',
  weak_areas: '薄弱领域',
  weekly_hours: '每周学习时间',
  session_duration: '单次专注时长',
  study_frequency: '学习频率',
  favorite_topics: '偏好主题',
  preferred_difficulty: '偏好难度',
}

export default function ProfilePage() {
  const { profile, dimensionsFilled, setProfile, setDimensionsFilled, toggleSidebar } = useStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [major, setMajor] = useState('')
  const [grade, setGrade] = useState('')
  const [studentInfo, setStudentInfo] = useState<any>({})

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await fetchProfile(1)
      setProfile(data.profile)
      setDimensionsFilled(data.dimensions_filled || 0)
      if (data.student) {
        setStudentInfo(data.student)
        setName(data.student.name || '')
        setMajor(data.student.major || '')
        setGrade(data.student.grade || '')
      }
    } catch (err) {
      console.log('加载画像失败', err)
    }
  }

  const handleSaveInfo = async () => {
    try {
      await updateStudent(1, { name, major, grade })
      setEditing(false)
      loadProfile()
    } catch (err) {
      console.log('保存失败', err)
    }
  }

  const renderDimensionValue = (key: string, data: any) => {
    if (!data || typeof data !== 'object') {
      return <span className="text-gray-400 text-sm">尚未收集</span>
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <span className="text-gray-400 text-sm">尚未收集</span>
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {data.map((item, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
              {item}
            </span>
          ))}
        </div>
      )
    }

    const entries = Object.entries(data).filter(([_, v]) => v)
    if (entries.length === 0) {
      return <span className="text-gray-400 text-sm">尚未收集</span>
    }

    return (
      <div className="space-y-2">
        {entries.map(([field, value]) => (
          <div key={field} className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {FIELD_LABELS[field] || field}
            </span>
            <span className="text-sm font-medium text-gray-800">
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <button
          className="lg:hidden text-gray-500 hover:text-gray-700"
          onClick={toggleSidebar}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">学习画像</h2>
          <p className="text-xs text-gray-500">AI对话式构建的六维动态学习画像</p>
        </div>
        <button
          onClick={loadProfile}
          className="ml-auto text-sm text-primary-600 hover:text-primary-700"
        >
          🔄 刷新
        </button>
      </header>

      <div className="p-6 space-y-6">
        {/* 基本信息 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">👤 基本信息</h3>
            <button
              onClick={() => setEditing(!editing)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {editing ? '取消' : '✏️ 编辑'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">姓名</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="你的姓名"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">专业</label>
                <input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="input-field"
                  placeholder="如：计算机科学与技术"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">年级</label>
                <input
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="input-field"
                  placeholder="如：大二"
                />
              </div>
              <button onClick={handleSaveInfo} className="btn-primary">
                保存
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-8">
              <div>
                <span className="text-sm text-gray-500">姓名</span>
                <p className="font-semibold text-gray-800">{studentInfo.name || '学习者'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">专业</span>
                <p className="font-semibold text-gray-800">{studentInfo.major || '未设置'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">年级</span>
                <p className="font-semibold text-gray-800">{studentInfo.grade || '未设置'}</p>
              </div>
            </div>
          )}
        </div>

        {/* 画像完善度 */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 画像完善度
          </h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1 bg-gray-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary-400 to-primary-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(dimensionsFilled / 6) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-primary-700">
              {dimensionsFilled}/6 维度
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {dimensionsFilled === 0 && '画像尚未构建。去「智能对话」页面，通过自然对话让AI了解你，自动构建学习画像。'}
            {dimensionsFilled > 0 && dimensionsFilled < 3 && '画像正在构建中。继续与AI对话，了解更多关于你的学习特征。'}
            {dimensionsFilled >= 3 && dimensionsFilled < 6 && '画像比较完善了。继续深入对话可以补充更多细节。'}
            {dimensionsFilled >= 6 && '✅ 六维画像已全面构建！AI可以为你提供高度个性化的学习服务。'}
          </p>
        </div>

        {/* 六维详情 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(DIMENSION_INFO).map(([key, info]) => {
            const data = profile ? (profile as any)[key] : null
            const hasData = data && typeof data === 'object' && (
              Array.isArray(data) ? data.length > 0 : Object.values(data).some(v => v)
            )

            return (
              <div
                key={key}
                className={`card border-l-4 ${info.color} ${hasData ? '' : 'opacity-70'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{info.name}</h4>
                    <p className="text-xs text-gray-400 mb-3">{info.description}</p>
                    {renderDimensionValue(key, data)}
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${
                      hasData
                        ? 'bg-green-50 text-green-600'
                        : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {hasData ? '✓' : '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 画像版本信息 */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-700">画像元信息</h4>
              <p className="text-xs text-gray-400 mt-1">
                通过AI对话自动提取特征，随学随新
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                版本: v{profile?.version || 1}
              </p>
              <p className="text-sm text-gray-600">
                置信度: {((profile?.confidence_score || 0) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
