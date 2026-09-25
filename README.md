# j-admin
J-Admin， 轻量业务管理后台

# 功能

为了方便测试，服务器端可以直接使用文件数据库（mock文件），或者通过配置接postgresql。

## 功能与界面（附截图）

M1 P0（登录 + 布局 + 数据表格）、M2 P1（Dashboard + 表单）、M3 P2（通用能力）已全部落地。当前侧边栏 9 个菜单中，**首页 Dashboard、客户管理、用户管理**已实现完整功能，其余 6 个（订单/商品/报表/消息/操作日志/系统设置）为占位页。

各功能的界面截图与操作说明见 **[使用手册 docs/user-guide.md](./docs/user-guide.md)**。

## 主要核心功能

> 优先级说明：`P0` 必做骨架（登录 + 布局 + 数据表格），`P1` 核心体验（看板 + 表单），`P2` 通用能力增强。建议按 P0 → P1 → P2 顺序推进。

1. **身份登录模块** `P0`
   - 角色：管理员 (admin) / 普通用户 (user2 / user3)
   - 账号密码登录页面
   - 登录失败提示（账号或密码错误、用户不存在）
   - JWT token 存储、鉴权
   - token 过期处理：过期后自动跳转登录页并提示
   - 路由守卫：未登录不能访问后台页面
   - 角色权限差异：普通用户不可见「用户管理」菜单，且无删除权限；仅管理员 (admin) 可执行增删改
   - 退出登录
2. **侧边导航布局（后台标准骨架）** `P0`
   - 侧边栏菜单，可折叠
   - 顶部导航栏（用户信息、退出）
   - 面包屑导航，显示当前页面路径
3. **数据表格（最重要！兼职后台项目高频功能）** `P0`
   - 用户 / 业务数据列表（例如客户管理表）
   - 分页
   - 搜索框 + 筛选（按名称 / 状态筛选）
   - 排序（按创建时间 / 名称）
   - 新增、编辑弹窗
   - 删除记录（二次确认弹窗，采用软删除：标记 deleted 字段而非物理删除）
4. **基础数据看板 Dashboard 首页** `P1`
   - 统计卡片：总用户数、今日新增、活跃数量
   - 简单图表（折线 / 饼图 / 柱状，用 @ant-design/plots）
   不需要复杂多维报表，只做展示，不用复杂计算
5. **基础表单** `P1`
   - 新增 / 编辑的表单，表单校验（必填、邮箱格式等）
   - 提交 loading 状态，成功 / 失败提示
6. **基础通用能力** `P2`
   - 全局消息提示（成功、错误 Toast）
   - 页面 Loading 状态
   - 基础 404 页面
   - 统一响应格式：后端接口统一返回 `{ code, data, message }` 结构
   - 全局异常过滤：NestJS 全局异常过滤器统一捕获并格式化错误响应

## 第二部分完善功能
- **微信登录 / 支付对接** `P1`
  - 微信扫码 / 公众号授权登录（OAuth2 换 openid，绑定后台账号）
  - 微信支付 Native / JSAPI 下单、回调验签、订单状态幂等更新
  - 小程序 `code2session` 登录与后台账号打通
- 简单文件上传（图片，上传到本地或阿里云 OSS）`P1`
- 状态标签（启用 / 禁用，颜色标记）`P1`
- 数据导出 Excel（优先直接复用 ProTable 自带的导出能力，不自实现）`P2`
- 暗黑模式（Ant Design 5 `theme.darkAlgorithm` 切换）`P2`


# 技术栈

单仓 npm workspaces（`server` + `client`），开发期 `npm run dev` 一条命令同时起前后端，生产期由 NestJS 单进程托管前端静态资源（同源 `/api`，无需 nginx）。

| 层次 | 选型 | 版本 | 状态 |
| --- | --- | --- | --- |
| 语言 / 运行时 | TypeScript + Node.js | TS 5.7 / 5.8 | 已接入 |
| 仓库管理 | npm workspaces + concurrently | concurrently 10 | 已接入 |
| 后端框架 | NestJS（Express 适配器） | 12 | 已接入 |
| HTTP 服务 | Express，全局前缀 `/api` + CORS + 静态托管 + SPA fallback | 5.2 | 已接入 |
| 前端框架 | React | 19.3 | 已接入 |
| 构建工具 | Vite（dev 代理 `/api` 到 3000，注入 `__APP_VERSION__` / `__BUILD_TIME__`） | 8.3 | 已接入 |
| 路由 | React Router | 8.4 | 已接入 |
| 请求 | axios（相对 base `/api`，开发生产同源） | 1.2 | 已接入 |
| **UI / CSS** | **Ant Design 5**（Layout / Card / Typography / Button / Descriptions） | 5.29 | 已接入 |
| 后台组件 | @ant-design/pro-components（ProTable / ProForm） | 2.8 | 已接入（客户/用户管理页） |
| 图表 | @ant-design/plots | 2.6 | 已接入（Dashboard） |
| 鉴权 | @nestjs/jwt + Guard + RBAC 装饰器 | — | 已接入 |
| 参数校验 | class-validator + class-transformer（全局 ValidationPipe） | — | 已接入 |
| 数据库 | PostgreSQL + 文件数据库双数据源（按配置切换） | — | 已接入 |
| 部署 | 单进程 Node + Docker（待补） | — | 部分（静态托管已接，Docker 待补） |

> 原 Tailwind CSS v4 已于 UI 迁移时移除（`tailwindcss` / `@tailwindcss/vite` 依赖、`vite.config.ts` 插件、`index.css` 的 `@import` 均已清掉）。

# 文档

- [docs/user-guide.md](./docs/user-guide.md) —— **使用手册**：按界面逐项介绍已实现/规划中功能，含截图与角色权限矩阵
- [docs/spec.md](./docs/spec.md) —— 功能规格说明书：架构与目录约定、**文件/PostgreSQL 双数据源方案**、统一响应格式与错误码、鉴权与 RBAC 权限矩阵、API 契约、前端规格、验收标准
- [docs/issues.md](./docs/issues.md) —— Issue 与 Milestone 规划：拆分粒度、依赖关系图
- [GitHub Milestones](https://github.com/jackniu81/j-admin/milestones) —— M1 P0 后台骨架 / M2 P1 看板与表单 / M3 P2 通用能力

# 当前进度与下一步

**已完成**（M1 P0 + M2 P1 + M3 P2）：数据层基座（DataStore 双实现 + 统一响应/异常）、认证与 RBAC、客户/用户业务接口、前端登录与路由守卫、后台骨架布局、客户/用户管理页、Dashboard 看板、通用能力收口。

**待实现**：

1. 侧边栏 6 个占位菜单的业务实现（订单 / 商品 / 报表 / 消息 / 操作日志 / 系统设置）
2. 第二部分完善功能（微信登录/支付、文件上传、Excel 导出、暗黑模式）
3. Docker 部署与 PostgreSQL 环境验证

具体进度以 [issue 列表](https://github.com/jackniu81/j-admin/issues) 为准。本期**不做**：测试框架搭建。