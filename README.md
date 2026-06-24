# KeePass Client

一个跨平台 KeePass 密码管理客户端。目标是在保持 KDBX 数据由用户完全掌控的前提下，提供现代、统一、可维护的使用体验。

## 项目状态

当前处于规划与初始化阶段，先完成 Rust 核心和桌面端 MVP，再逐步扩展移动端与同步能力。

## 我们想解决什么

- 本地安全管理 KeePass 数据库
- 提供更现代的界面与交互
- 在桌面端与移动端保持一致体验
- 支持可靠的跨平台同步

## 目标平台

- P0：Debian KDE
- P0：Android
- P0：iOS
- P1：Windows
- P1：macOS

## 核心架构

- **Rust 核心**：负责 KDBX 解析、保存、同步与合并
- **桥接层**：通过 `napi-rs` 暴露 Rust 能力给前端
- **桌面端**：Electron + React
- **移动端**：React Native

## 技术选型

- Rust
- `keepass-rs`
- `napi-rs`
- Electron
- React
- TypeScript

## 规划中的功能

- 打开、创建、编辑、保存 KDBX 4.x 数据库
- WebDAV / SFTP / S3 同步
- 自动填充
- 生物识别解锁
- TOTP
- 密码生成器
- 多数据库管理
- 深色 / 浅色主题

## 安全原则

- 不自研加密算法
- 主密码不持久化
- 不记录敏感信息到日志
- 仅支持 HTTPS / SFTP 等安全传输

## 内部文档

- 完整开发规划：[`docs/keepass-client-plan.md`](docs/keepass-client-plan.md)
