# Callie

主动式 AI 外语学习 App — AI 语言伙伴会在合适的时间主动来电，与你进行实时语音练习。

## 仓库结构

```text
Callie/
├── apps/          # 代码（待建：ios、api）
├── supabase/      # 数据库迁移（待建）
├── docs/          # 产品 & 工程文档（Obsidian vault）
└── README.md
```

## 文档

| 文档 | 说明 |
|------|------|
| [docs/prd.md](./docs/prd.md) | 产品需求 |
| [docs/project-architecture-and-tech-stack.md](./docs/project-architecture-and-tech-stack.md) | 架构与技术栈 |

## Obsidian

在 Obsidian 中 **打开 `docs/` 文件夹** 作为 vault（不是仓库根目录）。  
代码目录 `apps/`、`supabase/` 不在 vault 内，避免和文档混在一起。

## 技术栈（Phase 0）

- **iOS**：SwiftUI + CallKit + PushKit
- **Backend**：Cloudflare Workers + Supabase
- **AI**：服务端 OpenAI Realtime + StoreKit 充值

详见 [docs/project-architecture-and-tech-stack.md](./docs/project-architecture-and-tech-stack.md)。
