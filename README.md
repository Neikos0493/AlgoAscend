# ⚡ C++算法学习平台 - 多智能体AI辅助系统

基于**多智能体协同架构**的C++算法竞赛学习平台，支持对话式画像构建、个性化资源生成、学习路径规划和智能辅导。

## 🎯 核心功能

### 1. 对话式学习画像自主构建 🧠
- 通过自然语言对话自动提取学生特征
- **六维动态画像**：知识基础、认知风格、学习目标、易错点偏好、学习节奏、兴趣领域
- 支持画像随学随新，版本化管理

### 2. 多智能体协同资源生成 📚
6个专业智能体协作，生成**5+种个性化资源**：
| 资源类型 | 负责智能体 | 说明 |
|---------|-----------|------|
| 📄 算法讲解文档 | 内容生成专家 | 结构化Markdown教程 |
| 🧠 知识点思维导图 | 内容生成专家 | 层级化知识结构 |
| 🏋️ 多类型练习题 | 练习设计教练 | 选择题/填空题/算法设计题 |
| 📖 拓展阅读材料 | 内容生成专家 | 行业应用/竞赛视角/进阶方向 |
| 🎬 视频脚本 | 内容生成专家 | 教学视频文字脚本 |
| 💻 代码实操案例 | 内容生成专家 | 完整C++代码+解析 |

### 3. 个性化学习路径规划 🗺️
- 6阶段渐进式学习路线（入门→竞赛）
- 周计划分解与里程碑设置
- 基于画像的动态调整

### 4. 智能辅导答疑 🎓 
- 多模态解答：文字详解 + 图解 + 代码示例
- 逐步引导思考，识别常见错误
- 调试帮助和代码解释

### 5. 学习效果评估 📊 
- 多维度掌握度评估
- 薄弱环节识别
- 动态策略调整建议

## 🏗️ 技术架构

```
┌──────────────────────────────────┐
│          React前端 (Vite)         │
│   Tailwind CSS + Markdown渲染     │
│   流式对话 + 卡片化展示            │
└──────────────┬───────────────────┘
               │ SSE/HTTP
┌──────────────┴───────────────────┐
│      FastAPI 后端 (Python)       │
│  ┌─────────────────────────────┐ │
│  │    多智能体编排器              │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐   │ │
│  │  │画像 │ │内容 │ │练习 │   │ │
│  │  │分析 │ │生成 │ │设计 │   │ │
│  │  └─────┘ └─────┘ └─────┘   │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐   │ │
│  │  │路径 │ │辅导 │ │评估 │   │ │
│  │  │规划 │ │答疑 │ │分析 │   │ │
│  │  └─────┘ └─────┘ └─────┘   │ │
│  └─────────────────────────────┘ │
│         SQLite 数据库             │
└──────────────┬───────────────────┘
               │ API
       ┌───────┴───────┐
       │   LLM API     │
       │ (DeepSeek/    │
       │  OpenAI兼容)   │
       └───────────────┘
```

## 🚀 快速开始

### 环境要求
- **Python** 3.10+
- **Node.js** 18+ (前端开发)
- **API密钥**: [DeepSeek](https://platform.deepseek.com) 或 OpenAI 兼容接口

### 1. 配置API密钥

```bash
# Windows
set LLM_API_KEY=sk-your-api-key-here

# Linux/Mac
export LLM_API_KEY=sk-your-api-key-here
```

可选：创建 `.env` 文件（参考 `.env.example`）

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
python main.py
```

后端运行在 http://localhost:8000

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:5173

### 4. 一键启动 (Windows)

双击 `start.bat`

## 📡 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/chat/send` | POST | 发送消息(SSE流式) |
| `/api/chat/history/1` | GET | 获取对话历史 |
| `/api/profile/1` | GET | 获取学生画像 |
| `/api/resources/1` | GET | 获取学习资源 |
| `/api/dashboard/1` | GET | 获取仪表盘数据 |
| `/api/agents` | GET | 列出所有智能体 |

## 🎨 界面特性

- ✅ 流式输出，实时显示AI生成过程
- ✅ Markdown完整渲染 + 代码语法高亮
- ✅ 多模态内容卡片化展示
- ✅ 响应式设计，支持移动端
- ✅ 6个智能体在线状态可见
- ✅ 实时画像完善度追踪

## 📦 项目结构

```
├── backend/                # Python后端
│   ├── main.py            # FastAPI入口
│   ├── config.py          # 配置和智能体定义
│   ├── models.py          # 数据库模型
│   ├── database.py        # 数据库管理
│   ├── llm_service.py     # LLM调用服务
│   ├── agents/            # 智能体模块
│   │   ├── orchestrator.py   # 编排器
│   │   ├── profile_agent.py  # 画像分析
│   │   ├── content_agent.py  # 内容生成
│   │   ├── exercise_agent.py # 练习设计
│   │   ├── path_agent.py     # 路径规划
│   │   ├── tutor_agent.py    # 智能辅导
│   │   └── assessment_agent.py # 效果评估
│   └── routes/            # API路由
├── frontend/              # React前端
│   ├── src/
│   │   ├── App.tsx        # 主应用
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   ├── services/      # API服务
│   │   └── stores/        # 状态管理
│   └── index.html
├── start.bat              # 一键启动
└── README.md
```

## 🔧 使用的大模型与框架

| 名称 | 用途 | 协议 |
|------|------|------|
| DeepSeek API | LLM推理服务 | DeepSeek 使用条款 |
| OpenAI Compatible API | 备选LLM后端 | 按提供商协议 |
| FastAPI | Web框架 | MIT |
| React | 前端框架 | MIT |
| Tailwind CSS | UI样式 | MIT |
| Zustand | 状态管理 | MIT |
| react-markdown | Markdown渲染 | MIT |
| SQLAlchemy | ORM | MIT |

## 🛡️ 安全与防幻觉

1. **内容安全过滤**：所有生成内容通过Markdown结构化输出，易于审核
2. **置信度追踪**：画像数据带有置信度评分，避免过度推断
3. **来源透明**：每个资源标注生成智能体和时间
4. **用户可控**：支持清空历史和删除资源

## 📝 后续优化方向

- 接入RAG知识库，提升算法内容准确性
- 支持OJ平台对接，自动获取练习数据
- 添加语音交互功能
- 引入更多LLM提供商（通义千问、文心、星火等）
- 添加用户认证系统
