# Issue 与 Milestone 规划

依据 [`spec.md`](./spec.md) 拆分。粒度刻意放粗：**一个 issue = 一个可独立验收的功能块**，不拆到「加一个按钮」级别。

## Milestone

| Milestone | 对应优先级 | 截止 | 说明 |
| --- | --- | --- | --- |
| M1 · P0 后台骨架 | P0 | 2026-10-16 | 登录 + 布局 + 数据表格跑通，双数据源可切换 |
| M2 · P1 看板与表单 | P1 | 2026-10-30 | Dashboard 统计与图表、表单双端校验 |
| M3 · P2 通用能力 | P2 | 2026-11-13 | 全局提示、Loading、404、错误文案收口 |
| M4 · 订单/商品/报表 + PG 实测 | P1~P2 | 2026-11-27 | 三个业务页面 + 图片上传基座 + PostgreSQL 双模式对拍 + 文档同步 |

## Issue 清单

| # | 标题 | 里程碑 | 标签 | Spec 章节 |
| --- | --- | --- | --- | --- |
| 1 | [后端] 数据层基座：DataStore 双数据源 + 统一响应与异常处理 | M1 | backend, P0 | §3 §4 |
| 2 | [后端] 认证与 RBAC：登录、JWT、Guard、角色权限矩阵 | M1 | backend, P0 | §5 §6 |
| 3 | [后端] 业务接口：客户 CRUD + 用户管理 | M1 | backend, P0 | §6 |
| 4 | [前端] 登录页、token 管理与路由守卫 | M1 | frontend, P0 | §5 §7.1 |
| 5 | [前端] 后台骨架布局：侧边栏 / 顶栏 / 面包屑 / 角色菜单 | M1 | frontend, P0 | §7.2 |
| 6 | [前端] 客户管理页 + 用户管理页（ProTable / ProForm） | M1 | frontend, P0 | §7.3 §7.4 §5 |
| 7 | Dashboard 看板：统计接口 + 卡片 + 图表 | M2 | backend, frontend, P1 | §6 §7.5 |
| 8 | 通用能力收口：全局提示、Loading、404、错误文案 | M3 | backend, frontend, P2 | §4 §7.6 |
| 12 | [后端] PostgresStore 建表 DDL 与迁移策略（#1 收口项） | M1 | backend, P0 | §3.2 §3.5 |
| 31 | [后端] 数据层扩展：新增 orders/products 集合（M4 前置） | M4 | backend, P1 | §3.3 §3.5 |
| 32 | [后端] PostgreSQL 集成实测与收口（双模式对拍） | M4 | backend, P1 | §3 §8 |
| 33 | 订单管理页：主从结构 + 状态流转（ProTable + 详情抽屉） | M4 | backend, frontend, P1 | §6 §7.3 |
| 34 | 商品管理页 + 图片上传基座（本地磁盘，ProFormUploadButton） | M4 | backend, frontend, P1 | §6 §7.7 |
| 35 | 报表中心页 + Dashboard 去随机化（多维图表 + 时间筛选） | M4 | backend, frontend, P1 | §6 §7.5 §7.8 |
| 36 | docs: M4 文档与规划同步（issues/spec/README/schema.sql） | M4 | documentation, P2 | 全部 |

## 依赖关系

```
#1 数据层基座
 ├── #2 认证与 RBAC ────┬── #4 前端登录与守卫 ── #5 后台布局 ── #6 表格页
 └── #3 业务接口 ───────┘
                                                       #7 Dashboard（依赖 #1 #2）
                                                       #8 通用能力（依赖 #4 #6，可并行收尾）

M4（依赖 M1~M3 全部落地）：
#31 数据层扩展（orders/products 集合 + 0003 迁移）
 ├── #33 订单管理页（依赖 #31，表单选项联动客户/商品）
 ├── #34 商品管理页 + 图片上传基座（依赖 #31）
 ├── #35 报表中心 + Dashboard 去随机化（依赖 #33 #34 的数据口径）
 └── #32 PostgreSQL 实测（依赖 #31，对拍 file / pg 双模式）
                          #36 文档同步（依赖 #31 ~ #35 全部完成）
```

- `#1` 是一切前提：先有双数据源和统一响应，后面所有接口才有一致的形态
- `#12` 是 `#1` 的遗留项：表结构与索引从硬编码 `CREATE TABLE IF NOT EXISTS` 改为版本化迁移
- `#4 #5` 可与 `#3` 并行（前端先用 mock 数据）
- `#7 #8` 不阻塞 P0 验收
- `#31` 是 M4 唯一前置：没有 orders/products 集合，订单/商品/报表都无从谈起
- `#32` 可与 `#33 #34 #35` 并行，但收口验证需等三个页面全部合并

## 备注

- 消息通知 / 操作日志 / 系统设置三个占位菜单与微信登录/支付、Excel 导出、暗黑模式**本期不建 issue**；图片上传已在 M4 随 #34 落地（本地磁盘基座，OSS 预留替换）
- README「基础表单」(P1) 未单独立 issue：表单 UI 与校验在 #6 的弹窗中实现，**前后端双端校验一致性**的验收放在 #7
- 测试框架搭建不在本期范围，后续单独立项
- 每个 issue 的正文都引用了 spec 章节与对应验收标准，实现时以 spec 为准
- issue 正文源文件保存在 `node_modules/.cache/gh-issues/`（已 gitignore，M1~M3 为 01-08.md，M4 为 31-36.md），需要改 issue 时可用 `gh issue edit <n> --body-file`
