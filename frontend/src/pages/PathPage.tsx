import { useState } from 'react'
import { useStore } from '../stores/useStore'

interface Milestone { name: string; desc: string; estimated: string; resourceIds: number[]; resourceLabels: string[] }
interface Stage { id: number; title: string; icon: string; colorClass: string; bgClass: string; borderClass: string; milestones: Milestone[] }

const STAGES: Stage[] = [
  { id: 0, title: 'C++ 基础语法巩固', icon: '🔤', colorClass: 'text-cyan-300', bgClass: 'bg-cyan-500/10', borderClass: 'border-cyan-500/20',
    milestones: [{ name: '变量、数据类型与运算符', desc: '掌握基本类型、const、auto、类型转换', estimated: '3天', resourceIds: [], resourceLabels: [] },
      { name: '控制结构（if/switch/循环）', desc: '分支逻辑、循环嵌套、break/continue', estimated: '2天', resourceIds: [], resourceLabels: [] },
      { name: '函数与递归基础', desc: '函数声明/定义、参数传递、递归思想', estimated: '3天', resourceIds: [], resourceLabels: [] },
      { name: '数组与字符串基础', desc: '一维/二维数组、C风格字符串、string类', estimated: '2天', resourceIds: [], resourceLabels: [] }] },
  { id: 1, title: '基础数据结构', icon: '📦', colorClass: 'text-emerald-300', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20',
    milestones: [{ name: '指针与引用', desc: '指针运算、动态内存、智能指针入门', estimated: '3天', resourceIds: [], resourceLabels: [] },
      { name: '链表（单/双/循环）', desc: '增删改查、反转、合并、环检测', estimated: '4天', resourceIds: [], resourceLabels: [] },
      { name: '栈与队列', desc: 'STL stack/queue、单调栈、优先队列', estimated: '3天', resourceIds: [], resourceLabels: [] },
      { name: '结构体与类基础', desc: '构造函数、运算符重载、排序规则', estimated: '2天', resourceIds: [], resourceLabels: [] }] },
  { id: 2, title: '基础算法入门', icon: '🧮', colorClass: 'text-amber-300', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/20',
    milestones: [{ name: '排序算法', desc: '8大排序、STL sort、自定义比较', estimated: '5天', resourceIds: [], resourceLabels: [] },
      { name: '二分查找与变体', desc: 'lower_bound/upper_bound、二分答案', estimated: '3天', resourceIds: [], resourceLabels: [] },
      { name: '双指针与滑动窗口', desc: '对撞指针、快慢指针、固定窗口', estimated: '3天', resourceIds: [], resourceLabels: [] },
      { name: '贪心算法初探', desc: '区间调度、最优装载、简单证明', estimated: '3天', resourceIds: [], resourceLabels: [] }] },
  { id: 3, title: '进阶数据结构', icon: '🌳', colorClass: 'text-violet-300', bgClass: 'bg-violet-500/10', borderClass: 'border-violet-500/20',
    milestones: [{ name: '二叉树与遍历', desc: '前中后序、层序、Morris遍历', estimated: '4天', resourceIds: [], resourceLabels: [] },
      { name: '堆与优先队列', desc: '大/小顶堆、堆排序、TopK问题', estimated: '2天', resourceIds: [], resourceLabels: [] },
      { name: '哈希表与并查集', desc: 'unordered_map/set、路径压缩', estimated: '3天', resourceIds: [], resourceLabels: [] },
      { name: '线段树与树状数组', desc: '区间查询/修改、离散化', estimated: '5天', resourceIds: [], resourceLabels: [] }] },
  { id: 4, title: '进阶算法', icon: '🚀', colorClass: 'text-rose-300', bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/20',
    milestones: [{ name: '深度优先搜索(DFS)', desc: '回溯框架、排列组合、剪枝优化', estimated: '5天', resourceIds: [], resourceLabels: [] },
      { name: '广度优先搜索(BFS)', desc: '最短路径、多源BFS、双端BFS', estimated: '3天', resourceIds: [], resourceLabels: [] },
      { name: '动态规划初步', desc: '背包九讲、LCS/LIS、状态转移设计', estimated: '7天', resourceIds: [], resourceLabels: [] },
      { name: 'Dijkstra与最短路', desc: '堆优化Dijkstra、Floyd、SPFA', estimated: '4天', resourceIds: [], resourceLabels: [] }] },
  { id: 5, title: '竞赛专题突破', icon: '🏆', colorClass: 'text-pink-300', bgClass: 'bg-pink-500/10', borderClass: 'border-pink-500/20',
    milestones: [{ name: '字符串算法', desc: 'KMP、Trie树、字符串哈希', estimated: '5天', resourceIds: [], resourceLabels: [] },
      { name: '数论基础', desc: '素数筛、快速幂、GCD/LCM、逆元', estimated: '5天', resourceIds: [], resourceLabels: [] },
      { name: '图论进阶', desc: '拓扑排序、最小生成树、Tarjan', estimated: '5天', resourceIds: [], resourceLabels: [] },
      { name: '蓝桥杯真题精练', desc: '2020-2023 真题分类训练', estimated: '10天', resourceIds: [], resourceLabels: [] }] },
  { id: 6, title: '综合训练与竞赛模拟', icon: '🎯', colorClass: 'text-indigo-300', bgClass: 'bg-indigo-500/10', borderClass: 'border-indigo-500/20',
    milestones: [{ name: '时间复杂度分析强化', desc: '主定理、均摊分析、时空权衡', estimated: '2天', resourceIds: [], resourceLabels: [] },
      { name: '综合模拟赛 ×3', desc: '4小时全真模拟、赛后题解复盘', estimated: '6天', resourceIds: [], resourceLabels: [] },
      { name: '错题回顾与模板整理', desc: '整理个人代码模板库、易错点清单', estimated: '3天', resourceIds: [], resourceLabels: [] },
      { name: '考前冲刺', desc: '高频考点回顾、心态调整、策略优化', estimated: '2天', resourceIds: [], resourceLabels: [] }] },
]

export default function PathPage() {
  const { toggleSidebar, dimensionsFilled } = useStore()
  const [expandedStage, setExpandedStage] = useState<number | null>(0)
  const progress: Record<number, number> = dimensionsFilled > 0
    ? { 0: 75, 1: 60, 2: 45, 3: 20, 4: 10, 5: 5, 6: 0 } : { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  const totalProgress = Math.round(Object.values(progress).reduce((a, b) => a + b, 0) / Object.keys(progress).length)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="flex items-center gap-3 px-6 py-4 bg-surface-100/80 backdrop-blur-xl border-b border-gray-700/30 shrink-0">
        <button className="lg:hidden text-gray-400 hover:text-gray-200" onClick={toggleSidebar}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex-1"><h2 className="text-lg font-semibold text-white">学习路径规划</h2><p className="text-xs text-gray-400">7 阶段渐进式学习路线，从入门到竞赛</p></div>
        <div className="flex items-center gap-2 text-sm"><span className="text-gray-400">总进度</span><span className="font-bold text-primary-300">{totalProgress}%</span></div>
      </header>

      <div className="p-6">
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4"><h3 className="text-base font-semibold text-white">📊 各阶段完成度</h3><span className="text-xs text-gray-500">每日更新</span></div>
          <div className="space-y-2">
            {STAGES.map((stage) => {
              const pct = progress[stage.id] || 0
              return (
                <div key={stage.id} className="flex items-center gap-3">
                  <span className="text-sm min-w-[24px] font-mono text-gray-500">S{stage.id}</span>
                  <span className="text-sm min-w-[100px] text-gray-300">{stage.title}</span>
                  <div className="flex-1 bg-gray-700/50 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-gray-600'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-500 w-10 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          {STAGES.map((stage) => {
            const isExpanded = expandedStage === stage.id; const pct = progress[stage.id] || 0
            return (
              <div key={stage.id} className={`card border ${isExpanded ? stage.borderClass : 'border-transparent'} cursor-pointer`}
                onClick={() => setExpandedStage(isExpanded ? null : stage.id)}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${stage.bgClass} flex items-center justify-center text-2xl`}>{stage.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500 bg-surface-300/50 px-1.5 py-0.5 rounded">阶段 {stage.id}</span>
                      <h3 className={`text-base font-semibold ${stage.colorClass}`}>{stage.title}</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${pct>=80?'bg-emerald-500/10 text-emerald-300':pct>=40?'bg-amber-500/10 text-amber-300':'bg-gray-700/30 text-gray-500'}`}>{pct}%</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">{stage.milestones.length} 个里程碑</span>
                      <span className="text-xs text-gray-500">{stage.milestones.reduce((s,m)=>{const mm=m.estimated.match(/(\d+)/);return mm?s+parseInt(mm[1]):s},0)} 天</span>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                <div className="mt-3 bg-gray-700/50 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-700 ${pct>=80?'bg-emerald-500':pct>=40?'bg-amber-500':'bg-gray-600'}`} style={{width:`${pct}%`}} />
                </div>
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-700/30 space-y-3">
                    {stage.milestones.map((m, idx) => (
                      <div key={idx} className="flex items-start gap-3 pl-2">
                        <div className="mt-1.5 w-6 h-6 rounded-full bg-primary-500/10 text-primary-300 flex items-center justify-center text-xs font-bold shrink-0 border border-primary-500/20">{idx+1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-200">{m.name}</span><span className="text-xs text-gray-500 bg-surface-300/50 px-1.5 py-0.5 rounded">{m.estimated}</span></div>
                          <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-primary-500/5 rounded-xl border border-primary-500/20">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h4 className="text-sm font-semibold text-primary-300">路径调整建议</h4>
              <p className="text-xs text-gray-400 mt-1">以上学习路径基于你的六维画像动态生成。在「智能对话」中说<strong className="text-primary-400">"我已学完XX"</strong>，AI会自动更新进度并调整后续路径。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
