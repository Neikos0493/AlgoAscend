# 🚀 AlgoAscend — C++算法竞赛多智能体AI学习平台

> 2026 年"中国软件杯"大学生软件设计大赛 A3 赛题参赛作品  
> 出题方：科大讯飞 | 赛题：基于大模型的个性化资源生成与学习多智能体系统开发

基于 **6 个专业 AI Agent 协同** 的 C++ 算法竞赛学习平台，集在线编译、智能对话、学习画像、错题笔记于一体。

---

## 🎯 核心功能

### 🤖 多智能体协同架构

| 智能体 | 职责 |
|--------|------|
| 🧠 学习画像分析师 | 对话式提取六维特征，动态更新画像 |
| 📚 内容生成专家 | 生成算法讲解、思维导图、代码案例、视频脚本 |
| 🏋️ 练习设计教练 | 设计选择题/填空题/算法编程题 |
| 🗺️ 学习路径规划师 | 7 阶段渐进路线 + 周计划里程碑 |
| 🎓 智能辅导老师 | 多模态答疑、逐步引导、代码调试 |
| 📊 学习评估分析师 | 掌握度评估、薄弱点识别、策略调整 |

### 📄 七大功能页面

| 页面 | 功能 |
|------|------|
| 💬 **智能对话** | SSE 流式对话 + AgentPipeline 可视化 + 模型切换 + 知识库 RAG |
| 📊 **学习仪表盘** | 统计卡片 + 五维雷达图 + 知识图谱 + 画像完善度 + 竞赛平台数据 |
| 🗺️ **学习路径** | 7 阶段渐进路线 + 里程碑完成追踪 |
| 💻 **代码编辑器** | Monaco Editor + g++ 在线编译运行 + 自由/答题双模式 + 测试用例验证 |
| 📚 **学习资源** | 洛谷/力扣/牛客三平台题库 + 内置 2200+ 题目 + 知识库教程 |
| 📓 **我的笔记** | 多类型笔记（文本/代码/资源）+ 做题思路/错误原因/更优解法 |
| 🧠 **学习画像** | 六维动态画像 + 竞赛平台绑定（7 大平台） |

### 💻 在线代码编辑器特性

- ⌨️ **Monaco Editor** — VS Code 同款编辑器，C++ 语法高亮与智能提示
- ⚡ **g++ 在线编译** — subprocess 沙箱执行，实时返回 stdout/stderr/编译错误
- 🧪 **LeetCode 式测试用例** — 批量输入→期望输出验证，全部通过弹出祝贺窗口
- 🔗 **联动入口** — 随机一题/资源题库/AI对话 均可一键跳转编辑器
- 🤖 **AI 编程助手** — 选中代码内嵌提问，流式回复，支持追问
- 📝 **代码笔记** — 提交后一键保存为笔记，记录思路与反思

### 🎨 UI 特性

- 🌌 **深色赛博主题** — 玻璃拟态卡片 + 发光边框 + 脉冲动画
- 💫 **粒子轨道环** — 3500 粒子彩虹环，点击果冻排斥效果
- 📱 **响应式设计** — 移动端侧边栏滑出
- ⚡ **流式输出** — 实时显示 AI 生成过程
- 🧮 **KaTeX + Mermaid** — 数学公式 + 图表渲染

---

## 🏗️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + Vite 5 | TypeScript |
| UI 样式 | Tailwind CSS 3 | 深色主题 + 自定义色板 |
| 代码编辑器 | Monaco Editor | VS Code 内核 |
| 图标库 | Lucide React | 线性图标 |
| 状态管理 | Zustand | 轻量响应式 + 多账号 |
| 粒子特效 | Canvas 2D | 自研轨道 + 弹簧物理引擎 |
| 后端框架 | FastAPI | Python 3.10+ |
| 数据库 | SQLite + SQLAlchemy | 零配置 |
| AI 推理 | DeepSeek / OpenAI 兼容 | 多模型注册表 |
| 多智能体 | CrewAI | Agent 编排与协作 |
| 爬虫 | httpx + BeautifulSoup4 | 洛谷/力扣/牛客题库 |

---

## 🚀 快速开始

### 环境要求

- **Python** 3.10+
- **Node.js** 18+
- **g++**（MinGW-w64，代码编译需要）
- **DeepSeek API Key**（[获取地址](https://platform.deepseek.com)）

### 1. 配置 API 密钥

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入 LLM_API_KEY
```

### 2. 安装依赖

```bash
# 后端
cd backend
pip install -r requirements.txt

# 前端
cd frontend
npm install
npm run build
```

### 3. 启动

```bash
# 方式一：一键启动（Windows）
双击 启动.bat

# 方式二：手动启动
cd backend && python main.py    # http://localhost:8000
cd frontend && npm run dev      # http://localhost:5173
```

---

## 📡 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/chat/send` | POST | 发送消息（SSE 流式） |
| `/api/chat/history/1` | GET | 获取对话历史 |
| `/api/profile/1` | GET | 获取学习画像 |
| `/api/resources/scrape/{platform}` | GET | 爬取平台题库 |
| `/api/code/run` | POST | 编译运行 C++ 代码 |
| `/api/code/run-tests` | POST | 批量运行测试用例 |
| `/api/code/g++-check` | GET | 检查编译器状态 |
| `/api/code/problem-detail` | GET | 获取题目详情（含样例） |
| `/api/error-notebook/{id}` | GET/POST/PUT/DELETE | 笔记 CRUD |
| `/api/assessment/evaluate` | POST | 综合学习评估 |

---

## 📁 项目结构

```
├── backend/
│   ├── main.py                     # FastAPI 入口
│   ├── config.py                   # 配置与智能体定义
│   ├── models.py                   # 数据库模型（含 Submission/ErrorNotebookEntry）
│   ├── database.py                 # 数据库管理
│   ├── llm_service.py              # LLM 调用服务
│   ├── agents/
│   │   ├── crewai_orchestrator.py  # CrewAI 编排器
│   │   ├── crewai_agents.py        # Agent 工厂函数
│   │   ├── tutor_agent.py          # 智能辅导
│   │   ├── exercise_agent.py       # 练习设计
│   │   ├── assessment_agent.py     # 效果评估
│   │   └── profile_agent.py        # 画像分析
│   └── routes/
│       ├── chat.py                 # 对话 API
│       ├── code_execution.py       # 代码编译执行 + 题目详情
│       ├── error_notebook.py       # 笔记 CRUD
│       ├── resources.py            # 资源生成 API
│       ├── problem_bank.py         # 内置 2284 题库
│       ├── scrape.py               # 在线爬虫
│       ├── knowledge.py            # 知识库搜索
│       └── assessment.py           # 评估 API
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── OrbitParticleRing.tsx  # 粒子轨道环 + 随机一题
│       │   ├── Sidebar.tsx            # 侧边栏导航
│       │   ├── AgentPipeline.tsx      # Agent 协作可视化
│       │   ├── ChatMessage.tsx        # 消息卡片 + 附件渲染
│       │   ├── CodeContextMenu.tsx    # 代码选中 AI 菜单
│       │   ├── MarkdownRenderer.tsx   # Markdown/Mermaid/代码高亮
│       │   ├── SettingsModal.tsx      # 模型设置 + 外观
│       │   ├── QuickActions.tsx       # 快捷操作
│       │   ├── Icon.tsx               # 统一图标组件
│       │   └── ...
│       ├── pages/
│       │   ├── ChatPage.tsx           # 智能对话
│       │   ├── DashboardPage.tsx      # 学习仪表盘
│       │   ├── PathPage.tsx           # 学习路径
│       │   ├── CodeEditorPage.tsx     # 在线代码编辑器
│       │   ├── ResourcesPage.tsx      # 学习资源
│       │   ├── ErrorNotebookPage.tsx  # 我的笔记
│       │   └── ProfilePage.tsx        # 学习画像
│       ├── services/
│       │   ├── codeExecutionService.ts    # 代码执行 API
│       │   ├── errorNotebookService.ts    # 笔记 API
│       │   └── ...
│       └── stores/useStore.ts
└── README.md
```

---

## 📝 许可证

MIT License © 2026 AlgoAscend
