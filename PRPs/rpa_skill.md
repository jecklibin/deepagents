---                                                                                                                                     
  name: "RPA Skill Extension - 通过编排RPA流程构建Skill"                                                                                  
  description: |                                                                                                                          
    扩展DeepAgents的Skill系统，支持通过可视化编排RPA流程来构建技能。                                                                      
    参考AstronRPA的架构设计，实现组件化、可编排的RPA能力。                                                                                
                                                                                                                                            ---
                                                                                                                                          
  ## Goal        

  扩展现有的Skill系统，新增 `type: rpa`
  类型的技能，允许用户通过编排RPA流程（而非编写代码）来创建自动化技能。RPA流程以JSON格式存储，运行时由RPA执行引擎解析并执行。

  ## Why

  - **降低技能创建门槛**：用户无需编写Python/Playwright代码，通过可视化编排即可创建自动化技能
  - **复用AstronRPA能力**：利用AstronRPA成熟的300+原子操作组件
  - **统一技能管理**：RPA技能与现有的手动技能、浏览器技能统一管理
  - **增强Agent能力**：Agent可以调用RPA技能执行复杂的桌面/浏览器自动化任务

  ## What

  ### 用户可见行为

  1. **创建RPA技能**：用户可以通过Web UI创建RPA类型的技能
  2. **编排RPA流程**：拖拽组件、配置参数、连接流程
  3. **测试RPA技能**：在UI中测试RPA流程执行
  4. **Agent调用**：Agent可以像调用其他技能一样调用RPA技能

  ### 技术要求

  1. 新增 `type: rpa` 技能类型
  2. 定义RPA工作流JSON Schema
  3. 实现RPA执行引擎（复用AstronRPA模式）
  4. 提供原子操作组件库
  5. 前端工作流编辑器

  ### Success Criteria

  - [ ] RPA技能可以通过API创建、读取、更新、删除
  - [ ] RPA工作流JSON可以被正确解析和执行
  - [ ] 支持至少20个核心原子操作（浏览器、文件、系统等）
  - [ ] Agent可以成功调用RPA技能并获取结果
  - [ ] 错误处理和重试机制正常工作
  - [ ] 所有测试通过：`pytest tests/ -v`

  ---

  ## All Needed Context

  ### Documentation & References

  ```yaml
  # MUST READ - 核心参考文档
  - file: examples/astron-rpa/engine/shared/astronverse-actionlib/src/astronverse/actionlib/atomic.py
    why: 原子操作装饰器模式，AtomicManager类实现，参数验证和执行逻辑

  - file: examples/astron-rpa/engine/servers/astronverse-executor/src/astronverse/executor/flow/flow.py
    why: 工作流JSON到Python代码的转换逻辑，Flow类实现

  - file: libs/deepagents-web/deepagents_web/services/skill_service.py
    why: 现有技能服务实现，CRUD操作，浏览器技能创建模式

  - file: libs/deepagents-web/deepagents_web/models/recording.py
    why: ActionType枚举，RecordedAction模型，可复用的动作类型定义

  - file: libs/deepagents-web/deepagents_web/services/skill_executor.py
    why: 现有技能执行器，subprocess执行模式，结果处理

  - url: https://www.iflyrpa.com/docs/astronrpa-overview.html
    why: AstronRPA官方文档，理解命令分类、元素系统、数据类型

  - file: CLAUDE.md
    why: 项目规范、代码风格、测试要求

  Current Codebase Tree

  libs/deepagents-web/deepagents_web/
  ├── api/
  │   ├── skills.py          # 技能REST API端点
  │   ├── recording.py       # 录制API端点
  │   └── chat.py            # WebSocket聊天端点
  ├── models/
  │   ├── skill.py           # SkillResponse模型
  │   └── recording.py       # ActionType, RecordedAction模型
  ├── services/
  │   ├── skill_service.py   # 技能CRUD服务
  │   ├── skill_executor.py  # 技能执行服务
  │   └── recording_service.py # 录制服务
  └── main.py                # FastAPI应用入口

  examples/astron-rpa/engine/
  ├── shared/astronverse-actionlib/
  │   └── src/astronverse/actionlib/
  │       ├── atomic.py      # AtomicManager, @atomic装饰器
  │       └── types.py       # RPA数据类型定义
  ├── servers/astronverse-executor/
  │   └── src/astronverse/executor/flow/
  │       ├── flow.py        # Flow类，代码生成
  │       └── storage.py     # IStorage接口
  └── components/            # 20+组件包
      ├── astronverse-system/    # 文件、进程、截图
      ├── astronverse-browser/   # 浏览器自动化
      ├── astronverse-gui/       # 鼠标键盘
      └── astronverse-excel/     # Excel操作

  Desired Codebase Tree (新增文件)

  libs/deepagents-web/deepagents_web/
  ├── models/
  │   └── rpa.py             # [NEW] RPA工作流模型定义
  ├── services/
  │   ├── rpa_service.py     # [NEW] RPA技能服务
  │   └── rpa_executor.py    # [NEW] RPA执行引擎
  ├── api/
  │   └── rpa.py             # [NEW] RPA API端点
  └── rpa/                   # [NEW] RPA核心模块
      ├── __init__.py
      ├── actions/           # 原子操作定义
      │   ├── __init__.py
      │   ├── base.py        # 基础Action类
      │   ├── browser.py     # 浏览器操作
      │   ├── file.py        # 文件操作
      │   ├── system.py      # 系统操作
      │   └── keyboard.py    # 键盘鼠标操作
      ├── engine.py          # RPA执行引擎
      └── schema.py          # JSON Schema定义

  Known Gotchas & Library Quirks

  # CRITICAL: Windows上Playwright必须使用sync API + 独立线程
  # 参考: libs/deepagents-web/deepagents_web/services/recording_service.py
  # 原因: uvicorn的event loop与Playwright async API冲突

  # CRITICAL: subprocess执行必须设置UTF-8编码
  # 参考: libs/deepagents-web/deepagents_web/services/skill_executor.py
  import sys
  import io
  sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

  # CRITICAL: 技能名称验证规则
  # 必须: 小写字母数字，单个连字符分隔，最长64字符
  # 正则: ^[a-z0-9]+(-[a-z0-9]+)*$

  # CRITICAL: AstronRPA的原子操作使用__info__参数传递行号和进程ID
  # 用于错误报告和调试，我们需要简化这个模式

  # PATTERN: 使用Pydantic v2进行数据验证
  # 项目已使用Pydantic，保持一致性

  ---
  Implementation Blueprint

  Data Models and Structure

  # libs/deepagents-web/deepagents_web/models/rpa.py

  from enum import Enum
  from typing import Any
  from pydantic import BaseModel, Field

  class RPAActionType(str, Enum):
      """RPA原子操作类型"""
      # 浏览器操作
      BROWSER_OPEN = "browser_open"
      BROWSER_NAVIGATE = "browser_navigate"
      BROWSER_CLICK = "browser_click"
      BROWSER_FILL = "browser_fill"
      BROWSER_EXTRACT = "browser_extract"
      BROWSER_CLOSE = "browser_close"
      # 文件操作
      FILE_READ = "file_read"
      FILE_WRITE = "file_write"
      FILE_EXISTS = "file_exists"
      FILE_DELETE = "file_delete"
      # 系统操作
      SYSTEM_RUN = "system_run"
      SYSTEM_WAIT = "system_wait"
      # 键盘鼠标
      KEYBOARD_TYPE = "keyboard_type"
      KEYBOARD_PRESS = "keyboard_press"
      MOUSE_CLICK = "mouse_click"
      MOUSE_MOVE = "mouse_move"
      # 控制流
      FLOW_IF = "flow_if"
      FLOW_LOOP = "flow_loop"
      FLOW_TRY = "flow_try"
      # 变量操作
      VAR_SET = "var_set"
      VAR_GET = "var_get"

  class RPAActionParam(BaseModel):
      """操作参数定义"""
      key: str
      value: Any
      type: str = "string"  # string, int, float, bool, list, dict

  class RPAAction(BaseModel):
      """单个RPA操作"""
      id: str
      type: RPAActionType
      params: list[RPAActionParam] = []
      # 高级参数（参考AstronRPA）
      delay_before: float = 0
      delay_after: float = 0
      skip_on_error: bool = False
      retry_count: int = 0
      retry_interval: float = 1.0
      # 输出变量
      output_var: str | None = None

  class RPAWorkflow(BaseModel):
      """RPA工作流定义"""
      name: str
      description: str = ""
      version: str = "1.0"
      # 输入参数
      input_params: list[RPAActionParam] = []
      # 操作序列
      actions: list[RPAAction] = []
      # 输出参数
      output_params: list[str] = []

  class RPAExecutionResult(BaseModel):
      """RPA执行结果"""
      success: bool
      output: dict[str, Any] = {}
      error: str | None = None
      duration: float = 0
      action_results: list[dict[str, Any]] = []

  List of Tasks

  Task 1: 创建RPA数据模型
    file: libs/deepagents-web/deepagents_web/models/rpa.py
    action: CREATE
    description: 定义RPAActionType枚举、RPAAction、RPAWorkflow、RPAExecutionResult模型
    validation: mypy deepagents_web/models/rpa.py

  Task 2: 实现RPA原子操作基类
    file: libs/deepagents-web/deepagents_web/rpa/actions/base.py
    action: CREATE
    description: |
      - 定义ActionBase抽象基类
      - 实现@action装饰器（简化版AtomicManager）
      - 实现ActionRegistry注册表
    pattern: 参考 examples/astron-rpa/engine/shared/astronverse-actionlib/src/astronverse/actionlib/atomic.py

  Task 3: 实现浏览器原子操作
    file: libs/deepagents-web/deepagents_web/rpa/actions/browser.py
    action: CREATE
    description: |
      - browser_open: 打开浏览器
      - browser_navigate: 导航到URL
      - browser_click: 点击元素
      - browser_fill: 填充输入框
      - browser_extract: 提取数据
      - browser_close: 关闭浏览器
    pattern: 复用Playwright，参考现有recording_service.py

  Task 4: 实现文件原子操作
    file: libs/deepagents-web/deepagents_web/rpa/actions/file.py
    action: CREATE
    description: |
      - file_read: 读取文件
      - file_write: 写入文件
      - file_exists: 检查文件存在
      - file_delete: 删除文件

  Task 5: 实现系统原子操作
    file: libs/deepagents-web/deepagents_web/rpa/actions/system.py
    action: CREATE
    description: |
      - system_run: 执行命令
      - system_wait: 等待延迟

  Task 6: 实现RPA执行引擎
    file: libs/deepagents-web/deepagents_web/rpa/engine.py
    action: CREATE
    description: |
      - RPAEngine类
      - execute(workflow: RPAWorkflow, params: dict) -> RPAExecutionResult
      - 变量上下文管理
      - 错误处理和重试逻辑
      - 控制流支持（if/loop/try）
    pattern: 参考 examples/astron-rpa/engine/servers/astronverse-executor/src/astronverse/executor/flow/flow.py

  Task 7: 实现RPA技能服务
    file: libs/deepagents-web/deepagents_web/services/rpa_service.py
    action: CREATE
    description: |
      - RPASkillService类
      - create_rpa_skill(name, workflow) -> SkillResponse
      - execute_rpa_skill(name, params) -> RPAExecutionResult
      - 生成SKILL.md（type: rpa）
      - 保存workflow.json
    pattern: 参考 libs/deepagents-web/deepagents_web/services/skill_service.py

  Task 8: 扩展SkillService支持RPA类型
    file: libs/deepagents-web/deepagents_web/services/skill_service.py
    action: MODIFY
    description: |
      - 在get_skill()中识别type: rpa
      - 加载workflow.json内容
      - 在list_skills()中包含RPA技能

  Task 9: 实现RPA API端点
    file: libs/deepagents-web/deepagents_web/api/rpa.py
    action: CREATE
    description: |
      - POST /api/rpa/skills - 创建RPA技能
      - GET /api/rpa/skills/{name} - 获取RPA技能详情
      - POST /api/rpa/skills/{name}/execute - 执行RPA技能
      - GET /api/rpa/actions - 获取可用原子操作列表

  Task 10: 注册RPA路由
    file: libs/deepagents-web/deepagents_web/main.py
    action: MODIFY
    description: |
      - 导入rpa router
      - app.include_router(rpa_router, prefix="/api/rpa")

  Task 11: 扩展技能执行器支持RPA
    file: libs/deepagents-web/deepagents_web/services/skill_executor.py
    action: MODIFY
    description: |
      - 检测skill type为rpa时
      - 调用RPAEngine执行workflow.json
      - 返回执行结果

  Task 12: 编写单元测试
    file: libs/deepagents-web/tests/test_rpa.py
    action: CREATE
    description: |
      - test_rpa_models: 测试数据模型
      - test_rpa_actions: 测试原子操作
      - test_rpa_engine: 测试执行引擎
      - test_rpa_service: 测试技能服务
      - test_rpa_api: 测试API端点

  Task 13: 更新__init__.py导出
    files:
      - libs/deepagents-web/deepagents_web/rpa/__init__.py
      - libs/deepagents-web/deepagents_web/rpa/actions/__init__.py
    action: CREATE
    description: 导出公共接口

  Per-Task Pseudocode

  Task 2: ActionBase和装饰器

  # libs/deepagents-web/deepagents_web/rpa/actions/base.py

  from abc import ABC, abstractmethod
  from functools import wraps
  from typing import Any, Callable
  import time

  class ActionRegistry:
      """原子操作注册表"""
      _actions: dict[str, Callable] = {}
      _metadata: dict[str, dict] = {}

      @classmethod
      def register(cls, action_type: str, metadata: dict = None):
          def decorator(func):
              cls._actions[action_type] = func
              cls._metadata[action_type] = metadata or {}
              return func
          return decorator

      @classmethod
      def get(cls, action_type: str) -> Callable | None:
          return cls._actions.get(action_type)

      @classmethod
      def list_actions(cls) -> list[dict]:
          return [
              {"type": k, **v}
              for k, v in cls._metadata.items()
          ]

  def action(action_type: str, **metadata):
      """原子操作装饰器 - 简化版@atomic"""
      def decorator(func: Callable) -> Callable:
          @wraps(func)
          def wrapper(context: "ExecutionContext", **kwargs) -> Any:
              # 执行前延迟
              delay_before = kwargs.pop("delay_before", 0)
              if delay_before > 0:
                  time.sleep(delay_before)

              # 重试逻辑
              retry_count = kwargs.pop("retry_count", 0)
              retry_interval = kwargs.pop("retry_interval", 1.0)
              skip_on_error = kwargs.pop("skip_on_error", False)

              last_error = None
              for attempt in range(retry_count + 1):
                  try:
                      result = func(context, **kwargs)
                      # 执行后延迟
                      delay_after = kwargs.pop("delay_after", 0)
                      if delay_after > 0:
                          time.sleep(delay_after)
                      return result
                  except Exception as e:
                      last_error = e
                      if attempt < retry_count:
                          time.sleep(retry_interval)
                      elif skip_on_error:
                          return None
              raise last_error

          ActionRegistry.register(action_type, metadata)(wrapper)
          return wrapper
      return decorator

  class ExecutionContext:
      """执行上下文 - 管理变量和资源"""
      def __init__(self):
          self.variables: dict[str, Any] = {}
          self.browser = None  # Playwright browser instance
          self.page = None     # Current page

      def set_var(self, name: str, value: Any):
          self.variables[name] = value

      def get_var(self, name: str, default: Any = None) -> Any:
          return self.variables.get(name, default)

      def resolve_value(self, value: Any) -> Any:
          """解析变量引用，如 ${var_name}"""
          if isinstance(value, str) and value.startswith("${") and value.endswith("}"):
              var_name = value[2:-1]
              return self.get_var(var_name)
          return value

  Task 6: RPA执行引擎

  # libs/deepagents-web/deepagents_web/rpa/engine.py

  import time
  from typing import Any

  from deepagents_web.models.rpa import (
      RPAWorkflow, RPAAction, RPAExecutionResult
  )
  from deepagents_web.rpa.actions.base import ActionRegistry, ExecutionContext

  class RPAEngine:
      """RPA工作流执行引擎"""

      def execute(
          self,
          workflow: RPAWorkflow,
          input_params: dict[str, Any] = None
      ) -> RPAExecutionResult:
          start_time = time.time()
          context = ExecutionContext()
          action_results = []

          # 初始化输入参数
          if input_params:
              for key, value in input_params.items():
                  context.set_var(key, value)

          # 初始化工作流定义的输入参数默认值
          for param in workflow.input_params:
              if param.key not in context.variables:
                  context.set_var(param.key, param.value)

          try:
              # 执行操作序列
              for action in workflow.actions:
                  result = self._execute_action(context, action)
                  action_results.append({
                      "action_id": action.id,
                      "type": action.type,
                      "success": True,
                      "result": result
                  })

                  # 保存输出变量
                  if action.output_var and result is not None:
                      context.set_var(action.output_var, result)

              # 收集输出参数
              output = {}
              for param_name in workflow.output_params:
                  output[param_name] = context.get_var(param_name)

              return RPAExecutionResult(
                  success=True,
                  output=output,
                  duration=time.time() - start_time,
                  action_results=action_results
              )

          except Exception as e:
              return RPAExecutionResult(
                  success=False,
                  error=str(e),
                  duration=time.time() - start_time,
                  action_results=action_results
              )
          finally:
              # 清理资源
              self._cleanup(context)

      def _execute_action(self, context: ExecutionContext, action: RPAAction) -> Any:
          """执行单个操作"""
          # 获取操作函数
          action_func = ActionRegistry.get(action.type.value)
          if not action_func:
              raise ValueError(f"Unknown action type: {action.type}")

          # 解析参数
          kwargs = {}
          for param in action.params:
              kwargs[param.key] = context.resolve_value(param.value)

          # 添加高级参数
          kwargs["delay_before"] = action.delay_before
          kwargs["delay_after"] = action.delay_after
          kwargs["skip_on_error"] = action.skip_on_error
          kwargs["retry_count"] = action.retry_count
          kwargs["retry_interval"] = action.retry_interval

          # 执行
          return action_func(context, **kwargs)

      def _cleanup(self, context: ExecutionContext):
          """清理资源"""
          if context.browser:
              try:
                  context.browser.close()
              except:
                  pass

  Integration Points

  DATABASE:
    - 无需数据库变更，RPA技能存储为文件

  CONFIG:
    - 无需新增配置，复用现有Settings

  ROUTES:
    - add to: libs/deepagents-web/deepagents_web/main.py
    - pattern: |
        from deepagents_web.api.rpa import router as rpa_router
        app.include_router(rpa_router, prefix="/api/rpa", tags=["rpa"])

  SKILL_STRUCTURE:
    - RPA技能目录结构:
      skills/{skill-name}/
      ├── SKILL.md        # type: rpa in frontmatter
      └── workflow.json   # RPA工作流定义

  ---
  Validation Loop

  Level 1: Syntax & Style

  # 在 libs/deepagents-web 目录下运行
  cd libs/deepagents-web

  # 代码格式化
  ruff format deepagents_web/

  # 代码检查
  ruff check deepagents_web/ --fix

  # 类型检查
  mypy deepagents_web/models/rpa.py
  mypy deepagents_web/rpa/
  mypy deepagents_web/services/rpa_service.py

  # Expected: No errors

  Level 2: Unit Tests

  # libs/deepagents-web/tests/test_rpa.py

  import pytest
  from deepagents_web.models.rpa import (
      RPAActionType, RPAAction, RPAWorkflow, RPAActionParam
  )
  from deepagents_web.rpa.engine import RPAEngine
  from deepagents_web.rpa.actions.base import ExecutionContext, ActionRegistry

  class TestRPAModels:
      def test_action_type_enum(self):
          assert RPAActionType.BROWSER_CLICK.value == "browser_click"

      def test_workflow_creation(self):
          workflow = RPAWorkflow(
              name="test-workflow",
              description="Test",
              actions=[
                  RPAAction(
                      id="1",
                      type=RPAActionType.VAR_SET,
                      params=[
                          RPAActionParam(key="name", value="test"),
                          RPAActionParam(key="value", value="hello")
                      ]
                  )
              ]
          )
          assert workflow.name == "test-workflow"
          assert len(workflow.actions) == 1

  class TestExecutionContext:
      def test_variable_management(self):
          ctx = ExecutionContext()
          ctx.set_var("foo", "bar")
          assert ctx.get_var("foo") == "bar"
          assert ctx.get_var("missing", "default") == "default"

      def test_resolve_variable_reference(self):
          ctx = ExecutionContext()
          ctx.set_var("name", "world")
          assert ctx.resolve_value("${name}") == "world"
          assert ctx.resolve_value("literal") == "literal"

  class TestRPAEngine:
      def test_simple_workflow(self):
          workflow = RPAWorkflow(
              name="test",
              actions=[
                  RPAAction(
                      id="1",
                      type=RPAActionType.VAR_SET,
                      params=[
                          RPAActionParam(key="name", value="result"),
                          RPAActionParam(key="value", value="success")
                      ],
                      output_var="result"
                  )
              ],
              output_params=["result"]
          )

          engine = RPAEngine()
          result = engine.execute(workflow)

          assert result.success is True
          assert result.output.get("result") == "success"

      def test_workflow_with_input_params(self):
          workflow = RPAWorkflow(
              name="test",
              input_params=[
                  RPAActionParam(key="input_val", value="default")
              ],
              actions=[
                  RPAAction(
                      id="1",
                      type=RPAActionType.VAR_SET,
                      params=[
                          RPAActionParam(key="name", value="output"),
                          RPAActionParam(key="value", value="${input_val}")
                      ],
                      output_var="output"
                  )
              ],
              output_params=["output"]
          )

          engine = RPAEngine()
          result = engine.execute(workflow, {"input_val": "custom"})

          assert result.success is True
          assert result.output.get("output") == "custom"

  # 运行测试
  cd libs/deepagents-web
  pytest tests/test_rpa.py -v

  # 运行所有测试确保无回归
  pytest tests/ -v

  Level 3: Integration Test

  # 启动服务
  cd libs/deepagents-web
  uv run deepagents-web --port 8000

  # 测试获取可用操作列表
  curl http://localhost:8000/api/rpa/actions

  # 测试创建RPA技能
  curl -X POST http://localhost:8000/api/rpa/skills \
    -H "Content-Type: application/json" \
    -d '{
      "name": "test-rpa-skill",
      "workflow": {
        "name": "test-rpa-skill",
        "description": "Test RPA skill",
        "actions": [
          {
            "id": "1",
            "type": "var_set",
            "params": [
              {"key": "name", "value": "greeting"},
              {"key": "value", "value": "Hello RPA!"}
            ],
            "output_var": "greeting"
          }
        ],
        "output_params": ["greeting"]
      }
    }'

  # Expected: {"name": "test-rpa-skill", "description": "Test RPA skill", ...}

  # 测试执行RPA技能
  curl -X POST http://localhost:8000/api/rpa/skills/test-rpa-skill/execute \
    -H "Content-Type: application/json" \
    -d '{}'

  # Expected: {"success": true, "output": {"greeting":"",...},...}