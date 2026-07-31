import { useState } from 'react'
import { useStore, AppSettings } from '../stores/useStore'
import { DEFAULT_SYSTEM_PROMPT, PROVIDERS, MODEL_REGISTRY, CATEGORY_LABELS, getModelEntry, type ModelCategory, type ModelEntry } from '../services/api'
import { AppIcon } from './Icon'
import { ChevronDown, Copy, Eye, EyeOff, PenLine, Trash2, X } from 'lucide-react'

const TABS = [
  { key: 'accounts' as const, label: '账号管理', icon: '👤' },
  { key: 'apikey' as const, label: '模型配置', icon: '🔑' },
  { key: 'model' as const, label: '参数', icon: '🧠' },
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
        className="absolute inset-0 bg-[rgb(var(--color-overlay)/0.62)] backdrop-blur-md transition-all duration-300"
        onClick={() => setSettingsOpen(false)}
      />

      {/* 弹窗 */}
      <div className="relative bg-surface-50/95 backdrop-blur-2xl rounded-2xl shadow-[var(--theme-shadow)] border border-line/40 w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line/30">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink-strong"><AppIcon name="⚙️" size={19} className="text-primary-400" /> 设置</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-ink-muted hover:text-ink-strong leading-none"
          >
            <X size={20} />
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
  const { accounts, activeAccountId, createAccount, switchAccount, deleteAccount, renameAccount } = useStore()
  const [activeTab, setActiveTab] = useState('accounts')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      {/* Tab 切换 */}
      <div className="flex border-b border-line/30 px-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-ink-subtle hover:text-ink-strong'
            }`}
          >
            <AppIcon name={tab.icon} size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* ===== 账号管理 ===== */}
        {activeTab === 'accounts' && (
          <>
            {/* 当前账号 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-ink-strong mb-2">当前账号</label>
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border mb-2 transition-colors ${
                    acc.id === activeAccountId
                      ? 'bg-primary-500/10 border-primary-500/30'
                      : 'bg-surface-300/20 border-line/30 hover:border-line/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-500">
                    <AppIcon name={acc.avatar} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingAccountId === acc.id ? (
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { renameAccount(acc.id, editingName); setEditingAccountId(null) }
                          if (e.key === 'Escape') setEditingAccountId(null)
                        }}
                        onBlur={() => { renameAccount(acc.id, editingName); setEditingAccountId(null) }}
                        className="input-field text-sm py-1"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink-strong truncate">{acc.nickname}</span>
                        {acc.id === activeAccountId && (
                          <span className="text-xs bg-primary-500/20 text-primary-500 px-1.5 py-0.5 rounded-full">当前</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-ink-subtle mt-0.5">
                      创建于 {new Date(acc.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {acc.id !== activeAccountId && (
                      <button
                        onClick={() => switchAccount(acc.id)}
                        className="text-xs px-2 py-1 bg-primary-500/20 text-primary-500 rounded-lg hover:bg-primary-500/30 transition-colors"
                      >
                        切换
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingAccountId(acc.id); setEditingName(acc.nickname) }}
                      className="text-xs px-2 py-1 text-ink-muted hover:text-ink-strong hover:bg-surface-300/30 rounded-lg transition-colors"
                      title="重命名"
                    >
                      <PenLine size={14} />
                    </button>
                    {accounts.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`确定删除账号"${acc.nickname}"？\n该账号的所有数据（画像、对话、进度）将被永久删除。`)) {
                            deleteAccount(acc.id)
                          }
                        }}
                        className="text-xs px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="删除账号"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 新建账号 */}
            <div className="p-3 bg-surface-300/20 rounded-xl border border-line/30">
              <label className="block text-sm font-medium text-ink-strong mb-2">新建账号</label>
              <div className="flex gap-2">
                <input
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { createAccount(newAccountName, ''); setNewAccountName('') } }}
                  placeholder="留空将使用“默认用户”"
                  className="input-field flex-1 text-sm"
                />
                <button
                  onClick={() => { createAccount(newAccountName, ''); setNewAccountName('') }}
                  className="btn-primary text-sm px-4"
                >
                  创建
                </button>
              </div>
              <p className="text-xs text-ink-muted mt-1.5">
                每个账号拥有独立的学习画像、仪表盘数据、对话记录和学习路径。
              </p>
            </div>
          </>
        )}

        {/* ===== 模型配置 ===== */}
        {activeTab === 'apikey' && (
          <div className="space-y-5">
            <p className="text-xs text-ink-muted">
              为三大类场景分别选择模型并配置鉴权。配置后即可在对话、生图、数字人等功能中使用。
            </p>

            {(['llm', 'image_gen', 'digital_human'] as ModelCategory[]).map(cat => (
              <ModelCategorySection
                key={cat}
                category={cat}
                settings={settings}
                setSettings={setSettings}
                flashSaved={flashSaved}
                showKey={showKey}
                setShowKey={setShowKey}
              />
            ))}

            {/* 系统提示词 */}
            <div className="pt-2 border-t border-line/30">
              <label className="block text-sm font-medium text-ink-strong mb-1.5">
                自定义系统提示词
                <button
                  onClick={() => setSettings({ systemPrompt: DEFAULT_SYSTEM_PROMPT })}
                  className="ml-2 text-xs text-primary-500 hover:text-primary-500 underline"
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
                rows={6}
                className="w-full input-field resize-none text-xs font-mono"
              />
              <p className="text-xs text-ink-muted mt-1">
                自定义 AI 的角色和行为规则。留空使用内置的专业提示词。
              </p>
            </div>
          </div>
        )}

        {/* ===== 模型参数 ===== */}
        {activeTab === 'model' && (
          <>
            <div>
              <label className="block text-sm font-medium text-ink-strong mb-1.5">
                最大输出 Token 数
                <span className="ml-2 text-xs text-ink-muted">{settings.maxTokens}</span>
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
              <div className="flex justify-between text-xs text-ink-muted">
                <span>256</span>
                <span>4096 (默认)</span>
                <span>8192</span>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                控制 AI 回复的最大长度。越大越详细，但消耗更多 Token 配额。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-strong mb-1.5">
                创意度 (Temperature)
                <span className="ml-2 text-xs text-ink-muted">{settings.temperature.toFixed(1)}</span>
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
              <div className="flex justify-between text-xs text-ink-muted">
                <span>0 (精确严谨)</span>
                <span>1 (平衡)</span>
                <span>2 (天马行空)</span>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                低值 = 回答更一致精确（适合教学），高值 = 更有创造性。
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-200">
              <p className="flex items-start gap-1.5 text-xs text-amber-300">
                <AppIcon name="💡" size={13} className="mt-px shrink-0" /> <span><strong>建议</strong>：算法教学保持 Temperature 0.3-0.7，代码生成用 0.1-0.3。</span>
              </p>
            </div>
          </>
        )}

        {/* ===== 上下文 ===== */}
        {activeTab === 'context' && (
          <>
            <div>
              <label className="block text-sm font-medium text-ink-strong mb-1.5">
                上下文轮数限制
                <span className="ml-2 text-xs text-ink-muted">
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
              <div className="flex justify-between text-xs text-ink-muted">
                <span>0 (无记忆)</span>
                <span>10 (默认)</span>
                <span>30</span>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                AI 能"记住"最近多少轮对话。更多 = 上下文更长但消耗更多 Token。
              </p>
            </div>

            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-200">
              <p className="flex items-start gap-1.5 text-xs text-blue-300">
                <AppIcon name="📊" size={13} className="mt-px shrink-0" /> <span>每轮对话包含：用户问题 + AI 回答。设为 10 表示记住最近 20 条消息（10问10答）。</span>
              </p>
            </div>

            <div className="p-3 bg-surface-300/30 rounded-lg border border-line/50">
              <p className="text-xs text-ink-muted">
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
              <label className="block text-sm font-medium text-ink-strong mb-1.5">
                当前生效的系统提示词
                <span className="ml-2 text-xs text-ink-muted">
                  {settings.systemPrompt ? '自定义' : '默认'}
                </span>
              </label>
              <div className="relative">
                <pre className="w-full bg-code-bg text-green-400 rounded-lg p-4 text-xs font-mono overflow-auto max-h-[50vh] whitespace-pre-wrap leading-relaxed border border-code-line">
                  {settings.systemPrompt || DEFAULT_SYSTEM_PROMPT}
                </pre>
                <button
                  onClick={() => {
                    const text = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT
                    navigator.clipboard.writeText(text)
                  }}
                  className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 bg-code-header hover:bg-surface-400 text-ink rounded text-xs border border-code-line transition-colors"
                >
                  <Copy size={12} /> 复制
                </button>
              </div>
              <p className="text-xs text-ink-muted mt-2">
                {settings.systemPrompt
                  ? '当前使用自定义提示词（在"账号"页设置）。'
                  : '当前使用内置默认提示词，可在"账号"页自定义。'}
              </p>
            </div>

            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-200">
              <p className="flex items-start gap-1.5 text-xs text-blue-300">
                <AppIcon name="💡" size={13} className="mt-px shrink-0" /> <span>提示词决定了 AI 的角色、知识范围和回复风格。内置提示词已包含知识库索引和格式要求。</span>
              </p>
            </div>
          </>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="px-6 py-3 border-t border-line/30 flex items-center justify-between bg-surface-300/30">
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
            <span className="inline-flex items-center gap-1 text-xs text-green-600 animate-pulse-soft"><AppIcon name="✓" size={12} /> 已保存</span>
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
    <p className="text-xs text-ink-subtle">
      {rounds === 0 ? '不记忆' : `${rounds} 轮`}：{tokens} tokens/次
    </p>
  )
}

// ===== 三大分类模型选择区 =====

function ModelCategorySection({
  category, settings, setSettings, flashSaved, showKey, setShowKey,
}: {
  category: ModelCategory
  settings: AppSettings
  setSettings: (s: Partial<AppSettings>) => void
  flashSaved: () => void
  showKey: boolean
  setShowKey: (v: boolean) => void
}) {
  const info = CATEGORY_LABELS[category]
  const models = MODEL_REGISTRY.filter(m => m.category === category)
  const selectedModelId = settings.selectedModelIds?.[category] || models[0]?.id || ''
  const selectedModel = getModelEntry(selectedModelId)
  const creds = settings.modelCreds?.[selectedModelId] || {}
  const [modelMenuOpen, setModelMenuOpen] = useState(false)

  // 检查是否已配置
  const allFieldsFilled = selectedModel
    ? selectedModel.creds.every(c => !!(creds[c.key]))
    : false

  return (
    <div className={`p-4 rounded-xl border transition-colors ${
      allFieldsFilled
        ? 'bg-green-500/5 border-green-500/20'
        : 'bg-surface-300/20 border-line/30'
    }`}>
      {/* 标题行 */}
      <div className="flex items-center gap-2 mb-3">
        <AppIcon name={info.icon} size={20} className="text-primary-500" />
        <div>
          <label className="text-sm font-medium text-ink-strong">{info.name}</label>
          <p className="text-[10px] text-ink-subtle">{info.desc}</p>
        </div>
        {allFieldsFilled && (
          <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full ml-auto">
            已配置
          </span>
        )}
      </div>

      {/* 模型下拉选择 */}
      <div className="mb-3 relative">
        <label className="text-[11px] text-ink-muted mb-1 block">选择模型</label>
        <button
          type="button"
          onClick={() => setModelMenuOpen(open => !open)}
          aria-haspopup="listbox"
          aria-expanded={modelMenuOpen}
          className="w-full input-field text-sm py-2 flex items-center gap-2 text-left"
        >
          <span className="flex-1 truncate">
            {selectedModel?.multimodal ? '🖼️ ' : ''}{selectedModel?.name} — {selectedModel?.description}
          </span>
          <ChevronDown
            size={15}
            className={`shrink-0 text-ink-muted transition-transform ${modelMenuOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {modelMenuOpen && (
          <div
            role="listbox"
            className="absolute top-full left-0 right-0 mt-1 z-30 max-h-56 overflow-y-auto rounded-lg border border-line/50 bg-surface-100 shadow-xl"
          >
            {models.map(m => (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={m.id === selectedModelId}
                onClick={() => {
                  setSettings({
                    selectedModelIds: { ...settings.selectedModelIds, [category]: m.id }
                  })
                  setModelMenuOpen(false)
                  flashSaved()
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  m.id === selectedModelId
                    ? 'bg-primary-500/15 text-primary-500'
                    : 'text-ink-strong hover:bg-surface-300/50'
                }`}
              >
                <span className="block truncate">
                  {m.multimodal ? '🖼️ ' : ''}{m.name} — {m.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 鉴权字段 */}
      {selectedModel && selectedModel.creds.length > 0 && (
        <div className="space-y-2">
          {selectedModel.creds.map(cred => (
            <div key={cred.key}>
              <label className="text-[11px] text-ink-muted mb-0.5 block">{cred.label}</label>
              <div className="relative">
                <input
                  type={cred.type === 'password' ? (showKey ? 'text' : 'password') : 'text'}
                  value={creds[cred.key] || ''}
                  onChange={(e) => {
                    const newCreds = {
                      ...settings.modelCreds,
                      [selectedModelId]: { ...creds, [cred.key]: e.target.value }
                    }
                    setSettings({ modelCreds: newCreds })
                    flashSaved()
                  }}
                  placeholder={cred.placeholder}
                  className={`w-full input-field pr-10 font-mono text-xs ${
                    creds[cred.key] ? 'border-green-500/30' : ''
                  }`}
                />
                {cred.type === 'password' && (
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 额外说明 */}
      {selectedModel?.requiresExtra && (
        <p className="text-[10px] text-ink-subtle mt-2">
          <a
            href="https://console.xfyun.cn/"
            target="_blank"
            rel="noopener"
            className="text-primary-500 underline"
          >
            获取地址: console.xfyun.cn
          </a>
          {' '}{selectedModel.requiresExtra.replace('获取地址: console.xfyun.cn → ', '→ ')}
        </p>
      )}

      {/* 多模态标记 */}
      {selectedModel?.multimodal && category === 'llm' && (
        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-300 flex items-center gap-1.5">
          <AppIcon name="🖼️" size={12} className="shrink-0" /> 此模型支持多模态输入，配置后可在对话中发送图片提问。
        </div>
      )}
    </div>
  )
}
