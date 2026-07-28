import { Component, ReactNode } from 'react'
import { AppIcon } from './Icon'

interface Props { children: ReactNode; fallbackName?: string }
interface State { hasError: boolean; error: string }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message || String(error) }
  }

  componentDidCatch(error: Error, info: any) {
    console.error(`[ErrorBoundary:${this.props.fallbackName || 'unknown'}]`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <AppIcon name="⚠️" size={40} className="mb-4 text-amber-400" />
          <h2 className="text-lg font-semibold text-white mb-2">
            {this.props.fallbackName || '页面'} 加载失败
          </h2>
          <p className="text-sm text-red-400 mb-4 max-w-md text-center font-mono">
            {this.state.error}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: '' })
              window.location.reload()
            }}
            className="btn-primary text-sm px-4 py-2"
          >
            刷新页面
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
