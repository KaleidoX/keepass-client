# 跨平台 KeePass 客户端开发规划

> 本文保留产品与架构级决策；可执行实施步骤已拆分到 `docs/superpowers/plans/`。

## 1. 项目定位

- **学习价值**：验证 Rust 核心、Electron 桌面壳、前端分层与跨包协作
- **实用价值**：做一个可用的 KeePass 客户端，先完成桌面 MVP，再扩展同步与移动端
- **审美价值**：摆脱传统密码管理器的“工具感”，保持现代、统一的界面体验
- **技术价值**：基于 KDBX 开放格式，数据由用户完全掌控

## 2. 当前执行入口

MVP 已拆分为三份可执行计划：

1. [`docs/superpowers/plans/2026-06-24-keepass-client-plan-index.md`](docs/superpowers/plans/2026-06-24-keepass-client-plan-index.md)
2. [`docs/superpowers/plans/2026-06-24-keepass-client-project-structure-init.md`](docs/superpowers/plans/2026-06-24-keepass-client-project-structure-init.md)
3. [`docs/superpowers/plans/2026-06-24-keepass-client-core-coding.md`](docs/superpowers/plans/2026-06-24-keepass-client-core-coding.md)
4. [`docs/superpowers/plans/2026-06-24-keepass-client-electron-implementation.md`](docs/superpowers/plans/2026-06-24-keepass-client-electron-implementation.md)

旧的单文档规划仅作为战略参考，不再作为唯一执行蓝图。

## 3. 目标平台与范围

| 平台 | 优先级 | 说明 |
|---|---|---|
| Debian KDE | P0 | 当前桌面主力目标 |
| Android | P0 | 移动端主力目标 |
| iOS | P0 | 移动端主力目标 |
| Windows | P1 | 后续扩展 |
| macOS | P1 | 后续扩展 |

当前 MVP 的重点是 **Debian KDE 桌面端 + 本地 KDBX 管理**，同步、自动填充和移动端属于后续阶段。

## 4. 总体架构

采用 **单一 Rust 核心 + 多前端** 的架构。

### 4.1 代码边界

- `packages/core`：Rust 核心，负责 KDBX 打开、保存、条目读写、同步与合并基础能力
- `packages/shell`：Electron 主进程与 preload，负责 IPC、原生加载与桥接类型
- `packages/renderer`：React 业务壳，负责界面组合、状态管理与 i18n 运行时
- `packages/ui`：纯 UI 原语，只接收 props，不承载业务文案和运行时依赖
- `packages/i18n`：纯翻译资源包，只放 JSON 资源，不引入 i18n 运行时

### 4.2 依赖方向

`packages/i18n` / `packages/ui` → `packages/renderer` → `packages/shell` → `packages/core`

这样可以保证：

1. UI 组件可以独立测试
2. renderer 的状态和 bridge 可以替换
3. core 的数据库逻辑不依赖桌面框架

## 5. 技术选型

| 层级 | 选型 |
|---|---|
| 核心语言 | Rust 2021 |
| KDBX 库 | `keepass` 0.13 |
| 原生桥接 | `napi-rs` |
| 包管理 | pnpm workspace |
| 前端语言 | TypeScript 5.8 |
| 桌面框架 | Electron 42 |
| 前端框架 | React 19 |
| 构建工具 | Vite 7 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand |
| 测试框架 | Vitest + React Testing Library |
| 语言资源 | `@keepass/i18n` |

当前桌面实现采用 Electron，而不是 Tauri；原因是调试链路、生态和 UI 组件可选范围更适合当前阶段。

## 6. 核心能力

### 6.1 MVP 能力

- 打开、创建、编辑、保存 KDBX 4.x 数据库
- 安全读取条目列表与详情
- 内存中更新条目后再统一保存
- 保存前检查目标文件是否属于 MVP 管理范围

### 6.2 规划能力

- WebDAV / SFTP / S3 同步
- 自动填充
- 生物识别解锁
- TOTP 双因素认证
- 密码生成器
- 多数据库管理
- 深色 / 浅色 / 跟随系统主题

## 7. 前端实现原则

### 7.1 i18n

- 翻译资源只放在 `packages/i18n`
- renderer 负责 `i18next` / `react-i18next` 的运行时接入
- `packages/ui` 不直接依赖 i18n 运行时，文案通过 props 传入

### 7.2 状态与桥接

- renderer 使用 Zustand 管理数据库状态
- `packages/renderer` 通过类型化 bridge 调用 `window.keepassAPI`
- `api.mock.ts` 仅用于浏览器和测试环境

### 7.3 Shell 与 preload

- Electron 主进程负责加载原生 addon、注册 IPC handler、启动渲染层
- preload 只暴露最小化、安全的 API
- bridge 类型必须与 shell 的契约测试保持一致

## 8. 安全设计

- 不自研加密算法，完全复用成熟库
- 主密码不持久化；如需缓存，仅使用平台安全存储
- 不在日志中记录密码、密钥或主密码
- 仅支持 HTTPS / SFTP 等安全传输方式
- Electron 保持 `contextIsolation: true`、`nodeIntegration: false`、`enableRemoteModule: false`
- 保存时必须拒绝覆盖不属于 MVP 管理范围的文件

## 9. 验证策略

- core 先用 spike test 验证 `keepass` 0.13 的真实 API
- core 再补数据库打开、读取、修改、保存的单元测试
- renderer 与 UI 组件用 Vitest + React Testing Library 覆盖
- preload / bridge 通过契约测试锁定 `window.keepassAPI` 的形状
- 每个阶段完成后，再推进下一阶段的实现计划

## 10. 路线图

| 阶段 | 目标 | 对应计划 |
|---|---|---|
| 阶段 1 | workspace、包边界、i18n 资源、UI/renderer/shell 骨架 | `project-structure-init` |
| 阶段 2 | Rust core：打开数据库、读写条目、保存安全校验 | `core-coding` |
| 阶段 3 | Electron：renderer、shell、UI 原语、bridge 贯通 | `electron-implementation` |
| 阶段 4 | 同步：WebDAV / SFTP / S3、冲突检测、合并策略 | 后续单独拆分 |
| 阶段 5 | 移动端与其他前端实验 | 后续单独拆分 |

## 11. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| KDBX 解析错误 | 高 | 先用 spike test 锁定真实 API，再逐步扩展 |
| 误覆盖非 MVP 管理文件 | 高 | 保存前做文件归属检查 |
| 同步冲突导致数据丢失 | 高 | 先做冲突提示，再做自动合并 |
| Electron 资源占用较高 | 中 | 当前阶段可接受，优先保证稳定性与可调试性 |
| 多前端维护成本过高 | 中 | 先跑通桌面 MVP，再扩展其他前端 |
| 项目周期拉长 | 高 | 按阶段交付，每阶段都保留可用成果 |

## 12. 参考项目

- KeePassXC
- KeePassDX
- Strongbox
- KeePassium
- KeeWeb
- OneKeePass

## 13. 结论

当前主线是：**先完成桌面 MVP 的 workspace / core / Electron 三段式拆分，再把同步和移动端作为后续独立阶段推进**。
