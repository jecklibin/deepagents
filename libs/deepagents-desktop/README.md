# DeepAgents Desktop

基于 Electron + React + Tailwind CSS 构建的 DeepAgents 桌面客户端，连接 deepagents-web 后端服务。

## 功能特性

### 核心功能 (来自 deepagents-web)

- **AI 对话**: 通过 WebSocket 与 Agent 进行实时对话
- **技能管理**: 创建、编辑、删除和测试技能
  - 录制浏览器操作创建技能
  - 自然语言描述创建技能
  - 手动创建技能
- **浏览器录制**: 录制用户浏览器操作，自动生成 Playwright 脚本
- **任务执行**: 实时显示任务执行链和进度
- **HITL 支持**: Human-in-the-Loop 中断和决策确认

### 界面设计 (基于 RPA_Agent_Web页面_v3.html)

- **三栏布局**:
  - 左侧: 技能管理面板 (我的技能/技能市场)
  - 中央: 对话区域 (任务会话、技能编排、聊天历史)
  - 右侧: 执行链面板 (任务进度、系统资源)
- **顶部导航**: Logo、版本、日期、连接状态、用户头像
- **风险确认弹窗**: 高风险操作二次确认

## 技术栈

- **Electron**: 跨平台桌面应用框架
- **React 18**: 前端 UI 框架
- **Vite**: 快速构建工具
- **Tailwind CSS**: 原子化 CSS 框架
- **Zustand**: 轻量级状态管理
- **React Markdown**: Markdown 渲染

## 项目结构

```
deepagents-desktop/
├── electron/
│   ├── main.js          # Electron 主进程
│   └── preload.js       # 预加载脚本 (IPC 通信)
├── src/
│   ├── components/
│   │   ├── Header.jsx         # 顶部导航栏
│   │   ├── SkillsSidebar.jsx  # 左侧技能管理面板
│   │   ├── ChatArea.jsx       # 中央对话区域
│   │   ├── ExecutionPanel.jsx # 右侧执行链面板
│   │   ├── RiskModal.jsx      # 风险确认弹窗
│   │   ├── RecordingModal.jsx # 录制/创建技能弹窗
│   │   └── SalesChart.jsx     # ECharts 图表组件
│   ├── services/
│   │   ├── api.js       # REST API 服务
│   │   ├── websocket.js # WebSocket 服务
│   │   └── config.js    # 配置管理
│   ├── store/
│   │   ├── appStore.js      # 应用状态
│   │   ├── chatStore.js     # 聊天状态
│   │   ├── skillsStore.js   # 技能状态
│   │   └── recordingStore.js # 录制状态
│   ├── styles/
│   │   └── index.css    # Tailwind CSS 入口
│   ├── App.jsx          # 主应用组件
│   └── main.jsx         # React 入口
├── public/              # 静态资源目录
├── index.html           # HTML 模板
├── package.json         # 项目配置
├── vite.config.js       # Vite 配置
├── tailwind.config.js   # Tailwind 配置
├── postcss.config.js    # PostCSS 配置
├── .env.example         # 环境变量示例
├── .gitignore
└── README.md
```

## 快速开始

### 前置条件

1. 确保 deepagents-web 后端服务正在运行:
   ```bash
   cd libs/deepagents-web
   uv run deepagents-web
   ```

2. 后端默认运行在 `http://localhost:8000`

### 安装依赖

```bash
cd libs/deepagents-desktop
npm install
```

### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置后端地址
```

### 开发模式

启动 React 开发服务器:

```bash
npm run dev
```

启动 Electron + React 开发模式:

```bash
npm run electron:dev
```

### 构建打包

构建 React 应用:

```bash
npm run build
```

构建 Electron 桌面应用:

```bash
npm run electron:build
```

## API 集成

### REST API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/skills` | GET | 获取所有技能 |
| `/api/skills` | POST | 创建技能 |
| `/api/skills/{name}` | GET | 获取技能详情 |
| `/api/skills/{name}` | PUT | 更新技能 |
| `/api/skills/{name}` | DELETE | 删除技能 |
| `/api/skills/from-nl` | POST | 从自然语言创建技能 |
| `/api/skills/from-recording` | POST | 从录制创建技能 |
| `/api/skills/{name}/test` | POST | 测试技能 |
| `/api/browsers/profiles` | GET/POST | 浏览器配置文件管理 |

### WebSocket

| 端点 | 描述 |
|------|------|
| `/api/ws/chat` | AI 对话流式通信 |
| `/api/ws/recording` | 浏览器录制实时通信 |

## 界面预览

应用界面采用三栏布局:

1. **左侧栏 (280px)**:
   - 技能管理与技能市场切换
   - 新建技能 (录制/自然语言/手动)
   - 技能列表展示

2. **中央区域**:
   - 任务会话管理
   - 技能编排流程
   - 对话历史 (支持 Markdown)
   - 输入区域

3. **右侧栏 (320px)**:
   - 任务执行链可视化
   - 进度条显示
   - 系统资源监控

## License

MIT
