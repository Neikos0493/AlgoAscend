import { useState, useEffect } from 'react'
import { useStore } from '../stores/useStore'
import { fetchProfile, resetProfile, clearHistory, updateStudent } from '../services/api'
import { clearAccounts } from '../services/platformService'
import AccountBinding from '../components/AccountBinding'

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
  const { profile, dimensionsFilled, setProfile, setDimensionsFilled, resetAll, toggleSidebar } = useStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [major, setMajor] = useState('')
  const [grade, setGrade] = useState('')
  const [studentInfo, setStudentInfo] = useState<any>({})
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

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

  const handleReset = async () => {
    setResetting(true)
    try {
      await resetProfile(1)           // 后端：清除画像 + 聊天历史
      await clearHistory(1)           // 确保前端聊天历史也清除
      clearAccounts()                 // 清除竞赛平台绑定
      localStorage.removeItem('algoascend_settings')  // 清除设置
      resetAll()                      // 清除 Zustand store
      setShowResetConfirm(false)
      // 重新加载画像（显示空状态）
      setProfile(null as any)
      setDimensionsFilled(0)
      setStudentInfo({})
      setName('')
      setMajor('')
      setGrade('')
    } catch (err) {
      console.log('重置失败', err)
    } finally {
      setResetting(false)
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
            <span key={i} className="text-xs bg-surface-300/50 text-gray-300 px-2.5 py-1 rounded-full border border-gray-700/30">
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
            <span className="text-sm font-medium text-gray-200">
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="flex items-center gap-3 px-6 py-4 bg-surface-100/80 backdrop-blur-xl border-b border-gray-700/30 shrink-0">
        <button
          className="lg:hidden text-gray-400 hover:text-gray-200"
          onClick={toggleSidebar}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-white">学习画像</h2>
          <p className="text-xs text-gray-400">AI对话式构建的六维动态学习画像</p>
        </div>
        <button
          onClick={loadProfile}
          className="text-sm text-primary-400 hover:text-primary-300"
        >
          🔄 刷新
        </button>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-sm text-red-500 hover:text-red-600 ml-2"
          title="清除所有信息，重新构建画像"
        >
          🔥 重置画像
        </button>
      </header>

      <div className="p-6 space-y-6">
        {/* 基本信息 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">👤 基本信息</h3>
            <button
              onClick={() => setEditing(!editing)}
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              {editing ? '取消' : '✏️ 编辑'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">姓名</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="你的姓名"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">专业</label>
                <input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="input-field"
                  placeholder="如：计算机科学与技术"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">年级</label>
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
                <p className="font-semibold text-gray-200">{studentInfo.name || '学习者'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">专业</span>
                <p className="font-semibold text-gray-200">{studentInfo.major || '未设置'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">年级</span>
                <p className="font-semibold text-gray-200">{studentInfo.grade || '未设置'}</p>
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
            <div className="flex-1 bg-surface-400/60 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary-400 to-primary-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(dimensionsFilled / 6) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-primary-300">
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
                    <h4 className="font-semibold text-gray-200">{info.name}</h4>
                    <p className="text-xs text-gray-400 mb-3">{info.description}</p>
                    {renderDimensionValue(key, data)}
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${
                      hasData
                        ? 'bg-green-50 text-green-600'
                        : 'bg-surface-300/30 text-gray-500 border border-gray-700/30'
                    }`}
                  >
                    {hasData ? '✓' : '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 竞赛平台账号绑定 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🏆 竞赛平台绑定</h3>
            <span className="text-xs text-gray-400">绑定后自动拉取竞赛数据</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            绑定你在各算法竞赛平台的账号，AI 将根据你的真实竞赛数据（Rating、做题量、参赛记录等）提供更精准的学习分析和个性化建议。
          </p>
          <AccountBinding />
        </div>

        {/* 画像版本信息 */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-200">画像元信息</h4>
              <p className="text-xs text-gray-400 mt-1">
                通过AI对话自动提取特征，随学随新
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">
                版本: v{profile?.version || 1}
              </p>
              <p className="text-sm text-gray-400">
                置信度: {((profile?.confidence_score || 0) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 重置确认弹窗 */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-100/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/30 p-6 max-w-md w-full mx-4">
            <div className="text-center mb-4">
              <span className="text-5xl">⚠️</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">确认重置画像？</h3>
            </div>
            <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-100">
              <p className="text-sm text-red-700 leading-relaxed">
                此操作将<strong>永久清除</strong>以下所有数据：
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-600">
                <li>• 六维学习画像数据</li>
                <li>• 全部对话历史记录</li>
                <li>• 竞赛平台绑定信息</li>
                <li>• 个人信息（姓名/专业/年级）</li>
              </ul>
              <p className="mt-2 text-xs text-red-500">
                重置后可重新与 AI 对话，从零构建画像。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-600/50 text-gray-400 hover:bg-surface-300/30 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors font-medium disabled:opacity-50"
              >
                {resetting ? '重置中...' : '确认重置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
