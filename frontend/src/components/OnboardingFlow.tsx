import { useState } from 'react'
import { useStore } from '../stores/useStore'
import { AppIcon } from './Icon'
import BrandMark from './brand/BrandMark'

function ThemePreview({ mode }: { mode: 'light' | 'dark' }) {
  const isLight = mode === 'light'
  return (
    <div
      className="h-28 sm:h-36 rounded-xl p-3 flex items-center justify-center border overflow-hidden"
      style={{ backgroundColor: isLight ? '#eef2f7' : '#090b16', borderColor: isLight ? '#d7dee8' : '#25283b' }}
      aria-hidden="true"
      data-brand-mode={mode}
    >
      <BrandMark size={72} mode={mode} decorative />
    </div>
  )
}

interface OnboardingFlowProps {
  mode?: 'configure-placeholder' | 'create-profile'
  onComplete?: () => void
  onCancel?: () => void
}

export default function OnboardingFlow({
  mode = 'configure-placeholder',
  onComplete,
  onCancel,
}: OnboardingFlowProps) {
  const theme = useStore(state => state.theme)
  const setTheme = useStore(state => state.setTheme)
  const completeOnboarding = useStore(state => state.completeOnboarding)
  const createAccount = useStore(state => state.createAccount)
  const updateAccountDetails = useStore(state => state.updateAccountDetails)
  const [step, setStep] = useState<1 | 2>(1)
  const [nickname, setNickname] = useState('')
  const [major, setMajor] = useState('')
  const [grade, setGrade] = useState('')
  const [error, setError] = useState('')

  const next = () => {
    setError('')
    setStep(2)
  }

  const finish = () => {
    if (mode === 'create-profile') {
      const id = createAccount(nickname, '')
      if (!id) {
        setStep(1)
        setError('请输入有效昵称')
        return
      }
      updateAccountDetails(id, { major, grade })
    } else {
      completeOnboarding({ nickname, major, grade })
    }
    onComplete?.()
  }

  return (
    <div className="startup-profile-page">
      <section className="relative w-full max-w-3xl bg-surface-50/90 backdrop-blur-2xl border border-line/40 rounded-3xl shadow-[var(--theme-shadow)] p-5 sm:p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <BrandMark size={44} decorative />
            <div>
              <h1 className="text-lg font-bold text-ink-strong">AlgoAscend</h1>
              <p className="text-xs text-primary-500">顶峰相见</p>
            </div>
          </div>
          <span className="text-xs font-medium text-ink-muted bg-surface-300/30 border border-line/30 rounded-full px-3 py-1.5">{step} / 2</span>
        </div>

        {step === 1 ? (
          <div className="max-w-lg mx-auto animate-slide-up">
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl font-bold text-ink-strong">先简单认识一下您</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="onboarding-nickname" className="block text-sm font-medium text-ink mb-1.5">昵称 <span className="text-ink-subtle font-normal">（选填）</span></label>
                <input id="onboarding-nickname" value={nickname} onChange={event => { setNickname(event.target.value); setError('') }} className="input-field" maxLength={40} placeholder="留空将使用“默认用户”" autoFocus />
                {error && <p className="mt-1.5 text-xs text-red-400" role="alert">{error}</p>}
              </div>
              <div>
                <label htmlFor="onboarding-major" className="block text-sm font-medium text-ink mb-1.5">专业 <span className="text-ink-subtle font-normal">（选填）</span></label>
                <input id="onboarding-major" value={major} onChange={event => setMajor(event.target.value)} className="input-field" placeholder="如：计算机科学与技术" />
              </div>
              <div>
                <label htmlFor="onboarding-grade" className="block text-sm font-medium text-ink mb-1.5">年级 <span className="text-ink-subtle font-normal">（选填）</span></label>
                <input id="onboarding-grade" value={grade} onChange={event => setGrade(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') next() }} className="input-field" placeholder="如：大二" />
              </div>
            </div>
            <div className="flex gap-3 mt-7">
              {onCancel && <button type="button" onClick={onCancel} className="btn-secondary flex-1">取消</button>}
              <button type="button" onClick={next} className="btn-primary flex-1">继续</button>
            </div>
          </div>
        ) : (
          <div className="animate-slide-up">
            <div className="text-center mb-6">
              <p className="text-sm font-medium text-primary-500 mb-2">个性化您的学习空间</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-ink-strong">选择您喜欢的界面</h2>
              <p className="text-sm text-ink-muted mt-2">图标会随界面在日间与星空之间切换。</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5" role="radiogroup" aria-label="界面主题">
              {(['dark', 'light'] as const).map(themeMode => {
                const selected = theme === themeMode
                const label = themeMode === 'light' ? '浅色主题' : '深色主题'
                return (
                  <button key={themeMode} type="button" role="radio" aria-checked={selected} onClick={() => setTheme(themeMode)} className={`text-left rounded-2xl border p-2.5 sm:p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 ${selected ? 'bg-primary-500/10 border-primary-500 shadow-glow-sm' : 'bg-surface-200/30 border-line/40 hover:border-primary-500/50'}`}>
                    <ThemePreview mode={themeMode} />
                    <div className="flex items-center gap-2 mt-3 px-0.5">
                      <AppIcon name={themeMode === 'light' ? '☀️' : '🌙'} size={18} className={selected ? 'text-primary-500' : 'text-ink-muted'} />
                      <span className="text-sm sm:text-base font-semibold text-ink-strong">{label}</span>
                      {selected && <span className="ml-auto w-5 h-5 rounded-full bg-primary-500 text-ink-inverse flex items-center justify-center"><AppIcon name="✓" size={13} /></span>}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3 mt-7 max-w-lg mx-auto">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">返回</button>
              <button type="button" onClick={finish} className="btn-primary flex-1">完成登录</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
