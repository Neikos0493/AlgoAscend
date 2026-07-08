const actions = [
  {
    icon: '🧠',
    label: '分析我的学习画像',
    prompt: '请帮我全面分析我的学习画像，包括知识基础、认知风格、学习目标等六个维度',
  },
  {
    icon: '📚',
    label: '生成思维导图',
    prompt: '请为我生成关于「排序算法」的思维导图',
  },
  {
    icon: '🏋️',
    label: '出几道练习题',
    prompt: '请为我出几道关于数组和字符串的练习题，基础难度',
  },
  {
    icon: '🗺️',
    label: '规划学习路径',
    prompt: '请帮我规划一个完整的C++算法学习路径',
  },
  {
    icon: '📊',
    label: '评估学习效果',
    prompt: '请帮我评估一下目前的学习效果，给出改进建议',
  },
  {
    icon: '💻',
    label: '生成代码案例',
    prompt: '请生成一个关于二分查找的完整代码实操案例',
  },
]

export default function QuickActions({ onAction }: { onAction: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => onAction(action.prompt)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-all duration-200 shadow-sm"
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  )
}
