# closeDatabase 设计说明

> 状态：设计已确认，待进入实现计划。

## 1. 背景

当前数据库生命周期只有 `open`，没有 `close`。`open_database` 会把解密后的会话放进进程级 `SESSIONS`，但没有任何释放路径。

本次需求要补上两类关闭行为：

- **手动关闭当前数据库**：直接关闭，不自动保存未保存改动
- **应用退出时关闭所有会话**：由主进程统一清理，避免依赖 renderer 生命周期

## 2. 目标

- 新增 `closeDatabase` 能力，供 UI 关闭当前数据库
- 退出应用时，统一关闭 core 中的所有活动会话
- 不引入自动保存、脏状态提示、退出确认弹窗
- 保持当前单数据库 UI 可用，同时让 core 具备多会话关闭能力

## 3. 非目标

- 不做未保存改动自动提交
- 不做关闭前确认弹窗
- 不做 renderer `beforeunload` 清理
- 不引入额外的密码内存擦除方案

## 4. 设计概览

### 4.1 core 负责会话生命周期

在 `packages/core` 中补两个函数：

- `close_database(database_id: Uuid) -> Result<()>`
  - 从 `SESSIONS` 中移除指定会话
  - 找不到会话时返回 `SessionNotFound(database_id)`
  - 移除后依赖 Rust drop 释放 `Session` / `Database`

- `close_all_databases() -> Result<usize>`
  - 清空全部会话
  - 返回实际移除数量，方便测试和调试
  - 会话锁被污染时沿用现有错误模型返回 `SessionStorePoisoned`
  - 仅用于退出收尾，属于主进程内部能力

### 4.2 shell 暴露手动关闭，主进程负责退出清理

- IPC 新增 `keepass:closeDatabase`
- `packages/shell/src/main/handlers/db.ts` 调用 core 的 `close_database`
- `packages/shell/src/main/index.ts` 在 `app.on('will-quit')` 里同步调用 `close_all_databases()`；Electron 不会等待 async quit handler
- 不新增 renderer 生命周期钩子

### 4.3 renderer 只处理当前数据库

- `KeePassAPI` 增加 `closeDatabase(databaseId: string): Promise<void>`
- `databaseStore` 增加 `closeDatabase()` 动作
- 手动关闭成功后，清空当前数据库相关状态
- 如果当前没有打开数据库，直接返回

## 5. 行为细节

### 5.1 手动关闭

当用户在 UI 触发关闭当前数据库时：

1. renderer 调用 `api.closeDatabase(databaseId)`
2. shell 透传到 core
3. core 移除对应 session
4. renderer 清空本地 store 状态

手动关闭不会保存未保存改动；未保存内容直接丢弃。

### 5.2 退出清理

当应用退出时：

1. 主进程收到 `will-quit`
2. 直接同步调用 core 的 `close_all_databases()`
3. core 清空全部 session
4. 进程退出后由 OS 继续回收剩余内存

退出清理是 best-effort，不经过 renderer，也不依赖窗口生命周期。

## 6. 错误处理

- **手动关闭不存在的数据库 ID**：返回 `SessionNotFound`
- **手动关闭失败**：错误向上抛出，renderer 不清空状态
- **退出清理失败**：仅记录日志或静默处理，不阻断退出流程

## 7. 接口变更范围

### core

- 导出 `close_database`
- 导出 `close_all_databases`

### shell / preload / renderer

- `packages/shell/src/main/core.ts`
- `packages/shell/src/main/handlers/db.ts`
- `packages/shell/src/preload/types.ts`
- `packages/shell/src/preload/index.ts`
- `packages/renderer/src/lib/api.ts`
- `packages/renderer/src/lib/api.mock.ts`
- `packages/renderer/src/stores/databaseStore.ts`

## 8. 测试策略

- **core**：
  - 关闭单个 session 后，后续访问返回 `SessionNotFound`
  - 重复关闭同一 session 返回错误
  - `close_all_databases()` 能清空多个会话

- **shell contract**：
  - `keepass:closeDatabase` 出现在 handler 列表中

- **preload / renderer contract**：
  - `closeDatabase` 出现在 API 形状中

- **store**：
  - 关闭成功后，当前数据库状态被重置

## 9. 验收标准

- UI 可以手动关闭当前数据库，且不会自动保存
- 退出应用时，所有活动会话都会被关闭
- 不再依赖 renderer 的退出回调
- 现有 API 合约测试全部补齐并通过
