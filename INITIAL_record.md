## FEATURE:

- 在deepagents-web服务的skill创建能力上进行增强，提供三种方式创建技能，第一种是现有的直接提供SKILL.md相关信息，第二种是通过自然语言描述skill的目标以及操作步骤，第三种是通过录制用户的浏览器操作实现，将浏览器操作录成一段可重放的确定性流程，最后封装成一个可反复调用的 Skill。具体实现可参考browser-use的skills创建。
- 创建的skill需具备测试执行能力，以便用户验证skill是否正确

## EXAMPLES:

## DOCUMENTATION:

deepagents documentation: https://docs.langchain.com/oss/python/deepagents/overview
deepagents-cli documentation: https://github.com/langchain-ai/deepagents/blob/master/libs/deepagents-cli/README.md
browser-use skill documentation: https://docs.cloud.browser-use.com/concepts/skills

## OTHER CONSIDERATIONS:

- Include the project structure in the README.
- 请注意当前deepagents项目中已有playwright-mcp工具可以实现浏览器操作
- Virtual environment has already been set up with the necessary dependencies.
- Use python_dotenv and load_env() for environment variables
