# J-Admin 功能规格说明书（Spec）

> 范围：README「主要核心功能」P0 / P1 / P2 三档。
> **不包含**「第二部分完善功能」（微信登录/支付、文件上传、状态标签、Excel 导出、暗黑模式）——后续单独立项。

## 1. 目标与约束

| 项 | 约定 |
| --- | --- |
| 定位 | 轻量业务管理后台，学习 + 国内接单可复用的脚手架 |
| 交付形态 | 单进程 Node：NestJS 同时提供 `/api` 和托管 `client/dist` 静态资源 |
| 数据源 | **默认文件数据库（mock JSON），零配置即可跑**；改一个环境变量切 PostgreSQL |
| 规模约束 | 不做多维报表、不做复杂计算、不引入消息队列/缓存层 |
| 现有基线 | `server` 已有 `/api/version`；`client` 已有 Welcome/About/404 三个页面 + AntD 已接入 |

## 2. 系统架构

```
client (React 19 + Vite + AntD 5)
   │  axios，base = /api（dev 由 Vite 代理到 :3000，prod 同源）
   ▼
server (NestJS 12 + Express 5)
   ├─ GlobalPrefix /api · CORS · ValidationPipe · ResponseInterceptor · AllExceptionsFilter
   ├─ AuthModule      登录 / JWT 签发 / Guard / RBAC 装饰器
   ├─ CustomerModule  业务数据 CRUD（P0 主表格）
   ├─ UserModule      用户管理（仅 admin）
   ├─ DashboardModule 统计卡片 + 趋势（P1）
   └─ DataModule      DataStore 抽象 + FileStore / PostgresStore 双实现
```

### 2.1 目录约定

```
server/src/
  common/          统一响应、异常过滤器、装饰器（CurrentUser / Roles）、Guard
  config/          env 解析与校验（启动时缺 JWT_SECRET 直接 fail fast）
  data/            DataStore 接口 + file.store.ts + postgres.store.ts + seed.ts
  auth/            auth.module/controller/service, jwt.strategy, dto
  customers/       customers.module/controller/service, dto
  users/           users.module/controller/service, dto
  dashboard/       dashboard.module/controller/service
client/src/
  api/             axios 实例 + 拦截器 + 各资源接口封装
  auth/            token 存储、RequireAuth、useAuth
  components/      Layout（已存在，需扩展为后台骨架）
  pages/           Login / Dashboard / Customers / Users / NotFound
  routes.tsx       路由与菜单元数据（唯一数据源，菜单和面包屑都由它派生）
```

## 3. 数据源：文件 / PostgreSQL 双模式

### 3.1 配置

`.env`（`server/.env`，仓库内提供 `.env.example`，**不提交真实密码**）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DB_DRIVER` | `file` | `file` \| `postgres`，唯一切换开关 |
| `DB_FILE` | `./data/db.json` | file 模式的存储路径 |
| `PG_HOST` | `localhost` | postgres 模式 |
| `PG_PORT` | `5432` | postgres 模式 |
| `PG_USER` | `postgres` | postgres 模式 |
| `PG_PASSWORD` | — | postgres 模式，**必填，缺失则启动报错** |
| `PG_DATABASE` | `j_admin` | postgres 模式 |
| `JWT_SECRET` | `dev-secret-change-me` | 生产必须覆盖 |
| `JWT_EXPIRES_IN` | `2h` | token 有效期 |
| `PORT` | `3000` | 服务端口 |

### 3.2 抽象层（关键设计）

不使用 ORM，避免「TypeORM 实体模型」和「文件 JSON」两套模型互相妥协。定义统一的 `DataStore` 接口，两个实现按 `DB_DRIVER` 用 Nest 的 DI token 注入其一：

```ts
interface Query<T> {
  keyword?: string;      // 对 name / email 做模糊匹配
  status?: string;       // 精确匹配
  sortBy?: keyof T;      // 白名单校验，防注入
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}

interface DataStore {
  init(): Promise<void>;                                  // 建表 or 读文件 + 首次 seed
  find<T extends Collection>(c: T, q?: Query<Entity>): Promise<{ list: Entity[]; total: number }>;
  findOne<T extends Collection>(c: T, id: string): Promise<Entity | null>;
  findBy<T extends Collection>(c: T, where: Partial<Entity>): Promise<Entity | null>;
  insert<T extends Collection>(c: T, data: Omit<Entity, 'id'>): Promise<Entity>;
  update<T extends Collection>(c: T, id: string, patch: Partial<Entity>): Promise<Entity>;
  softDelete<T extends Collection>(c: T, id: string): Promise<Entity>;
  count<T extends Collection>(c: T, where?: Partial<Entity>): Promise<number>;
}
type Collection = 'users' | 'customers';
```

| | `FileStore` | `PostgresStore` |
| --- | --- | --- |
| 存储 | 读入 `db.json` 到内存，写操作**同步落盘**（先写 `.tmp` 再 rename，避免半写损坏） | `pg` 连接池，两张表 `users` / `customers` |
| 建表 | 文件不存在则写入 seed | `init()` 按 `schema_migrations` 应用版本化迁移（见 §3.5） |
| 分页排序 | 内存 `filter/sort/slice` | SQL `LIMIT/OFFSET` + 参数化 `ORDER BY`（排序列走白名单映射） |
| 适用 | 演示、测试、无 PG 环境 | 接近真实交付 |

### 3.3 数据模型

```ts
// 公共字段
id: string;            // uuid v4
createdAt: string;     // ISO 8601
updatedAt: string;
deleted: boolean;      // 软删除标记，默认 false

// users
username: string;      // 唯一，登录名（唯一性只对 deleted=false 的行生效）
passwordHash: string;  // bcrypt，cost 10
displayName: string;
role: 'admin' | 'user';
status: 'active' | 'disabled';

// customers（P0 业务主表）
name: string;          // 必填，2-30 字
email: string;         // 必填，邮箱格式，唯一（同上，软删除后可复用）
phone?: string;        // 选填，11 位手机号
status: 'enabled' | 'disabled';
remark?: string;       // 选填，≤200 字
```

> 密码用 `bcryptjs`（纯 JS 实现）而非 `bcrypt`，避免 Windows 下 node-gyp 编译失败。

### 3.4 种子数据（`server/src/data/seed.ts`）

- 账号：`admin / admin123`（role=admin）、`user1 / user123`（role=user）
- 客户：**50 条**，`createdAt` 分散在最近 30 天，`status` 混合 enabled/disabled —— 保证分页、搜索、筛选、排序、趋势图都有真实观感
- 首次启动（文件不存在 / 表为空）自动写入；提供 `npm run seed -w server` 可强制重置

### 3.5 postgres 建表 DDL 与迁移策略

不靠 `CREATE TABLE IF NOT EXISTS` 硬编码在建库时一次性执行（表已存在时改动会被静默跳过），而是版本化 forward-only 迁移，定义在 `server/src/data/migrations/`。

**迁移机制**

| 项 | 约定 |
| --- | --- |
| 版本表 | `schema_migrations(version text PK, name text, applied_at text)` |
| 应用时机 | `PostgresStore.init()`（DI 工厂内，先于任何请求） |
| 顺序 | `version` 零填充递增，字典序即时间序；版本号重复直接启动失败 |
| 事务 | 每个迁移取一条独占连接包在单个事务内，DDL 与版本记录同事务提交，失败整体回滚 |
| 幂等 | 已应用的版本跳过；所有 DDL 再带 `IF NOT EXISTS` / `IF EXISTS` 双保险 |
| 回滚 | 不提供 down migration，回滚靠备份恢复 |
| 依赖 | 不引入 ORM / 迁移 CLI，与 `FileStore` 对等的零依赖心智 |

**0001 建表**（列名 = 实体字段 snake_case，时间列 `text` 存 ISO 8601，与 file 模式表示一致）

```sql
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  created_at    text NOT NULL,
  updated_at    text NOT NULL,
  deleted       boolean NOT NULL DEFAULT false,
  username      text NOT NULL,
  password_hash text NOT NULL,
  display_name  text NOT NULL,
  role          text NOT NULL,
  status        text NOT NULL
);
CREATE TABLE IF NOT EXISTS customers (
  id         text PRIMARY KEY,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  deleted    boolean NOT NULL DEFAULT false,
  name       text NOT NULL,
  email      text NOT NULL,
  phone      text,
  status     text NOT NULL,
  remark     text
);
```

列上**不写 `UNIQUE`**：本项目是软删除，`deleted = true` 的行仍留在表里，列级 `UNIQUE` 会导致「删掉的账号名永远无法重建」。唯一性下沉为部分唯一索引。

**0002 索引与唯一约束**

```sql
-- 旧库兼容：先移除早期实现留下的列级 UNIQUE 自动约束
ALTER TABLE users     DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;

-- 唯一约束：只对未软删的行生效
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username   ON users (username) WHERE deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS ux_customers_email  ON customers (email) WHERE deleted = false;

-- 查询索引：列表主路径固定带 deleted = false [+ status] 并按 created_at DESC 排序分页
CREATE INDEX IF NOT EXISTS ix_users_status_created     ON users (deleted, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_customers_status_created ON customers (deleted, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_users_created            ON users (deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_customers_created        ON customers (deleted, created_at DESC);
```

`findOne` / `update` / `softDelete` 走 `id` 主键，无需额外索引。

**冲突处理**：`insert` / `update` 捕获 pg 错误码 `23505` → `BizException(40900, '用户名已存在' | '邮箱已被使用')`，由全局过滤器映射为 HTTP 409（§4.2）。文案常量集中在 `server/src/data/unique-rule.ts`。

**脚本导出**（本地无 PG 时给 DBA 评审 / 手工执行）：

```bash
npm run db:sql -w server      # 打印与 init() 等价的完整 SQL 到 stdout
npm run db:migrate -w server  # 读 server/.env 的 PG_* 配置，真正应用迁移
```

仓库内 `docs/sql/postgres-schema.sql` 是上述 `db:sql` 输出的副本，仅供阅读 / DBA 评审；改动以 `migrations/` 为准，改完重新执行 `npm run db:sql -w server` 覆盖。

## 4. 统一响应格式与异常处理

### 4.1 响应体

```jsonc
// 成功
{ "code": 0, "message": "ok", "data": { ... } }
// 列表成功：data 内嵌分页元信息
{ "code": 0, "message": "ok", "data": { "list": [], "total": 50, "page": 1, "pageSize": 10 } }
// 失败
{ "code": 40100, "message": "登录已过期，请重新登录", "data": null }
```

HTTP 状态码与业务码并存：HTTP 走标准语义（401 未认证 / 403 无权限 / 404 不存在），前端拦截器优先看 HTTP 状态。

### 4.2 业务错误码

| code | 含义 | HTTP |
| --- | --- | --- |
| `0` | 成功 | 200 |
| `40000` | 参数校验失败（返回具体字段错误列表） | 400 |
| `40100` | 未登录 / token 无效 / token 过期 | 401 |
| `40101` | 账号或密码错误 | 401 |
| `40300` | 已登录但无权限（角色不足） | 403 |
| `40400` | 资源不存在 | 404 |
| `40900` | 唯一约束冲突（邮箱/用户名重复） | 409 |
| `50000` | 服务内部异常（日志记录，对外不暴露堆栈） | 500 |

### 4.3 实现方式

- `ResponseInterceptor`：把 controller 返回值统一包成 `{ code: 0, message: 'ok', data }`；已带 `code` 的透传
- `AllExceptionsFilter`：捕获所有异常 → 映射业务码 → 统一响应体；`50000` 时打印完整堆栈到日志
- `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })` 全局注册，DTO 用 `class-validator`
- `HttpException` 子类 `BizException(code, message, httpStatus)` 供业务层主动抛出

## 5. 鉴权与 RBAC

| 环节 | 规格 |
| --- | --- |
| 登录 | `POST /api/auth/login`，校验账号密码 → 签发 JWT（payload: `sub`、`username`、`role`），有效期 `JWT_EXPIRES_IN` |
| 密码 | `bcryptjs.compare`；账号不存在与密码错误**返回同一错误码 40101、同一文案**，不泄露账号是否存在 |
| 携带 | 请求头 `Authorization: Bearer <token>` |
| 校验 | `JwtAuthGuard` 全局注册（`APP_GUARD`），白名单：`/api/auth/login`、`/api/version`、静态资源 |
| 角色 | `@Roles('admin')` 装饰器 + `RolesGuard` 读取 `Reflector` 元数据；不足返回 `40300` |
| 取当前用户 | `@CurrentUser()` 参数装饰器从 `req.user` 取 |
| 退出 | 前端清除 token 即可（JWT 无状态）；`POST /api/auth/logout` 保留为语义占位，返回成功 |
| 过期处理 | 前端 axios 响应拦截器捕获 401 → 清 token → `message.error('登录已过期')` → 跳转 `/login`，并记录原路径用于登录后回跳 |

**权限矩阵**

| 能力 | admin | user |
| --- | --- | --- |
| 登录 / 看自己的信息 | ✅ | ✅ |
| Dashboard 首页 | ✅ | ✅ |
| 客户列表查询（分页/搜索/筛选/排序） | ✅ | ✅ |
| 客户新增 / 编辑 | ✅ | ❌ `40300` |
| 客户删除（软删除） | ✅ | ❌ `40300` |
| 用户管理菜单与接口 | ✅ | ❌ 菜单不可见 + 接口 `40300` |

> 前端隐藏菜单只是体验，**后端 Guard 才是真正的权限边界**，两者都要做。

## 6. API 契约

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 公开 | `{username, password}` → `{token, user}` |
| GET | `/api/auth/profile` | 登录 | 当前用户信息（不含 passwordHash） |
| POST | `/api/auth/logout` | 登录 | 语义占位 |
| GET | `/api/customers` | 登录 | 查询参数：`page` `pageSize` `keyword` `status` `sortBy` `sortOrder` |
| POST | `/api/customers` | admin | 新增，邮箱重复返回 `40900` |
| PATCH | `/api/customers/:id` | admin | 局部更新 |
| DELETE | `/api/customers/:id` | admin | **软删除**，置 `deleted=true` |
| GET | `/api/users` | admin | 分页列表 |
| PATCH | `/api/users/:id/status` | admin | 启用/禁用账号 |
| GET | `/api/dashboard/stats` | 登录 | `{totalUsers, todayNew, activeCount}` |
| GET | `/api/dashboard/trend` | 登录 | `?days=7` → `[{date, count}]` |
| GET | `/api/version` | 公开 | 已存在，保留 |

**查询参数校验规则**：`page ≥ 1` 默认 1；`pageSize` 1–100 默认 10；`sortBy ∈ {name, createdAt, email}`；`sortOrder ∈ {asc, desc}` 默认 `desc`；`status ∈ {enabled, disabled}`。非法值返回 `40000`。

## 7. 前端规格

### 7.1 路由与菜单（`routes.tsx` 为唯一数据源）

| path | 页面 | 可见角色 | 面包屑 |
| --- | --- | --- | --- |
| `/login` | Login | 公开（已登录访问则跳 `/`） | — |
| `/` | Dashboard | 全部 | 首页 |
| `/customers` | Customers | 全部 | 首页 / 客户管理 |
| `/users` | Users | 仅 admin | 首页 / 用户管理 |
| `*` | NotFound | 全部 | — |

- `RequireAuth` 包裹后台路由：无 token → `<Navigate to="/login" state={{from}} replace />`
- 侧边栏菜单由 `routes.tsx` 按当前用户 role 过滤生成，**不手写两份**
- 面包屑用 AntD `Breadcrumb`，由路由 `meta.title` 派生

### 7.2 后台布局（扩展现有 `Layout.tsx`）

- `Layout.Sider`：`collapsible`，折叠态宽度 64px，折叠状态存 `localStorage`
- `Layout.Header`：折叠按钮 + 面包屑 + 右侧 `Dropdown`（显示 `displayName` 和角色 `Tag`，菜单含「退出登录」，退出需 `Modal.confirm` 二次确认）
- 退出后清 token 并跳 `/login`

### 7.3 客户管理页（P0 核心）

用 `@ant-design/pro-components` 的 `ProTable`，`request` 直接对接 `/api/customers`：

- 列：名称、邮箱、手机号、状态（`Tag`：enabled 绿 / disabled 灰）、创建时间、操作
- 分页：受控，`pageSize` 可选 10/20/50
- 搜索：顶部 `keyword` 输入框（名称/邮箱模糊）+ `status` 下拉筛选，支持重置
- 排序：名称、创建时间列可点击排序，参数透传后端
- 新增/编辑：`Modal` + `ProForm`，字段校验与后端 DTO **同一套规则**（必填、邮箱格式、手机号 11 位、remark ≤200）
- 提交：按钮 `loading` 态，成功 `message.success` + `actionRef.reload()`，失败 `message.error(后端 message)`
- 删除：`Popconfirm` 二次确认，仅 admin 可见操作按钮
- 权限：`role !== 'admin'` 时隐藏「新增」按钮和操作列

### 7.4 用户管理页（仅 admin）

`ProTable`：用户名、显示名、角色 `Tag`、状态 `Switch`（切换调用 `PATCH /status`）、创建时间。

### 7.5 Dashboard 首页（P1）

- 三张 `Statistic` 卡片：总用户数、今日新增、活跃数量（`Row/Col` 三列，窄屏堆叠）
- 一张 `@ant-design/plots` 折线图（近 7 天新增趋势）+ 一张柱状图（客户状态分布）
- 数据全部来自 `/api/dashboard/*`，页面 `Skeleton` 占位直到加载完成

### 7.6 通用能力（P2）

- 全局提示：统一用 AntD `message` / `notification`，禁止各页面自己造 Toast
- 页面级 Loading：路由切换 `Suspense` + 顶部进度条；表格用 ProTable 内建 loading
- 404：沿用现有 `NotFound.tsx`，接入后台布局
- axios 实例统一处理：请求头注入 token、401 跳登录、错误 `message` 兜底提示

## 8. 验收标准

**P0（Milestone 1）**
- [ ] 不配任何环境变量，`npm run dev` 直接可登录（file 模式 + 自动 seed）
- [ ] 设 `DB_DRIVER=postgres` 并提供 PG 参数，功能表现与 file 模式**完全一致**
- [ ] `admin/admin123` 与 `user1/user123` 均可登录；错误密码提示统一文案
- [ ] 未登录直接访问 `/customers` 被重定向到 `/login`，登录后回到原页面
- [ ] `user1` 侧边栏看不到「用户管理」；直接访问 `/users` 被拦截；调用增删改接口返回 `40300`
- [ ] 客户表格分页、关键字搜索、状态筛选、创建时间排序均生效且参数透传后端
- [ ] 新增客户时填重复邮箱，前端提示后端返回的冲突信息
- [ ] 删除为软删除：`db.json` / 数据库中记录仍在且 `deleted=true`，列表不再显示
- [ ] 所有接口返回体均为 `{ code, message, data }`；构造非法参数返回 `40000` 并带字段错误
- [ ] token 过期（可临时把 `JWT_EXPIRES_IN` 调成 `10s` 验证）后任意请求自动跳登录页并提示

**P1（Milestone 2）**
- [ ] Dashboard 三张卡片数据与数据库真实统计一致
- [ ] 折线图显示近 7 天趋势，柱状图显示客户状态分布，无数据时显示空态而非报错
- [ ] 新增/编辑表单在前后端两侧都会拦截非法输入（关掉前端校验用 curl 打接口同样报 `40000`）
- [ ] 提交过程按钮为 loading 态，重复点击不会产生重复记录

**P2（Milestone 3）**
- [ ] 成功/失败操作均有全局提示，无 `alert()`
- [ ] 访问不存在路由显示 404 页且带后台布局
- [ ] 后端抛未捕获异常时返回 `50000` 统一响应体，日志有完整堆栈，响应中不含堆栈
- [ ] 401 / 403 / 400 / 409 / 500 五类错误前端提示文案各不相同且可读

## 9. 明确不做（本期范围外）

- 微信登录 / 微信支付 / 小程序对接
- 文件与图片上传
- Excel 导出
- 暗黑模式
- refresh token、多设备登录管理、登录失败锁定
- 国际化（界面文案保持中英混排现状）
- 单元/E2E 测试框架搭建（本期以「可手工验收」为准，测试另立 issue）
