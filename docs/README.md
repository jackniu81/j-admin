# 文档目录

J-Admin 的项目文档索引。产品总览、技术栈、快速开始见根目录 [`README.md`](../README.md)；本目录存放规格、规划与使用手册。

| 文档 | 职责 | 什么时候看 |
| --- | --- | --- |
| [spec.md](./spec.md) | **功能规格**：系统架构、双数据源方案、统一响应与错误码、RBAC 权限矩阵、API 契约、数据模型、验收标准 | 改后端接口 / 数据层 / 权限前，以此为准 |
| [issues.md](./issues.md) | **里程碑与 Issue 规划**：M1~M4 拆分与依赖、当前状态快照、下一步（M5）优先级排序 | 想知道「做了什么、接下来先做什么」 |
| [user-guide.md](./user-guide.md) | **使用手册**：按界面逐项介绍已实现功能，含截图与角色权限矩阵 | 演示 / 交付 / 新用户上手 |
| [sql/postgres-schema.sql](./sql/postgres-schema.sql) | **PostgreSQL 初始化脚本**：由 `npm run db:sql -w server` 从迁移定义生成的只读副本 | 无 Node 环境、需交 DBA / psql 手工建库时 |
| [images/](./images) | 使用手册与 README 的界面截图 | — |

## 阅读顺序建议

1. 想了解**这是什么、怎么跑起来** → 根 [`README.md`](../README.md)
2. 想理解**为什么这样设计、接口长什么样** → [spec.md](./spec.md)
3. 想看**进度与后续计划** → [issues.md](./issues.md)
4. 想**操作演示 / 交付讲解** → [user-guide.md](./user-guide.md)

## 约定

- 文档与实现冲突时，**以代码与 spec 为准**；spec 是接口与数据契约的唯一权威来源。
- `sql/postgres-schema.sql` 是生成产物，勿手工编辑；迁移定义在 `server/src/data/migrations/`，改完执行 `npm run db:sql -w server` 重生成。
