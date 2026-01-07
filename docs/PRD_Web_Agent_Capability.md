# PRD: Web Agent Capability for DeepAgents-CLI

## 1. 项目概述

### 1.1 背景
DeepAgents-CLI 目前支持文件操作、Shell命令执行、Web搜索等能力，但缺乏直接的浏览器自动化能力。通过集成 Playwright MCP，可以让 Agent 具备真实浏览器操作能力，实现更复杂的 Web 交互任务。

### 1.2 目标
通过 MCP (Model Context Protocol) 机制集成 Microsoft Playwright MCP Server，为 deepagents-cli 添加 Web Agent 能力，使其能够：
- 自动化浏览器操作（导航、点击、输入、截图等）
- 提取网页内容和结构信息
- 执行复杂的 Web 交互流程
- 支持多浏览器（Chromium、Firefox、WebKit）

### 1.3 参考资料
- Playwright MCP GitHub: https://github.com/microsoft/playwright-mcp
- DeepAgents 架构文档: [CLAUDE.md](../CLAUDE.md)
- LangChain MCP Adapters: https://github.com/langchain-ai/langchain-mcp-adapters

---

## 2. 技术架构

### 2.1 集成方式
基于 DeepAgents 现有架构，采用以下集成方案：

```
deepagents-cli
  ├── agent.py (create_cli_agent)
  │   └── 添加 PlaywrightMiddleware
  ├── integrations/
  │   └── playwright_mcp.py (新增)
  │       ├── PlaywrightMCPClient
  │       └── PlaywrightMiddleware
  └── config/
      └── mcp_servers.yaml (新增)
```

### 2.2 架构设计

**方案选择**：使用 Middleware 模式（符合 DeepAgents 架构）

```python
# 集成到现有 Middleware Stack
1. TodoListMiddleware
2. FilesystemMiddleware
3. PlaywrightMiddleware  # 新增
4. SubAgentMiddleware
5. SummarizationMiddleware
...
```

**关键组件**：

1. **PlaywrightMCPClient** - MCP 客户端封装
   - 管理与 Playwright MCP Server 的连接
   - 使用 langchain-mcp-adapters 转换 MCP tools 为 LangChain tools

2. **PlaywrightMiddleware** - 中间件实现
   - 实现 `AgentMiddleware` 协议
   - 注入 Playwright 工具到 Agent
   - 管理浏览器会话生命周期

3. **配置管理** - MCP Server 配置
   - 支持本地和远程 MCP Server
   - 可配置浏览器类型和选项

### 2.3 数据流

```
用户输入 "打开网页并提取标题"
  ↓
CLI 解析命令
  ↓
create_cli_agent() 加载 PlaywrightMiddleware
  ↓
PlaywrightMiddleware 连接 MCP Server
  ↓
MCP Server 返回可用工具列表
  ↓
langchain-mcp-adapters 转换为 LangChain tools
  ↓
Agent 接收到 playwright_navigate, playwright_click 等工具
  ↓
Agent 规划并执行工具调用
  ↓
HITL 中间件拦截（需要用户批准）
  ↓
工具执行 → MCP Server → Playwright 浏览器操作
  ↓
返回结果（截图、HTML、文本等）
  ↓
CLI 渲染输出
```

---

## 3. 功能需求

### 3.1 核心功能

#### 3.1.1 Playwright MCP 工具集成

基于 Playwright MCP Server 提供的标准工具：

| 工具名称 | 功能描述 | 参数 | 返回值 |
|---------|---------|------|--------|
| `playwright_navigate` | 导航到指定 URL | url, timeout | 页面加载状态 |
| `playwright_click` | 点击元素 | selector, timeout | 操作结果 |
| `playwright_fill` | 填充输入框 | selector, value | 操作结果 |
| `playwright_screenshot` | 截取页面截图 | full_page, path | 截图路径/Base64 |
| `playwright_evaluate` | 执行 JavaScript | script | 执行结果 |
| `playwright_get_text` | 提取元素文本 | selector | 文本内容 |
| `playwright_get_html` | 获取页面 HTML | selector (可选) | HTML 内容 |
| `playwright_wait_for` | 等待元素出现 | selector, timeout | 等待结果 |
| `playwright_select` | 选择下拉选项 | selector, value | 操作结果 |
| `playwright_hover` | 鼠标悬停 | selector | 操作结果 |

#### 3.1.2 浏览器会话管理

- **会话创建**：首次使用 Playwright 工具时自动创建浏览器会话
- **会话保持**：在同一对话中保持浏览器上下文（cookies、localStorage）
- **会话清理**：对话结束或超时后自动关闭浏览器
- **多标签页支持**：支持在多个标签页间切换

#### 3.1.3 配置管理

```yaml
# ~/.deepagents/agent/config/mcp_servers.yaml
playwright:
  enabled: true
  server:
    command: "npx"
    args: ["-y", "@microsoft/playwright-mcp"]
    # 或使用本地安装
    # command: "node"
    # args: ["path/to/playwright-mcp/dist/index.js"]
  options:
    browser: "chromium"  # chromium | firefox | webkit
    headless: true
    timeout: 30000
    viewport:
      width: 1280
      height: 720
```

### 3.2 用户交互

#### 3.2.1 命令行参数

```bash
# 启用 Playwright 支持
deepagents --enable-playwright

# 指定浏览器类型
deepagents --playwright-browser chromium

# 非无头模式（显示浏览器窗口）
deepagents --playwright-headful

# 禁用 Playwright（即使配置文件中启用）
deepagents --no-playwright
```

#### 3.2.2 HITL (Human-in-the-Loop) 集成

所有 Playwright 工具默认需要用户批准：

```python
interrupt_on = {
    "playwright_navigate": {"allowed_decisions": ["approve", "edit", "reject"]},
    "playwright_click": {"allowed_decisions": ["approve", "edit", "reject"]},
    "playwright_fill": {"allowed_decisions": ["approve", "edit", "reject"]},
    "playwright_screenshot": {"allowed_decisions": ["approve", "reject"]},
    "playwright_evaluate": {"allowed_decisions": ["approve", "edit", "reject"]},
    # ... 其他工具
}
```

用户可以通过 `--auto-approve` 跳过批准。

#### 3.2.3 输出展示

- **截图展示**：在终端中显示截图预览（使用 Rich 或保存到临时文件）
- **HTML 内容**：格式化显示提取的 HTML
- **操作日志**：显示每个浏览器操作的状态和耗时

### 3.3 错误处理

- **MCP Server 连接失败**：提示用户检查 Playwright MCP 安装
- **浏览器启动失败**：提供详细错误信息和解决方案
- **元素未找到**：返回友好的错误消息，建议使用不同的选择器
- **超时处理**：可配置的超时时间，超时后返回部分结果
- **网络错误**：捕获并报告网络请求失败

---

## 4. 技术实现要点

### 4.1 依赖管理

```toml
# libs/deepagents-cli/pyproject.toml
dependencies = [
    # ... 现有依赖
    "langchain-mcp-adapters>=0.1.0",  # MCP 适配器
]
```

外部依赖（用户需自行安装）：
```bash
# Playwright MCP Server (Node.js)
npx -y @microsoft/playwright-mcp
```

### 4.2 核心实现文件

#### 4.2.1 `libs/deepagents-cli/deepagents_cli/integrations/playwright_mcp.py`

```python
"""Playwright MCP integration for deepagents-cli."""

from langchain.agents.middleware import AgentMiddleware
from langchain_mcp_adapters.client import MultiServerMCPClient

class PlaywrightMCPClient:
    """管理 Playwright MCP Server 连接"""

    async def connect(self, config: dict) -> None:
        """连接到 MCP Server"""

    async def get_tools(self) -> list:
        """获取 Playwright 工具列表"""

    async def close(self) -> None:
        """关闭连接"""

class PlaywrightMiddleware(AgentMiddleware):
    """Playwright 中间件"""

    def __init__(self, config: dict):
        """初始化中间件"""

    async def setup(self) -> None:
        """设置 MCP 连接并加载工具"""

    def get_system_prompt(self, state) -> str:
        """返回 Playwright 工具使用说明"""

    async def cleanup(self) -> None:
        """清理资源"""
```

#### 4.2.2 `libs/deepagents-cli/deepagents_cli/agent.py` (修改)

```python
def create_cli_agent(..., enable_playwright: bool = False):
    """创建 CLI Agent"""

    middleware = [
        TodoListMiddleware(),
        FilesystemMiddleware(...),
    ]

    # 添加 Playwright 中间件
    if enable_playwright:
        playwright_config = load_playwright_config()
        middleware.append(PlaywrightMiddleware(playwright_config))

    middleware.extend([
        SubAgentMiddleware(...),
        # ... 其他中间件
    ])
```

#### 4.2.3 `libs/deepagents-cli/deepagents_cli/config.py` (扩展)

```python
def load_playwright_config() -> dict:
    """加载 Playwright MCP 配置"""

def validate_playwright_installation() -> bool:
    """验证 Playwright MCP 是否已安装"""
```

### 4.3 配置文件结构

```
~/.deepagents/agent/
  ├── agent.md
  ├── skills/
  └── config/
      └── mcp_servers.yaml  # 新增
```

### 4.4 系统提示词扩展

PlaywrightMiddleware 需要注入以下说明到系统提示词：

```markdown
## Playwright Browser Automation Tools

You have access to browser automation tools via Playwright:

- Use `playwright_navigate` to open web pages
- Use `playwright_click` to interact with elements
- Use `playwright_fill` to input text
- Use `playwright_screenshot` to capture page state
- Use `playwright_get_text` to extract content
- Use `playwright_evaluate` to run JavaScript

**Best Practices**:
- Always wait for page load before interacting
- Use specific CSS selectors or text content
- Take screenshots to verify actions
- Handle errors gracefully with retries

**Selector Examples**:
- CSS: `button.submit`, `#login-form`
- Text: `text=Click here`
- XPath: `//button[contains(text(), 'Submit')]`
```

---

## 5. 使用场景示例

### 5.1 场景一：网页数据提取

**用户输入**：
```
打开 https://example.com 并提取所有产品标题
```

**Agent 执行流程**：
1. 调用 `playwright_navigate(url="https://example.com")`
2. 等待页面加载完成
3. 调用 `playwright_evaluate(script="Array.from(document.querySelectorAll('.product-title')).map(el => el.textContent)")`
4. 返回提取的标题列表

### 5.2 场景二：表单自动填写

**用户输入**：
```
在 https://forms.example.com 填写注册表单：
- 用户名：testuser
- 邮箱：test@example.com
- 密码：SecurePass123
然后提交
```

**Agent 执行流程**：
1. `playwright_navigate(url="https://forms.example.com")`
2. `playwright_fill(selector="#username", value="testuser")`
3. `playwright_fill(selector="#email", value="test@example.com")`
4. `playwright_fill(selector="#password", value="SecurePass123")`
5. `playwright_click(selector="button[type=submit]")`
6. `playwright_screenshot()` 验证提交结果

### 5.3 场景三：网页测试

**用户输入**：
```
测试登录流程：
1. 打开 https://app.example.com/login
2. 输入错误的凭据
3. 验证是否显示错误消息
4. 输入正确的凭据
5. 验证是否成功登录
```

**Agent 执行流程**：
1. 导航到登录页
2. 填写错误凭据并提交
3. 使用 `playwright_get_text` 检查错误消息
4. 截图记录错误状态
5. 填写正确凭据并提交
6. 验证重定向到仪表板
7. 生成测试报告

---

## 6. 非功能需求

### 6.1 性能要求
- MCP Server 连接时间 < 3秒
- 单个浏览器操作响应时间 < 5秒
- 支持并发多个浏览器会话（通过 subagents）

### 6.2 安全要求
- 所有浏览器操作默认需要 HITL 批准
- 敏感操作（evaluate JavaScript）需要额外警告
- 不自动保存用户凭据
- 支持无痕模式（不保存 cookies）

### 6.3 兼容性要求
- 支持 Windows、macOS、Linux
- 兼容 Python 3.11+
- 支持 Node.js 18+ (Playwright MCP 要求)

### 6.4 可维护性要求
- 遵循 DeepAgents 现有代码风格（Ruff, mypy strict）
- 完整的类型注解
- 单元测试覆盖率 > 80%
- 详细的错误日志

---

## 7. 测试计划

### 7.1 单元测试
- `test_playwright_mcp_client.py` - MCP 客户端连接和工具加载
- `test_playwright_middleware.py` - 中间件初始化和工具注入
- `test_config_loading.py` - 配置文件解析和验证

### 7.2 集成测试
- `test_browser_operations.py` - 基本浏览器操作（导航、点击、输入）
- `test_content_extraction.py` - 内容提取和 JavaScript 执行
- `test_session_management.py` - 会话创建、保持、清理
- `test_hitl_integration.py` - HITL 批准流程

### 7.3 端到端测试
- 完整的 Web 自动化任务流程
- 多步骤表单填写和提交
- 错误处理和恢复

---

## 8. 实施计划

### 8.1 阶段划分

**Phase 1: 基础集成** (核心功能)
- [ ] 实现 PlaywrightMCPClient
- [ ] 实现 PlaywrightMiddleware
- [ ] 配置文件支持
- [ ] 基本工具集成（navigate, click, fill, screenshot）

**Phase 2: 完整功能** (扩展能力)
- [ ] 所有 Playwright 工具支持
- [ ] 会话管理
- [ ] HITL 集成
- [ ] 命令行参数

**Phase 3: 优化和文档** (生产就绪)
- [ ] 错误处理优化
- [ ] 性能优化
- [ ] 完整测试覆盖
- [ ] 用户文档和示例

### 8.2 依赖关系
- Phase 1 完成后才能进行 Phase 2
- Phase 2 完成后才能进行 Phase 3

---

## 9. 风险和挑战

### 9.1 技术风险
- **MCP 协议稳定性**：MCP 是较新的协议，可能存在兼容性问题
  - 缓解：使用官方 langchain-mcp-adapters，跟踪上游更新

- **浏览器资源消耗**：Playwright 浏览器占用大量内存
  - 缓解：实现会话超时和自动清理机制

- **跨平台兼容性**：不同操作系统的浏览器行为差异
  - 缓解：在多平台进行充分测试

### 9.2 用户体验风险
- **安装复杂度**：需要用户安装 Node.js 和 Playwright MCP
  - 缓解：提供详细的安装文档和自动检测脚本

- **性能感知**：浏览器操作可能较慢
  - 缓解：显示进度指示器，提供异步执行选项

---

## 10. 成功指标

### 10.1 功能指标
- ✅ 支持至少 10 个核心 Playwright 工具
- ✅ 成功率 > 95% (在正常网络条件下)
- ✅ 支持 3 种主流浏览器（Chromium, Firefox, WebKit）

### 10.2 性能指标
- ✅ MCP 连接时间 < 3秒
- ✅ 单个操作响应时间 < 5秒
- ✅ 内存占用 < 500MB (单个浏览器会话)

### 10.3 质量指标
- ✅ 单元测试覆盖率 > 80%
- ✅ 集成测试通过率 100%
- ✅ 无严重安全漏洞

---

## 11. 参考实现

### 11.1 类似项目
- Claude Desktop 的 MCP 集成
- LangChain MCP Adapters 示例
- Playwright Python API

### 11.2 相关文档
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Playwright Documentation](https://playwright.dev/)
- [LangChain MCP Adapters](https://github.com/langchain-ai/langchain-mcp-adapters)

---

## 附录 A: 配置文件完整示例

```yaml
# ~/.deepagents/agent/config/mcp_servers.yaml

# Playwright MCP Server 配置
playwright:
  enabled: true

  # MCP Server 启动配置
  server:
    command: "npx"
    args: ["-y", "@microsoft/playwright-mcp"]
    env:
      # 可选环境变量
      PLAYWRIGHT_BROWSERS_PATH: "~/.cache/ms-playwright"

  # Playwright 选项
  options:
    browser: "chromium"  # chromium | firefox | webkit
    headless: true
    timeout: 30000  # 默认超时（毫秒）

    # 视口大小
    viewport:
      width: 1280
      height: 720

    # 浏览器启动参数
    launch_options:
      args: []
      # - "--disable-gpu"
      # - "--no-sandbox"

    # 上下文选项
    context_options:
      ignore_https_errors: false
      accept_downloads: false

  # HITL 配置
  hitl:
    enabled: true
    auto_approve_readonly: false  # 是否自动批准只读操作（screenshot, get_text）

  # 会话管理
  session:
    max_idle_time: 300  # 最大空闲时间（秒）
    auto_cleanup: true
```

---

## 附录 B: 系统提示词完整版

```markdown
## Browser Automation with Playwright

You have access to browser automation capabilities through Playwright MCP tools.

### Available Tools

**Navigation & Page Control**:
- `playwright_navigate(url, timeout)` - Navigate to a URL
- `playwright_reload()` - Reload current page
- `playwright_go_back()` - Navigate back in history
- `playwright_go_forward()` - Navigate forward in history

**Element Interaction**:
- `playwright_click(selector, timeout)` - Click an element
- `playwright_fill(selector, value)` - Fill an input field
- `playwright_select(selector, value)` - Select dropdown option
- `playwright_hover(selector)` - Hover over an element
- `playwright_press(selector, key)` - Press a keyboard key

**Content Extraction**:
- `playwright_get_text(selector)` - Extract text content
- `playwright_get_html(selector)` - Get HTML content
- `playwright_get_attribute(selector, attribute)` - Get element attribute
- `playwright_screenshot(full_page, path)` - Capture screenshot

**Advanced Operations**:
- `playwright_evaluate(script)` - Execute JavaScript
- `playwright_wait_for(selector, timeout)` - Wait for element
- `playwright_wait_for_navigation(timeout)` - Wait for page load

### Best Practices

1. **Always wait for page load** before interacting with elements
2. **Use specific selectors** - prefer IDs or unique classes
3. **Verify actions** with screenshots or text extraction
4. **Handle errors gracefully** - retry with different selectors if needed
5. **Be mindful of timeouts** - adjust based on page complexity

### Selector Strategies

- **CSS Selectors**: `#id`, `.class`, `button[type="submit"]`
- **Text Content**: `text=Click here`, `text=/regex/`
- **XPath**: `//button[contains(text(), 'Submit')]`
- **Chaining**: `div.container >> button.submit`

### Example Workflow

```
1. playwright_navigate(url="https://example.com")
2. playwright_wait_for(selector="#content")
3. playwright_fill(selector="#search", value="query")
4. playwright_click(selector="button[type=submit]")
5. playwright_screenshot(full_page=true)
6. playwright_get_text(selector=".results")
```

### Security Notes

- All browser operations require user approval (HITL)
- JavaScript execution is monitored
- Sensitive data should not be logged
- Use incognito mode for privacy-sensitive tasks
```
