import { useState } from 'react'
import { useStore } from '../stores/useStore'
import { generateImage, generatePPT, generateMindmap, generateVideo, generateCodeCase, generateProject, getLLMApiKey, getSelectedModelId } from '../services/api'
import MindmapRenderer from './MindmapRenderer'
import MarkdownRenderer from './MarkdownRenderer'

type GenTab = 'image' | 'ppt' | 'mindmap' | 'video' | 'code_case' | 'project'
type VideoMode = 'manim' | 'xfyun'

const AVATARS = [
  { id: 'male_casual', name: '休闲男(可用)', icon: '👨' },
  { id: 'female_business', name: '商务女(可用)', icon: '👩‍💼' },
  { id: 'male_business', name: '商务男(待授权)', icon: '👨‍💼' },
  { id: 'female_casual', name: '休闲女(待授权)', icon: '👩' },
  { id: 'female_teacher', name: '教师女(待授权)', icon: '👩‍🏫' },
  { id: 'male_service', name: '服务男(待授权)', icon: '👨‍💻' },
]

const AVATARS_NOTE = '⚠️ 每个虚拟人形象需在讯飞控制台单独领取/购买。标"(可用)"的来自官方demo确认可用，"(待授权)"的需到 console.xfyun.cn → AI虚拟人 → 形象列表 获取实际可用ID后替换'

const TABS: { key: GenTab; label: string; icon: string }[] = [
  { key: 'image', label: 'AI 生图', icon: '🎨' },
  { key: 'ppt', label: 'AI PPT', icon: '📊' },
  { key: 'mindmap', label: '思维导图', icon: '🧠' },
  { key: 'video', label: 'AI 视频', icon: '🎬' },
  { key: 'code_case', label: '代码实操', icon: '💻' },
  { key: 'project', label: '实践项目', icon: '🏗️' },
]

const QUICK_ALGOS = [
  '冒泡排序', '快速排序', '归并排序', '堆排序', '插入排序',
  '二分查找', '线性查找',
  'BFS广度优先', 'DFS深度优先', 'Dijkstra最短路径',
  '二叉树前序遍历', '二叉树中序遍历', '二叉树后序遍历',
  '动态规划背包问题', '贪心算法', '链表反转',
]

export default function ResourceGenerator() {
  const { settings } = useStore()
  const llmModel = settings.selectedModelIds?.llm || 'deepseek-v4-flash'
  const [tab, setTab] = useState<GenTab>('image')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  // 图片相关
  const [imgPrompt, setImgPrompt] = useState('')
  const [imgWidth, setImgWidth] = useState(1024)
  const [imgHeight, setImgHeight] = useState(1024)

  // PPT 相关
  const [pptTopic, setPptTopic] = useState('')
  const [pptSlides, setPptSlides] = useState(6)
  const [pptStage, setPptStage] = useState<'idle' | 'outline' | 'detail' | 'building'>('idle')

  // 思维导图相关
  const [mmPrompt, setMmPrompt] = useState('')

  // 视频相关
  const [videoTopic, setVideoTopic] = useState('')
  const [videoCount, setVideoCount] = useState(16)
  const [videoScript, setVideoScript] = useState('')
  const [videoGuide, setVideoGuide] = useState('')
  const [videoMode, setVideoMode] = useState<VideoMode>('manim')
  const [xfyunAvatar, setXfyunAvatar] = useState('male_casual')

  // 代码实操相关
  const [codeCaseTopic, setCodeCaseTopic] = useState('')
  const [codeCaseContent, setCodeCaseContent] = useState('')

  // 实践项目相关
  const [projectTopic, setProjectTopic] = useState('')
  const [projectContent, setProjectContent] = useState('')

  const xfyunCreds = settings.modelCreds?.['xfyun-tti'] || {}
  const xfyunReady = !!(xfyunCreds.app_id && xfyunCreds.api_key && xfyunCreds.api_secret)

  const handleGenImage = async () => {
    if (!imgPrompt.trim()) return
    if (!xfyunReady) { setError('请先在设置中配置讯飞星火文生图鉴权信息'); return }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await generateImage({
        prompt: imgPrompt,
        width: imgWidth,
        height: imgHeight,
        appId: xfyunCreds.app_id,
        apiKey: xfyunCreds.api_key,
        apiSecret: xfyunCreds.api_secret,
        title: `AI 插图: ${imgPrompt.slice(0, 30)}`,
        topic: 'AI 生成图片',
      })
      setResult({ type: 'image', data: res })
    } catch (e: any) {
      setError(e.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const handleGenPPT = async () => {
    if (!pptTopic.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    // 模拟两阶段进度
    setPptStage('outline')
    try {
      const res = await generatePPT({
        topic: pptTopic,
        slidesCount: pptSlides,
      })

      setPptStage('building')
      // 短暂延迟让用户看到进度
      await new Promise(r => setTimeout(r, 300))

      setResult({ type: 'ppt', data: res })
      setPptStage('idle')
    } catch (e: any) {
      setError(e.message || '生成失败')
      setPptStage('idle')
    } finally {
      setLoading(false)
    }
  }

  const handleGenMindmap = async () => {
    if (!mmPrompt.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await generateMindmap({
        prompt: mmPrompt,
        title: `思维导图: ${mmPrompt.slice(0, 30)}`,
        topic: mmPrompt.slice(0, 30),
        model: llmModel,
      })
      setResult({ type: 'mindmap', data: res })
    } catch (e: any) {
      setError(e.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const handleGenCodeCase = async () => {
    if (!codeCaseTopic.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setCodeCaseContent('')
    try {
      const data = await generateCodeCase({ topic: codeCaseTopic, model: llmModel })
      setCodeCaseContent(data.content)
      setResult({ type: 'code_case', data })
    } catch (e: any) {
      setError(e.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const handleGenProject = async () => {
    if (!projectTopic.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setProjectContent('')
    try {
      const data = await generateProject({ topic: projectTopic, model: llmModel })
      setProjectContent(data.content)
      setResult({ type: 'project', data })
    } catch (e: any) {
      setError(e.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }
  const handleGenVideo = async () => {
    if (!videoTopic.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setVideoScript('')
    setVideoGuide('')
    try {
      const res = await generateVideo({
        topic: videoTopic.trim(),
        title: videoMode === 'xfyun' ? `数字人讲解: ${videoTopic.trim()}` : `算法动画: ${videoTopic.trim()}`,
        count: videoCount,
        mode: videoMode,
      })
      const resultType = videoMode === 'xfyun' ? 'xfyun_video' : 'video'
      setResult({ type: resultType, data: res })
      setVideoScript(res.script)
      if (res.install_guide) setVideoGuide(res.install_guide)
    } catch (e: any) {
      setError(e.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface-200/80 rounded-xl border border-gray-700/30 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
        <span>🪄</span> AI 资源生成器
      </h3>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-surface-300/30 rounded-lg p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setResult(null); setError('') }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t.key
                ? 'bg-primary-500/20 text-primary-300'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 图片生成 */}
      {tab === 'image' && (
        <div className="space-y-3">
          {!xfyunReady && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
              请先在 <b>设置 → API Key</b> 中配置讯飞星火文生图鉴权信息（APP ID + API Key + API Secret）
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">图片描述</label>
            <textarea
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              placeholder="描述你想要生成的图片，例如：一张讲解冒泡排序算法的示意图，蓝色背景，简洁风格"
              rows={3}
              className="w-full input-field resize-none text-sm"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">宽度</label>
              <select value={imgWidth} onChange={(e) => setImgWidth(Number(e.target.value))}
                className="w-full input-field text-sm">
                <option value={512}>512</option>
                <option value={768}>768</option>
                <option value={1024}>1024 (推荐)</option>
                <option value={1280}>1280</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">高度</label>
              <select value={imgHeight} onChange={(e) => setImgHeight(Number(e.target.value))}
                className="w-full input-field text-sm">
                <option value={512}>512</option>
                <option value={768}>768</option>
                <option value={1024}>1024 (推荐)</option>
                <option value={1280}>1280</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleGenImage}
            disabled={loading || !imgPrompt.trim() || !xfyunReady}
            className="w-full py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '🎨 生成中...' : '🎨 生成图片'}
          </button>
        </div>
      )}

      {/* PPT 生成 */}
      {tab === 'ppt' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              输入需求，AI 自动设计标题大纲并细化内容
            </label>
            <textarea
              value={pptTopic}
              onChange={(e) => setPptTopic(e.target.value)}
              placeholder={`描述你想要的PPT，越详细越好，例如：

帮我做一个关于快速排序算法的教学PPT，需要包含：
- 算法原理和思想
- 分区过程详解
- 时间复杂度分析
- C++ 代码实现
- 与其他排序算法的对比`}
              rows={6}
              className="w-full input-field resize-none text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">页数</label>
              <select value={pptSlides} onChange={e => setPptSlides(+e.target.value)}
                className="bg-surface-300/50 border border-gray-600/30 rounded px-2 py-1 text-[11px] text-gray-200">
                <option value={4}>4 页</option>
                <option value={6}>6 页</option>
                <option value={8}>8 页</option>
                <option value={10}>10 页</option>
                <option value={12}>12 页</option>
              </select>
            </div>

            {/* 两阶段进度提示 */}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-primary-400">
                <span className="animate-pulse-soft">
                  {pptStage === 'outline' && '🧠 正在设计大纲...'}
                  {pptStage === 'detail' && '📝 正在细化内容...'}
                  {pptStage === 'building' && '📊 正在生成 PPTX...'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleGenPPT}
            disabled={loading || !pptTopic.trim()}
            className="w-full py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳ AI 正在生成...' : '📊 AI 生成 PPT'}
          </button>
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mt-2">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* 思维导图 */}
      {tab === 'mindmap' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              输入主题，AI 自动生成完整导图
            </label>
            <textarea
              value={mmPrompt}
              onChange={(e) => setMmPrompt(e.target.value)}
              placeholder="例如：排序算法有哪些、动态规划经典问题、二叉树遍历方式、C++ STL 容器分类"
              rows={2}
              className="w-full input-field resize-none text-sm"
            />
          </div>
          <button
            onClick={handleGenMindmap}
            disabled={loading || !mmPrompt.trim()}
            className="w-full py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '🧠 AI 正在梳理知识结构...' : '🧠 AI 生成导图'}
          </button>
        </div>
      )}

      {/* 视频生成 */}
      {tab === 'video' && (
        <div className="space-y-3">
          {/* 模式选择器 */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">生成模式</label>
            <div className="flex gap-2">
              <button
                onClick={() => setVideoMode('manim')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  videoMode === 'manim'
                    ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                    : 'bg-surface-300/30 text-gray-400 hover:text-gray-200'
                }`}
              >
                🎬 Manim 算法动画
              </button>
              <button
                onClick={() => setVideoMode('xfyun')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  videoMode === 'xfyun'
                    ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                    : 'bg-surface-300/30 text-gray-400 hover:text-gray-200'
                }`}
              >
                🤖 讯飞数字人讲解
              </button>
            </div>
          </div>

          {/* 数字人形象选择（仅讯飞模式） */}
          {videoMode === 'xfyun' && (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">数字人形象</label>
              <div className="flex flex-wrap gap-1.5">
                {AVATARS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setXfyunAvatar(a.id)
                      // 持久化到模型凭证
                      try {
                        const creds = settings.modelCreds?.['xfyun-digital-human'] || {}
                        creds.avatar = a.id
                        const s = JSON.parse(localStorage.getItem('algoascend_settings') || '{}')
                        s.modelCreds = { ...s.modelCreds, 'xfyun-digital-human': creds }
                        localStorage.setItem('algoascend_settings', JSON.stringify(s))
                      } catch {}
                    }}
                    className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                      xfyunAvatar === a.id
                        ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                        : 'bg-surface-300/30 text-gray-400 hover:text-gray-200 hover:bg-surface-300/50'
                    }`}
                  >
                    {a.icon} {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 主题输入 */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              {videoMode === 'xfyun' ? '输入讲解主题' : '输入任意算法主题'}
            </label>
            <textarea
              value={videoTopic}
              onChange={(e) => setVideoTopic(e.target.value)}
              placeholder={
                videoMode === 'xfyun'
                  ? '数字人将为你讲解算法，例如：快速排序原理详解、动态规划入门、二叉树遍历方法...'
                  : '描述你想看的算法动画，例如：冒泡排序可视化、Dijkstra最短路径、二叉树前序遍历动画、动态规划背包问题...'
              }
              rows={2}
              className="w-full input-field resize-none text-sm"
            />
          </div>

          {/* 快捷选择（仅Manim模式） */}
          {videoMode === 'manim' && (
            <>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">快捷选择</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ALGOS.map(name => (
                    <button
                      key={name}
                      onClick={() => setVideoTopic(name)}
                      className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                        videoTopic === name
                          ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/30'
                          : 'bg-surface-300/30 text-gray-400 hover:text-gray-200 hover:bg-surface-300/50'
                      }`}
                    >{name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">数据量: {videoCount}</label>
                <input type="range" min={8} max={32} value={videoCount} onChange={e => setVideoCount(+e.target.value)}
                  className="w-full accent-primary-500" />
              </div>
            </>
          )}
          {videoMode === 'xfyun' && (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">快捷选择</label>
              <div className="flex flex-wrap gap-1.5">
                {['快速排序详解', '动态规划入门', '二叉树遍历', '链表操作', 'Dijkstra算法', 'BFS与DFS', '贪心算法', '二分查找'].map(name => (
                  <button
                    key={name}
                    onClick={() => setVideoTopic(name)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                      videoTopic === name
                        ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                        : 'bg-surface-300/30 text-gray-400 hover:text-gray-200 hover:bg-surface-300/50'
                    }`}
                  >{name}</button>
                ))}
              </div>
            </div>
          )}

          {/* 生成按钮 */}
          <button
            onClick={handleGenVideo}
            disabled={loading || !videoTopic.trim()}
            className={`w-full py-2 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${
              videoMode === 'xfyun'
                ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
                : 'bg-primary-500/20 hover:bg-primary-500/30 text-primary-300'
            }`}
          >
            {loading
              ? (videoMode === 'xfyun' ? '🤖 AI 正在生成数字人讲解...' : '🎬 AI 正在生成动画脚本...')
              : (videoMode === 'xfyun' ? '🤖 生成数字人讲解视频' : '🎬 生成算法动画视频')
            }
          </button>

          {/* 渲染中提示 */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse">
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
              <span>{videoMode === 'xfyun' ? '正在调用讯飞数字人服务...' : '正在生成 Manim 脚本并渲染...'}</span>
            </div>
          )}

          {/* Manim渲染输出日志 */}
          {videoGuide && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <pre className="text-[10px] text-amber-300 whitespace-pre-wrap font-mono">{videoGuide}</pre>
            </div>
          )}
        </div>
      )}

      {/* 代码实操 */}
      {tab === 'code_case' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              输入算法/数据结构主题，AI 生成带详细注释的完整实操代码
            </label>
            <textarea
              value={codeCaseTopic}
              onChange={(e) => setCodeCaseTopic(e.target.value)}
              placeholder="例如：手写红黑树、实现LRU缓存、Dijkstra最短路径、快速排序完整实现"
              rows={2}
              className="w-full input-field resize-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">快捷选择</label>
            <div className="flex flex-wrap gap-1.5">
              {['链表反转', 'LRU缓存', '快速排序', 'Dijkstra', '二叉树遍历', '并查集', '拓扑排序', 'KMP算法'].map(name => (
                <button
                  key={name}
                  onClick={() => setCodeCaseTopic(name)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                    codeCaseTopic === name
                      ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/30'
                      : 'bg-surface-300/30 text-gray-400 hover:text-gray-200 hover:bg-surface-300/50'
                  }`}
                >{name}</button>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenCodeCase}
            disabled={loading || !codeCaseTopic.trim()}
            className="w-full py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '💻 AI 正在生成代码案例...' : '💻 生成代码实操案例'}
          </button>
          {codeCaseContent && (
            <div className="max-h-96 overflow-y-auto bg-[#0f1117] rounded-lg p-4 border border-gray-700/30">
              <MarkdownRenderer content={codeCaseContent} />
            </div>
          )}
        </div>
      )}

      {/* 实践项目 */}
      {tab === 'project' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              输入项目主题，AI 设计完整的算法实践项目
            </label>
            <textarea
              value={projectTopic}
              onChange={(e) => setProjectTopic(e.target.value)}
              placeholder="例如：实现一个红黑树、设计一个简单的数据库索引、实现线程安全的LRU缓存、实现拓扑排序任务调度器"
              rows={2}
              className="w-full input-field resize-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">快捷选择综合项目</label>
            <div className="flex flex-wrap gap-1.5">
              {['红黑树', '线程池', 'LRU缓存', '任务调度器', 'B+树索引', '跳表', '布隆过滤器', '一致性哈希'].map(name => (
                <button
                  key={name}
                  onClick={() => setProjectTopic(name)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                    projectTopic === name
                      ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/30'
                      : 'bg-surface-300/30 text-gray-400 hover:text-gray-200 hover:bg-surface-300/50'
                  }`}
                >{name}</button>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenProject}
            disabled={loading || !projectTopic.trim()}
            className="w-full py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '🏗️ AI 正在设计项目方案...' : '🏗️ 生成实践项目案例'}
          </button>
          {projectContent && (
            <div className="max-h-96 overflow-y-auto bg-[#0f1117] rounded-lg p-4 border border-gray-700/30">
              <MarkdownRenderer content={projectContent} />
            </div>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 结果展示 */}
      {result && (
        <div className="p-4 bg-surface-300/30 rounded-xl border border-gray-700/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300">
              生成成功 {result.type === 'ppt' ? `(${result.data.slides} 页)` : ''}
            </span>
            {result.data.url && (
              <a
                href={result.data.url}
                download
                className="text-xs text-primary-400 hover:text-primary-300 underline"
              >
                下载
              </a>
            )}
          </div>

          {result.type === 'image' && result.data.base64 && (
            <div className="rounded-lg overflow-hidden border border-gray-600/30">
              <img
                src={`data:image/png;base64,${result.data.base64}`}
                alt="AI 生成图片"
                className="w-full"
              />
            </div>
          )}

          {result.type === 'ppt' && (
            <div className="text-xs text-gray-400">
              AI 已生成「{result.data.title}」，共 {result.data.slides} 张幻灯片。<br />
              点击上方"下载"链接保存 PPTX 到本地。
            </div>
          )}

          {result.type === 'mindmap' && (
            <div className="bg-[#0f1117] rounded-lg p-2 border border-gray-700/30">
              <MindmapRenderer tree={result.data.tree} />
            </div>
          )}

          {result.type === 'video' && (
            <div className="space-y-2">
              {result.data.video_url ? (
                <div className="rounded-lg overflow-hidden border border-gray-600/30 bg-black">
                  <video src={result.data.video_url} controls className="w-full max-h-80" autoPlay={false} />
                  <div className="px-3 py-1.5 bg-surface-300/50 flex items-center justify-between">
                    <span className="text-xs text-green-400">✅ Manim 渲染成功</span>
                    <a href={result.data.video_url} download className="text-xs text-primary-400 hover:text-primary-300 underline">
                      ⬇️ 下载视频
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {result.data.render_status === 'rendered' ? '✅ 已渲染' : '📝 Manim 脚本已生成'}
                    </span>
                    {result.data.render_output && (
                      <span className="text-[10px] text-amber-400 truncate max-w-[200px]">
                        {result.data.render_output.slice(0, 80)}
                      </span>
                    )}
                  </div>
                  <div className="bg-[#0d1117] rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
                    <pre className="text-[11px] text-gray-300 font-mono whitespace-pre">{result.data.script.slice(0, 2000)}{result.data.script.length > 2000 ? '\n... (截断)' : ''}</pre>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const blob = new Blob([result.data.script], { type: 'text/x-python' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a'); a.href = url; a.download = result.data.script_filename; a.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="px-3 py-1.5 bg-primary-500/20 text-primary-300 rounded-lg text-xs"
                    >⬇️ 下载脚本</button>
                    {result.data.render_output && (
                      <details className="text-xs">
                        <summary className="text-gray-500 cursor-pointer hover:text-gray-300">查看渲染日志</summary>
                        <pre className="mt-1 p-2 bg-[#0d1117] rounded text-[10px] text-gray-400 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{result.data.render_output}</pre>
                      </details>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {result.type === 'xfyun_video' && (
            <div className="space-y-2">
              {result.data.video_url ? (
                <div className="rounded-lg overflow-hidden border border-gray-600/30 bg-black">
                  <video src={result.data.video_url} controls className="w-full max-h-80" autoPlay={false} />
                  <div className="px-3 py-1.5 bg-surface-300/50 flex items-center justify-between">
                    <span className="text-xs text-green-400">✅ 数字人视频已录制</span>
                    <a href={result.data.video_url} download className="text-xs text-purple-400 hover:text-purple-300 underline">
                      ⬇️ 下载视频
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-400">
                      🤖 数字人「{result.data.avatar || '默认'}」讲解文稿
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      result.data.drive_status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {result.data.drive_status === 'success' ? '已驱动播报' : result.data.drive_status === 'xfyun_api_failed' ? 'API调用失败' : '未知状态'}
                    </span>
                  </div>
                  {result.data.stream_url && (
                    <div className="text-[10px] text-gray-500 bg-surface-300/30 rounded px-2 py-1 truncate">
                      RTMP 流地址: {result.data.stream_url}
                    </div>
                  )}
                  {result.data.message && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-300">
                      {result.data.message}
                    </div>
                  )}
                  <div className="bg-[#0d1117] rounded-lg p-3 overflow-y-auto max-h-48">
                    <pre className="text-[11px] text-gray-300 font-sans whitespace-pre-wrap">{result.data.script.slice(0, 2000)}{result.data.script.length > 2000 ? '\n...' : ''}</pre>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
