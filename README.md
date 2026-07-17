# 🚀 AlgoAscend — C++算法竞赛多智能体AI学习平台

> 2026 年"中国软件杯"大学生软件设计大赛 A3 赛题参赛作品  
> 出题方：科大讯飞 | 赛题：基于大模型的个性化资源生成与学习多智能体系统开发

基于 **6 个专业 AI Agent 协同** 的 C++ 算法竞赛学习平台，通过对话式交互构建学习画像，动态生成个性化学习资源，规划渐进式学习路径，并提供智能辅导答疑。

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

### 📄 五大功能页面

| 页面 | 功能 |
|------|------|
| 💬 **智能对话** | SSE 流式对话 + AgentPipeline 可视化 + 模型切换 |
| 📊 **学习仪表盘** | 统计卡片 + 五维雷达图 + 知识图谱 + 画像完善度 |
| 🗺️ **学习路径** | 7 阶段渐进路线 + 阶段解锁 |
| 📚 **学习资源** | 洛谷/力扣/牛客三平台实时爬取 + 难度筛选 + 内置 300 题库 |
| 🧠 **学习画像** | 六维动态画像 + 竞赛平台绑定（Codeforces/AtCoder/洛谷/牛客） |

### 🎨 UI 特性

- 🌌 **深色赛博主题** — 玻璃拟态卡片 + 发光边框 + 脉冲动画
- 💫 **粒子轨道环** — 3500 粒子彩虹环，点击果冻排斥效果，5px 运动拖尾
- 🔄 **页面过渡动画** — 淡入 + 上滑 0.3s
- 📱 **响应式设计** — 移动端侧边栏滑出
- ⚡ **流式输出** — 实时显示 AI 生成过程
- 🧮 **KaTeX 数学公式** — Markdown + 代码语法高亮

---

## 🏗️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + Vite 5 | TypeScript |
| UI 样式 | Tailwind CSS 3 | 深色主题 + 自定义色板 |
| 状态管理 | Zustand | 轻量响应式 |
| 粒子特效 | Canvas 2D | 自研轨道 + 弹簧物理引擎 |
| 后端框架 | FastAPI | Python 3.10+ |
| 数据库 | SQLite + SQLAlchemy | 零配置 |
| AI 推理 | DeepSeek API | 兼容 OpenAI 接口 |
| 多智能体 | CrewAI | Agent 编排与协作 |
| 爬虫 | httpx + BeautifulSoup4 | 洛谷/力扣/牛客题库 |

---

## 🚀 快速开始

### 环境要求

- **Python** 3.10+
- **Node.js** 18+
- **DeepSeek API Key**（[获取地址](https://platform.deepseek.com)）

### 1. 配置 API 密钥

```bash
# 创建 .env 文件
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入你的 LLM_API_KEY
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

FastAPI 同时提供前端静态文件和 API 服务，访问 **http://localhost:8000** 即可。

---

## 📡 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/chat/send` | POST | 发送消息（SSE 流式） |
| `/api/chat/history/1` | GET | 获取对话历史 |
| `/api/profile/1` | GET | 获取学习画像 |
| `/api/resources/{platform}` | GET | 获取学习资源 |
| `/api/resources/scrape/bank/{platform}` | GET | 爬取平台题库 |
| `/api/dashboard/1` | GET | 获取仪表盘数据 |
| `/api/agents` | GET | 列出所有智能体 |

---

## 📁 项目结构

```
├── backend/
│   ├── main.py                 # FastAPI 入口
│   ├── config.py               # 配置与智能体定义
│   ├── models.py               # 数据库模型
│   ├── database.py             # 数据库管理
│   ├── llm_service.py          # LLM 调用服务
│   ├── agents/
│   │   ├── orchestrator.py     # 智能体编排器
│   │   ├── profile_agent.py    # 画像分析
│   │   ├── content_agent.py    # 内容生成
│   │   ├── exercise_agent.py   # 练习设计
│   │   ├── path_agent.py       # 路径规划
│   │   ├── tutor_agent.py      # 智能辅导
│   │   ├── assessment_agent.py # 效果评估
│   │   └── crewai_orchestrator.py  # CrewAI 集成
│   ├── routes/
│   │   ├── chat.py             # 对话 API
│   │   ├── profile.py          # 画像 API
│   │   ├── resources.py        # 资源 API
│   │   ├── problem_bank.py     # 内置题库
│   │   ├── scrape.py           # 爬虫 API
│   │   └── platform.py         # 竞赛平台绑定
│   └── middleware/             # 安全中间件
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # 主应用
│   │   ├── components/
│   │   │   ├── OrbitParticleRing.tsx  # 粒子轨道环
│   │   │   ├── Sidebar.tsx            # 侧边栏
│   │   │   ├── AgentPipeline.tsx      # Agent 协作可视化
│   │   │   ├── ChatMessage.tsx        # 消息卡片
│   │   │   ├── RadarChart.tsx         # 五维雷达图
│   │   │   ├── KnowledgeGraph.tsx     # 知识图谱
│   │   │   ├── SettingsModal.tsx      # 模型设置
│   │   │   ├── QuickActions.tsx       # 快捷操作
│   │   │   ├── AccountBinding.tsx     # 平台绑定
│   │   │   ├── PageTransition.tsx     # 页面过渡
│   │   │   └── ParticleBackground.tsx # 粒子背景（已弃用）
│   │   ├── pages/
│   │   │   ├── ChatPage.tsx           # 智能对话
│   │   │   ├── DashboardPage.tsx      # 学习仪表盘
│   │   │   ├── PathPage.tsx           # 学习路径
│   │   │   ├── ResourcesPage.tsx      # 学习资源
│   │   │   └── ProfilePage.tsx        # 学习画像
│   │   ├── services/
│   │   │   ├── api.ts                 # API 封装
│   │   │   ├── curriculum.ts          # 课程体系
│   │   │   ├── platformService.ts     # 平台绑定服务
│   │   │   └── scrapeResources.ts     # 资源爬取
│   │   └── stores/
│   │       └── useStore.ts            # Zustand 全局状态
│   └── index.html
├── 启动.bat                   # Windows 一键启动
├── start.bat                  # 备用启动脚本
├── .env.example               # 环境变量模板
├── .gitignore
├── LICENSE                    # MIT
└── README.md
```

---

## 🛡️ 安全措施

- API Key 通过 `.env` 文件管理，不进入版本控制
- 安全中间件：输入长度限制、敏感信息过滤
- 内容安全过滤，结构化 Markdown 输出易于审核
- 画像数据带置信度评分，避免过度推断

---

## 📝 TODO

- [ ] 讯飞 SDK 工具集成
- [ ] 配套技术文档
- [ ] 演示视频 / PPT
- [ ] RAG 知识库接入
- [ ] 用户认证系统
- [ ] 语音交互

---

## 📄 许可证

MIT License © 2026 AlgoAscend
