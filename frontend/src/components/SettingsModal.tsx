import { useState } from 'react'
import { useStore, AppSettings } from '../stores/useStore'
import { DEFAULT_SYSTEM_PROMPT } from '../services/api'

const TABS = [
  { key: 'account' as const, label: '账号', icon: '🔑' },
  { key: 'model' as const, label: '模型', icon: '🧠' },
  { key: 'context' as const, label: '上下文', icon: '📝' },
  { key: 'prompt' as const, label: '提示词', icon: '📋' },
]

export default function SettingsModal() {
  const { settings, setSettings, resetSettings, settingsOpen, setSettingsOpen } = useStore()

  if (!settingsOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 遮罩 — 强模糊 + 深暗 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-all duration-300"
        onClick={() => setSettingsOpen(false)}
      />

      {/* 弹窗 */}
      <div className="relative bg-surface-200/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-black/50 border border-gray-700/40 w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/30">
          <h2 className="text-lg font-bold text-white">⚙️ 设置</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-gray-400 hover:text-gray-400 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* 内容区 */}
        <SettingsContent settings={settings} setSettings={setSettings} resetSettings={resetSettings} setSettingsOpen={setSettingsOpen} />
      </div>
    </div>
  )
}

function SettingsContent({
  settings, setSettings, resetSettings, setSettingsOpen,
}: {
  settings: AppSettings
  setSettings: (s: Partial<AppSettings>) => void
  resetSettings: () => void
  setSettingsOpen: (open: boolean) => void
}) {
  const [activeTab, setActiveTab] = useState('account')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-700/30 px-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-300'
                : 'border-transparent text-gray-500 hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* ===== 账号 ===== */}
        {activeTab === 'account' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1.5">
                DeepSeek API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={(e) => {
                    setSettings({ apiKey: e.target.value })
                    flashSaved()
                  }}
                  placeholder="留空使用默认 Key"
                  className="w-full input-field pr-10 font-mono text-sm"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-400 text-sm"
                  title={showKey ? '隐藏' : '显示'}
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                留空则使用内置共享 Key。修改后立即生效，无需保存。
              </p>
            </div>

            {/* 系统提示词 */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1.5">
                自定义系统提示词
                <button
                  onClick={() => setSettings({ systemPrompt: DEFAULT_SYSTEM_PROMPT })}
                  className="ml-2 text-xs text-primary-500 hover:text-primary-300 underline"
                >
                  恢复默认
                </button>
              </label>
              <textarea
                value={settings.systemPrompt}
                onChange={(e) => {
                  setSettings({ systemPrompt: e.target.value })
                  flashSaved()
                }}
                placeholder="留空使用内置提示词..."
                rows={8}
                className="w-full input-field resize-none text-xs font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                自定义 AI 的角色和行为规则。空 = 使用内置的专业提示词。
              </p>
            </div>
          </>
        )}

        {/* ===== 模型参数 ===== */}
        {activeTab === 'model' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1.5">
                最大输出 Token 数
                <span className="ml-2 text-xs text-gray-400">{settings.maxTokens}</span>
              </label>
              <input
                type="range"
                min={256}
                max={8192}
                step={256}
                value={settings.maxTokens}
                onChange={(e) => {
                  setSettings({ maxTokens: parseInt(e.target.value) })
                  flashSaved()
                }}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>256</span>
                <span>4096 (默认)</span>
                <span>8192</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                控制 AI 回复的最大长度。越大越详细，但消耗更多 Token 配额。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1.5">
                创意度 (Temperature)
                <span className="ml-2 text-xs text-gray-400">{settings.temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={settings.temperature}
                onChange={(e) => {
                  setSettings({ temperature: parseFloat(e.target.value) })
                  flashSaved()
                }}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0 (精确严谨)</span>
                <span>1 (平衡)</span>
                <span>2 (天马行空)</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                低值 = 回答更一致精确（适合教学），高值 = 更有创造性。
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-300">
                💡 <strong>建议</strong>：算法教学保持 Temperature 0.3-0.7，代码生成用 0.1-0.3。
              </p>
            </div>
          </>
        )}

        {/* ===== 上下文 ===== */}
        {activeTab === 'context' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1.5">
                上下文轮数限制
                <span className="ml-2 text-xs text-gray-400">
                  {settings.maxContextMessages === 0 ? '不记忆' : `最近 ${settings.maxContextMessages} 轮`}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={settings.maxContextMessages}
                onChange={(e) => {
                  setSettings({ maxContextMessages: parseInt(e.target.value) })
                  flashSaved()
                }}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0 (无记忆)</span>
                <span>10 (默认)</span>
                <span>30</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                AI 能"记住"最近多少轮对话。更多 = 上下文更长但消耗更多 Token。
              </p>
            </div>

            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-300">
                📊 每轮对话包含：用户问题 + AI 回答。设为 10 表示记住最近 20 条消息（10问10答）。
              </p>
            </div>

            <div className="p-3 bg-surface-300/30 rounded-lg border border-gray-600/50">
              <p className="text-xs text-gray-400">
                <strong>预估 Token 消耗</strong>（每轮约 500 tokens）：
              </p>
              <div className="mt-1 space-y-0.5">
                <TokenEstimate rounds={0} />
                <TokenEstimate rounds={5} />
                <TokenEstimate rounds={10} />
                <TokenEstimate rounds={20} />
                <TokenEstimate rounds={30} />
              </div>
            </div>
          </>
        )}

        {/* ===== 提示词预览 ===== */}
        {activeTab === 'prompt' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1.5">
                当前生效的系统提示词
                <span className="ml-2 text-xs text-gray-400">
                  {settings.systemPrompt ? '自定义' : '默认'}
                </span>
              </label>
              <div className="relative">
                <pre className="w-full bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-auto max-h-[50vh] whitespace-pre-wrap leading-relaxed border border-gray-700">
                  {settings.systemPrompt || DEFAULT_SYSTEM_PROMPT}
                </pre>
                <button
                  onClick={() => {
                    const text = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT
                    navigator.clipboard.writeText(text)
                  }}
                  className="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
                >
                  📋 复制
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {settings.systemPrompt
                  ? '当前使用自定义提示词（在"账号"页设置）。'
                  : '当前使用内置默认提示词，可在"账号"页自定义。'}
              </p>
            </div>

            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-300">
                💡 提示词决定了 AI 的角色、知识范围和回复风格。内置提示词已包含知识库索引和格式要求。
              </p>
            </div>
          </>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="px-6 py-3 border-t border-gray-700/30 flex items-center justify-between bg-surface-300/30">
        <button
          onClick={() => {
            if (confirm('确定恢复所有默认设置？这将清除自定义 API Key 和提示词。')) {
              resetSettings()
            }
          }}
          className="text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          恢复默认设置
        </button>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs text-green-600 animate-pulse-soft">✓ 已保存</span>
          )}
          <button
            onClick={() => setSettingsOpen(false)}
            className="btn-primary text-sm px-4 py-1.5"
          >
            完成
          </button>
        </div>
      </div>
    </>
  )
}

function TokenEstimate({ rounds }: { rounds: number }) {
  const tokens = rounds === 0 ? '≈ 0' : `≈ ${rounds * 500} ~ ${rounds * 700}`
  return (
    <p className="text-xs text-gray-500">
      {rounds === 0 ? '不记忆' : `${rounds} 轮`}：{tokens} tokens/次
    </p>
  )
}
