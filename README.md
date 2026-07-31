# 🚀 AlgoAscend — C++ 算法竞赛多智能体 AI 学习平台

> 2026 年“中国软件杯”大学生软件设计大赛 A3 赛题参赛作品
>
> 出题方：科大讯飞｜赛题：基于大模型的个性化资源生成与学习多智能体系统开发

AlgoAscend 是一套面向 C++ 算法竞赛学习者的个性化学习平台。系统通过 6 个专业 AI Agent 协同工作，将智能问答、学习画像、资源生成、题库检索、在线编译、学习路径和错题复盘整合到同一工作流中。

---

## ✨ 当前能力

### 🤖 六智能体协作

| 智能体 | 主要职责 |
| --- | --- |
| 🧠 学习画像分析师 | 从对话中提取六维特征并持续更新画像 |
| 📚 内容生成专家 | 生成算法讲解、思维导图、代码案例等个性化资料 |
| 🏋️ 练习设计教练 | 设计选择题、填空题、代码题和针对性训练 |
| 🗺️ 学习路径规划师 | 规划 7 阶段学习路线、周计划与里程碑 |
| 🎓 智能辅导老师 | 提供流式答疑、代码调试、图解和递进式引导 |
| 📊 学习评估分析师 | 评估掌握度、定位薄弱点并给出调整建议 |

### 🧭 八大功能页面

| 页面 | 功能 |
| --- | --- |
| **智能对话** | SSE 流式回复、Agent 流程可视化、知识库检索、Markdown / KaTeX / Mermaid 渲染 |
| **学习仪表盘** | 学习统计、雷达图、知识图谱、画像完善度和竞赛平台数据 |
| **学习资源生成** | 生成文档、思维导图、代码案例、项目、演示文稿、图片及视频类资源 |
| **代码宝库** | 洛谷、力扣、牛客题目搜索，支持本地题库、分类筛选与题目详情 |
| **学习画像** | 六维动态画像、学习偏好和竞赛平台账号绑定 |
| **学习路径** | 7 阶段渐进路线和里程碑追踪 |
| **代码编辑器** | Monaco Editor、C++ 编译运行、测试用例验证、AI 代码助手和题目联动 |
| **错题本** | 文本/代码/资源笔记，记录解题思路、错误原因和优化方案 |

### 💻 题库与编程闭环

- 内置牛客题库，可在不配置 Cookie 的情况下搜索和查看已收录题目。
- 题目使用统一标识，支持从本地目录、SQLite 持久缓存和在线平台依次获取详情。
- 洛谷、力扣、牛客题面可呈现描述、输入输出、样例、限制与提示等结构化内容。
- 题面图片通过后端白名单代理按需下载，限制协议、主机、格式和体积，并清理图片元数据。
- 题库、随机一题和 AI 对话均可将题目与代码移交给编辑器。
- 后端使用 g++ 编译并在受限子进程环境中运行 C++，支持单次执行和批量测试。
- 提交结果可保存到错题本，形成“找题 → 编码 → 验证 → 复盘”的学习闭环。

### 🎨 个性化体验

- 品牌启动动画、本地用户选择和首次使用引导。
- 本地多用户资料隔离，昵称、专业、年级和学习状态持久化在当前浏览器。
- 深色/浅色主题、响应式布局和减少动态效果偏好支持。
- 粒子轨道、页面过渡、玻璃拟态卡片和统一 Lucide 图标体系。

---

## 🏗️ 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18、TypeScript 5、Vite 5 |
| 样式与交互 | Tailwind CSS 3、Lucide React、Canvas 2D / tsParticles |
| 编辑与内容渲染 | Monaco Editor、react-markdown、KaTeX、Mermaid |
| 状态管理 | Zustand + LocalStorage |
| 后端 | FastAPI、Uvicorn、Pydantic |
| 数据存储 | SQLite、SQLAlchemy |
| AI 与智能体 | DeepSeek / OpenAI 兼容接口、CrewAI |
| 网络与解析 | httpx、BeautifulSoup4、Pillow |
| C++ 执行 | g++、subprocess、psutil |

---

## 🚀 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- g++（仅在线编译与测试功能需要；Windows 可安装 MinGW-w64）
- 一个 OpenAI 兼容的 LLM API Key（默认配置为 DeepSeek）

### 1. 克隆并配置环境变量

```bash
git clone https://github.com/Neikos0493/AlgoAscend.git
cd AlgoAscend
cp backend/.env.example backend/.env
```

Windows 命令提示符可使用：

```bat
copy backend\.env.example backend\.env
```

编辑 `backend/.env`，至少填写：

```dotenv
LLM_API_KEY=your_api_key_here
```

常用可选配置：

```dotenv
LLM_PROVIDER=deepseek
LLM_API_BASE=https://api.deepseek.com
LLM_MODEL=deepseek-chat
HOST=0.0.0.0
PORT=8000
DATABASE_URL=sqlite:///./learning_platform.db
NOWCODER_COOKIE=
```

> `NOWCODER_COOKIE` 只用于可选的牛客实时题面访问；内置牛客题库不依赖 Cookie。请勿提交真实 API Key 或 Cookie。

### 2. 安装依赖

```bash
# 后端
cd backend
python -m pip install -r requirements.txt

# 前端（从项目根目录执行）
cd ../frontend
npm install
```

### 3. 启动开发环境

方式一：Windows 一键启动，在项目根目录双击 `start.bat`。脚本会安装缺失依赖并分别启动前后端。

方式二：打开两个终端手动启动：

```bash
# 终端 1
cd backend
python main.py

# 终端 2
cd frontend
npm run dev
```

访问地址：

- 前端：<http://localhost:5173>
- 后端 API：<http://localhost:8000/api>
- Swagger 文档：<http://localhost:8000/docs>

### 4. 生产构建

```bash
cd frontend
npm run build
cd ../backend
python main.py
```

前端完成构建后，FastAPI 会自动托管 `frontend/dist`。

---

## ✅ 测试与检查

```bash
# 后端单元测试
cd backend
python -m unittest discover -s tests -p "test_*.py"

# 前端类型检查与生产构建
cd frontend
npm run build
```

后端测试覆盖题目身份归一化、牛客目录与解析、详情缓存、题面媒体安全代理、代码执行环境隔离和错题本 CRUD 等关键路径。

---

## 📡 主要 API

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/chat/send` | POST | 发送消息并以 SSE 流式返回 |
| `/api/chat/history/{student_id}` | GET / DELETE | 查询或清空对话历史 |
| `/api/profile/{student_id}` | GET / PUT | 查询或更新学习画像 |
| `/api/dashboard/{student_id}` | GET | 获取仪表盘聚合数据 |
| `/api/resources/*` | GET / POST / DELETE | 资源推荐、生成、读取与删除 |
| `/api/resources/scrape/{platform}` | GET | 获取洛谷、力扣或牛客题目列表 |
| `/api/resources/scrape/catalog/nowcoder` | GET | 搜索内置牛客目录 |
| `/api/code/problem-detail` | GET | 获取统一结构的题目详情 |
| `/api/code/problem-media/{media_key}` | GET | 安全读取题面图片缓存 |
| `/api/code/g++-check` | GET | 检查本机 g++ 状态 |
| `/api/code/run` | POST | 编译并运行 C++ 代码 |
| `/api/code/run-tests` | POST | 批量运行测试用例 |
| `/api/code/ai-summary` | POST | 生成代码总结或反馈 |
| `/api/error-notebook/{student_id}` | GET / POST | 查询或创建错题笔记 |
| `/api/error-notebook/{student_id}/{entry_id}` | GET / PUT / DELETE | 查询、更新或删除单条笔记 |
| `/api/knowledge/*` | GET / POST | 知识库检索、条目读取与重建 |
| `/api/assessment/evaluate` | POST | 执行综合学习评估 |

完整、可交互的接口定义以运行后的 `/docs` 为准。

---

## 📁 项目结构

```text
AlgoAscend/
├── backend/
│   ├── main.py                         # FastAPI 入口与路由注册
│   ├── config.py                       # LLM、数据库和服务配置
│   ├── database.py                     # SQLite / SQLAlchemy 初始化与迁移
│   ├── models.py                       # 学生、资源、提交、笔记和缓存模型
│   ├── llm_service.py                  # OpenAI 兼容 LLM 调用
│   ├── problem_identity.py             # 跨平台题目身份归一化
│   ├── problem_catalog.py              # 内置题库读取与检索
│   ├── problem_detail_service.py       # 本地优先的题目详情与持久缓存
│   ├── problem_media_service.py        # 安全题面图片代理与缓存
│   ├── nowcoder_http.py                # 牛客可选实时请求客户端
│   ├── agents/                         # CrewAI 编排及各专业 Agent
│   ├── routes/                         # 聊天、题库、执行、资源、画像等 API
│   └── tests/                          # 后端单元测试
├── frontend/
│   ├── public/                         # 静态资源
│   └── src/
│       ├── components/                 # 品牌、引导、图表和通用组件
│       ├── hooks/                      # 前端复用 Hooks
│       ├── pages/                      # 八个主要业务页面
│       ├── services/                   # API、题目移交和个性化服务
│       ├── stores/useStore.ts          # 全局状态与本地用户数据
│       ├── theme.ts                    # 深浅主题持久化
│       └── App.tsx                     # 启动流程与页面编排
├── docs/                               # 项目文档与素材
├── start.bat                           # Windows 一键启动脚本
└── README.md
```

---

## 🔐 数据与安全说明

- `.env`、数据库、日志、构建缓存和本地调试截图已在 `.gitignore` 中排除。
- 在线 C++ 运行仅适合本地开发和教学演示；公开部署前应使用独立容器或沙箱服务，并设置更严格的 CPU、内存、文件系统和网络隔离。
- 牛客实时访问可能受登录状态、Cookie 有效期和站点策略影响；默认优先使用内置目录及持久缓存。
- 本地用户资料主要保存在浏览器 LocalStorage 中；清理站点数据会删除这些本地资料。

---

## 📝 许可证

MIT License © 2026 AlgoAscend
