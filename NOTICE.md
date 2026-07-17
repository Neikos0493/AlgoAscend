# 开源组件声明 (Open Source Attribution)

本项目使用了以下开源组件，在此致谢：

## 前端 (Frontend)

| 包名 | 版本 | 协议 | 用途 |
|------|------|------|------|
| [React](https://react.dev/) | ^18.3.1 | MIT | 用户界面框架 |
| [Vite](https://vitejs.dev/) | ^5.3.4 | MIT | 前端构建工具 |
| [TypeScript](https://www.typescriptlang.org/) | ^5.5.3 | Apache-2.0 | 类型检查 |
| [Tailwind CSS](https://tailwindcss.com/) | ^3.4.6 | MIT | 原子化 CSS 框架 |
| [Zustand](https://github.com/pmndrs/zustand) | ^4.5.0 | MIT | 轻量状态管理 |
| [react-markdown](https://github.com/remarkjs/react-markdown) | ^9.0.1 | MIT | Markdown → React 渲染 |
| [remark-gfm](https://github.com/remarkjs/remark-gfm) | ^4.0.0 | MIT | GFM 表格/任务列表支持 |
| [remark-math](https://github.com/remarkjs/remark-math) | ^6.0.0 | MIT | Markdown 数学公式 |
| [rehype-katex](https://github.com/remarkjs/rehype-katex) | ^7.0.1 | MIT | KaTeX 数学公式渲染 |
| [KaTeX](https://katex.org/) | ^0.17.0 | MIT | 快速数学排版 |
| [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) | ^15.5.0 | MIT | 代码语法高亮 |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | ^4.3.1 | MIT | Vite React 插件 |
| [autoprefixer](https://github.com/postcss/autoprefixer) | ^10.4.19 | MIT | CSS 前缀自动添加 |
| [postcss](https://postcss.org/) | ^8.4.39 | MIT | CSS 后处理器 |

## 后端 (Backend)

| 包名 | 版本 | 协议 | 用途 |
|------|------|------|------|
| [FastAPI](https://fastapi.tiangolo.com/) | 0.115.0 | MIT | Web API 框架 |
| [Uvicorn](https://www.uvicorn.org/) | 0.30.0 | BSD-3-Clause | ASGI 服务器 |
| [SQLAlchemy](https://www.sqlalchemy.org/) | 2.0.35 | MIT | ORM 数据库映射 |
| [httpx](https://www.python-httpx.org/) | >=0.28.0 | BSD-3-Clause | HTTP 客户端 |
| [Pydantic](https://docs.pydantic.dev/) | >=2.11.0 | MIT | 数据验证 |
| [python-multipart](https://github.com/Kludex/python-multipart) | 0.0.9 | Apache-2.0 | 表单数据解析 |
| [CrewAI](https://docs.crewai.com/) | 1.15.2 | MIT | 多智能体编排框架 |

## AI / LLM 服务

| 服务 | 用途 | 条款 |
|------|------|------|
| [DeepSeek API](https://platform.deepseek.com/) | LLM 推理服务 | [DeepSeek 使用条款](https://platform.deepseek.com/terms) |
| OpenAI Compatible API | 备选 LLM 后端 | 按提供商协议 |

---

*本文件遵循赛题要求"使用开源项目标注来源与协议"，完整列出所有第三方依赖。*
*如有遗漏，请提交 Issue 或 PR 补充。*
