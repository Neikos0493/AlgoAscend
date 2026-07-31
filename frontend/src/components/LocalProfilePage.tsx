import { useState } from 'react'
import { ArrowLeft, Plus, UserRound } from 'lucide-react'
import { isAccountConfigured, useStore } from '../stores/useStore'
import OnboardingFlow from './OnboardingFlow'

interface LocalProfilePageProps {
  onComplete: () => void
  onBack: () => void
}

export default function LocalProfilePage({ onComplete, onBack }: LocalProfilePageProps) {
  const accounts = useStore(state => state.accounts)
  const activeAccountId = useStore(state => state.activeAccountId)
  const onboardingCompleted = useStore(state => state.onboardingCompleted)
  const switchAccount = useStore(state => state.switchAccount)
  const [creating, setCreating] = useState(false)

  const configuredAccounts = accounts.filter(account =>
    isAccountConfigured(account, onboardingCompleted),
  )
  const activeAccount = accounts.find(account => account.id === activeAccountId)
  const configurePlaceholder = !isAccountConfigured(activeAccount, onboardingCompleted)

  if (creating || (configurePlaceholder && configuredAccounts.length === 0)) {
    return (
      <OnboardingFlow
        mode={configurePlaceholder ? 'configure-placeholder' : 'create-profile'}
        onComplete={onComplete}
        onCancel={configuredAccounts.length > 0 ? () => setCreating(false) : onBack}
      />
    )
  }

  return (
    <div className="startup-profile-page">
      <section className="startup-profile-panel" aria-labelledby="profile-login-title">
        <button type="button" onClick={onBack} className="startup-back-button">
          <ArrowLeft size={18} /> 返回
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold tracking-[0.18em] text-primary-400">LOCAL PROFILES</p>
          <h1 id="profile-login-title" className="mt-3 text-3xl font-bold text-white">选择本地用户</h1>
          <p className="mt-3 text-sm text-white/60">学习资料仅保存在当前浏览器中。</p>
        </div>

        <div className="mt-8 grid gap-3">
          {configuredAccounts.map(account => {
            const current = account.id === activeAccountId
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  switchAccount(account.id)
                  onComplete()
                }}
                className={`startup-profile-option ${current ? 'startup-profile-option-current' : ''}`}
                aria-label={`使用本地用户 ${account.nickname}`}
              >
                <span className="startup-profile-avatar" aria-hidden="true">{account.avatar}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-base font-semibold text-white">{account.nickname}</span>
                  <span className="mt-0.5 block text-xs text-white/45">{current ? '当前用户' : '点击切换'}</span>
                </span>
                <UserRound size={18} className="text-primary-300" aria-hidden="true" />
              </button>
            )
          })}
        </div>

        <button type="button" onClick={() => setCreating(true)} className="startup-create-profile">
          <Plus size={18} /> 创建本地用户
        </button>
      </section>
    </div>
  )
}
