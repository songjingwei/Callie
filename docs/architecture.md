# Callie 系统架构图

> 文档版本：v1.4  
> 更新时间：2026-08-23  
> 关联文档：[prd.md](./prd.md) · [project-architecture-and-tech-stack.md](./project-architecture-and-tech-stack.md)

本文档专门描述 **系统架构与核心流程**，以架构图为主。模块职责、技术选型与开发顺序见 [project-architecture-and-tech-stack.md](./project-architecture-and-tech-stack.md)。

---

## 1. 架构总览（Phase 0）

Callie 是 **iOS 原生 App + Cloudflare Workers 自建 Backend + Supabase**，AI 语音由 **腾讯云 TRTC · AI 实时对话** 提供，用户通过 **StoreKit 充值** 获得通话额度。

```mermaid
flowchart TB
    subgraph Client["iOS App · SwiftUI"]
        UI[消息 / 学习 / 我的]
        CK[CallKit + PushKit]
        SK[StoreKit 充值]
        TRTC[TRTC iOS SDK 进房]
        SD[SwiftData 本地缓存]
    end

    subgraph Edge["Cloudflare Workers · apps/api"]
        API[REST API · Hono]
        CRON[Cron Scheduler]
        PUSH[VoIP Push → APNs]
        BILL[计费 / 验单 / 通话会话]
        TRTCAPI[StartAIConversation]
        SEC[(Workers Secrets)]
    end

    subgraph Data["Supabase Free"]
        AUTH[Auth]
        PG[(PostgreSQL)]
    end

    subgraph External["外部服务"]
        APNS[Apple APNs]
        TX[腾讯云 TRTC + AI Bot]
        LLM[LlmProvider<br/>OpenAI / Anthropic 兼容]
        ASC[App Store · IAP]
    end

    UI --> AUTH
    UI --> API
    SK --> ASC
    SK -->|收据验单| BILL
    CK -->|VoIP Token| API
    CRON --> PUSH --> APNS --> CK
    BILL -->|UserSig + roomId| TRTC
    BILL --> TRTCAPI
    TRTCAPI --> TX
    TRTC <-->|RTC 音频| TX
    TX --> LLM
    BILL --> SEC
    BILL --> PG
    API --> PG
    AUTH --> PG
    SD -.-> UI
```

**边界说明：**

| 组件 | 职责 | 不做什么 |
|------|------|----------|
| iOS | UI、CallKit、StoreKit、**TRTC SDK 进房** | 不存 TRTC SecretKey / LLM API Key |
| Workers | API、调度、Push、计费、**签发 UserSig + 启动 AI 对话任务** | 不承载长音频流 |
| Supabase | Auth、持久化数据 | 不做 Scheduler / Push |
| 腾讯云 TRTC | RTC 传输 + **AI Bot 进房** | 不管用户额度 |
| 国内 LLM | 对话推理（经 TRTC LLMConfig + Workers LlmProvider） | Key 仅存 Workers |

---

## 2. 仓库与部署拓扑

代码与文档分离：**Obsidian vault = `docs/`**，代码在仓库根目录。

```mermaid
flowchart LR
    subgraph Repo["Git 仓库 Callie/"]
        subgraph Code["代码（不在 Obsidian）"]
            IOS["apps/ios/<br/>SwiftUI + CallKit"]
            API["apps/api/<br/>Cloudflare Workers"]
            SB["supabase/migrations/"]
        end
        subgraph Docs["docs/ · Obsidian vault"]
            PRD[prd.md]
            TECH[project-architecture-and-tech-stack.md]
            ARCH[architecture.md]
        end
    end

    IOS -->|HTTPS + JWT| API
    API --> SB
    API -->|wrangler deploy| CF[Cloudflare Edge]
    IOS -->|TestFlight / App Store| AS[Apple]
    SB -->|migrate| SUP[Supabase Cloud]
```

| 路径 | 部署目标 |
|------|----------|
| `apps/ios/` | App Store / TestFlight |
| `apps/api/` | Cloudflare Workers（`wrangler deploy`） |
| `supabase/migrations/` | Supabase PostgreSQL |

---

## 3. 产品核心闭环

```mermaid
flowchart TD
    A[用户注册 / Onboarding] --> B[建立学习画像]
    B --> C[Proactive Scheduler<br/>决定何时联系]
    C --> D[VoIP Push + CallKit 来电]
    D --> E{用户接听?}
    E -->|是| F[实时语音通话]
    E -->|否| G[记录拒接] --> C
    F --> H[通话结束 · 扣额度]
    H --> I[Learning 反馈 + 更新画像]
    I --> C
```

---

## 4. 主动来电流程（卖点）

从 Scheduler 到 CallKit 系统来电界面。

```mermaid
sequenceDiagram
    participant CRON as Workers Cron
    participant API as Workers API
    participant DB as Supabase PG
    participant APNS as Apple APNs
    participant iOS as iOS App
    participant CK as CallKit

    CRON->>DB: 查询 call_preferences<br/>时段 / 频率 / 允许来电
    CRON->>DB: 查上次通话 / 拒接记录
    alt 满足调度条件
        CRON->>DB: 读取 push_tokens
        CRON->>APNS: VoIP Push（JWT + .p8）
        APNS->>iOS: PushKit 唤醒
        iOS->>CK: 展示系统来电 UI<br/>「Sarah 正在呼叫你」
    else 不满足
        CRON-->>CRON: 跳过
    end

    alt 用户接听
        iOS->>CK: 接听
        Note over iOS: 进入通话流程 → 见 §5
    else 用户拒接
        iOS->>API: POST /v1/call-events
        API->>DB: 记录拒接
    end
```

---

## 5. 语音通话流程（TRTC AI 实时对话）

Phase 0：Workers 校验余额 → 签发 **UserSig** → 调用 **StartAIConversation** 让 AI Bot 进房；音频走 **TRTC RTC**，不经 Workers 转发。

```mermaid
sequenceDiagram
    participant User as 用户
    participant iOS as iOS App
    participant API as Workers API
    participant DB as Supabase PG
    participant TX as 腾讯云 TRTC API
    participant Room as TRTC 房间
    participant Bot as AI Bot
    participant LLM as 国内 LLM

    User->>iOS: CallKit 接听
    iOS->>API: POST /v1/calls/start<br/>Authorization: Supabase JWT
    API->>DB: 查 user_wallets 余额
    alt 余额不足
        API-->>iOS: 402 Payment Required
        iOS-->>User: 引导 StoreKit 充值
    else 余额充足
        API->>API: 生成 roomId / userId / UserSig
        API->>API: LlmProvider → TRTC LLMConfig
        API->>TX: StartAIConversation<br/>LLMConfig + AgentConfig
        TX->>Room: AI Bot 进房
        TX-->>API: TaskId
        API->>DB: 创建 call_session（in_progress）
        API-->>iOS: sdkAppId + roomId + userId + userSig + call_id
        iOS->>Room: TRTC SDK 进房（UserSig）
        loop 实时双工
            User->>Room: 语音
            Room->>Bot: RTC 音频
            Bot->>LLM: STT → LLM → TTS
            Bot->>Room: AI 语音
            Room->>User: 语音（可打断）
        end
        User->>iOS: 挂断
        iOS->>API: POST /v1/calls/end<br/>duration / call_id
        API->>TX: StopAIConversation（可选）
        API->>DB: 扣减 balance_seconds
        API->>DB: 写 usage_logs + credit_transactions
        API->>LLM: LlmProvider.complete（summary）
        API->>DB: 存 learning_feedback
        API-->>iOS: 反馈摘要
    end
```

---

## 6. 充值与计费流程

用户通过 **StoreKit IAP** 购买通话额度；Workers 向 Apple 验单后入账。

```mermaid
sequenceDiagram
    participant User as 用户
    participant iOS as iOS App
    participant ASC as App Store
    participant API as Workers API
    participant DB as Supabase PG
    participant Apple as App Store Server API

    User->>iOS: 点击购买额度包
    iOS->>ASC: StoreKit 2 购买
    ASC-->>iOS: signedTransaction / JWS
    iOS->>API: POST /v1/billing/apple/verify
    API->>Apple: 验证 transactionId
    Apple-->>API: 交易有效
    API->>DB: 幂等检查 reference_id
    API->>DB: user_wallets += 秒数
    API->>DB: credit_transactions(type=purchase)
    API-->>iOS: 新余额
    iOS-->>User: 展示剩余通话时间
```

**计费规则（Phase 0）：**

```mermaid
flowchart LR
    START["/v1/calls/start"] --> CHECK{余额 > 0?}
    CHECK -->|否| PAY[402 → 充值页]
    CHECK -->|是| CALL[TRTC AI 通话]
    CALL --> END["/v1/calls/end"]
    END --> DEDUCT[按秒扣减 wallet]
    DEDUCT --> LOG[usage_logs]
```

---

## 7. 逻辑模块划分

12 个逻辑模块在 Phase 0 的 **部署归属**（非 12 个微服务）。

```mermaid
flowchart TB
    subgraph iOSModules["iOS 客户端模块"]
        M01[01 App Shell]
        M02[02 Auth · supabase-swift]
        M03[03 IM Core · 简化版]
        M04[04 Push & CallKit]
        M05[05 TRTC 通话 UI]
    end

    subgraph WorkersModules["Cloudflare Workers 模块"]
        M10[10 Proactive Engine · Cron]
        M11[11 Backend API]
        M11B[计费 · Billing]
        M06[06 Voice Agent · 轻量编排]
        M07[07 Conversation · Prompt 注入]
        M08[08 Learning · summary]
    end

    subgraph DataModules["Supabase + 本地"]
        M09[09 Memory · Phase 0 本地]
        PG[(PostgreSQL)]
    end

    M04 --> M11
    M05 --> M06
    M06 --> M07
    M05 --> M06
    M10 --> M04
    M11 --> M11B --> PG
    M02 --> PG
    M08 --> PG
    M09 -. SwiftData .-> M05
```

| 模块 | Phase 0 实现位置 |
|------|------------------|
| 04 Push & CallKit | iOS 原生 + Workers → APNs |
| 06 Voice Agent | Workers LlmProvider + StartAIConversation |
| 10 Proactive Engine | Workers Cron |
| 11 Backend | Workers Hono API |
| 计费 | Workers + Supabase `user_wallets` |
| 09 Memory | SwiftData（本地）+ 通话记录上云 |

---

## 8. 数据架构（Phase 0 核心表）

```mermaid
erDiagram
    auth_users ||--o| user_wallets : has
    auth_users ||--o{ push_tokens : registers
    auth_users ||--o| call_preferences : configures
    auth_users ||--o{ call_sessions : owns
    auth_users ||--o{ credit_transactions : has
    auth_users ||--o{ usage_logs : generates

    call_sessions ||--o| learning_feedback : produces

    auth_users {
        uuid id PK
    }
    user_wallets {
        uuid user_id PK
        int balance_seconds
        timestamptz updated_at
    }
    push_tokens {
        uuid id PK
        uuid user_id FK
        text voip_token
        text environment
    }
    call_preferences {
        uuid user_id PK
        jsonb allowed_hours
        int daily_frequency
        bool allow_proactive
        text timezone
    }
    call_sessions {
        uuid id PK
        uuid user_id FK
        text status
        text trtc_room_id
        text trtc_task_id
        timestamptz started_at
        timestamptz ended_at
        int duration_seconds
    }
    credit_transactions {
        uuid id PK
        uuid user_id FK
        text type
        int amount
        text reference_id UK
    }
    usage_logs {
        uuid id PK
        uuid user_id FK
        uuid call_id FK
        int duration_seconds
        numeric estimated_cost_cny
    }
    learning_feedback {
        uuid id PK
        uuid call_session_id FK
        text summary
        jsonb mistakes
    }
```

> `auth_users` 由 Supabase Auth 管理；业务表通过 `user_id` 关联。

---

## 9. 安全与信任边界

```mermaid
flowchart TB
    subgraph Public["用户可见"]
        APP[iOS App]
    end

    subgraph Trusted["Callie 服务端 · 可信区"]
        W[Cloudflare Workers]
        SEC["Secrets<br/>TRTC / TENCENT_*<br/>LLM_*（按 Provider 分包）<br/>APNS .p8<br/>SUPABASE service role<br/>APPLE_IAP keys"]
        DB[(Supabase PostgreSQL)]
    end

    subgraph ThirdParty["第三方"]
        TX[腾讯云 TRTC]
        LLM[国内 LLM]
        APNS[APNs]
        APPLE[App Store]
    end

    APP -->|Supabase JWT| W
    APP -->|UserSig 仅| TX
    APP -->|StoreKit| APPLE
    APP -.->|永不传输| SEC
    W --> SEC
    W --> DB
    W -->|TC3 签名 REST| TX
    W -->|summary| LLM
    W --> APNS
    W -->|验单| APPLE
```

| 数据 | 存放位置 | 是否下发客户端 |
|------|----------|----------------|
| TRTC SecretKey | Workers Secrets | ❌ 永不下发 |
| UserSig | Workers 生成 | ✅ 短时效、单次会话 |
| LLM API Key / Token | Workers Secrets（按 Provider） | ❌ 永不下发 |
| Supabase JWT | iOS Keychain | ✅ 用户会话 |
| 通话额度 | Supabase `user_wallets` | ✅ 仅余额数字 |
| 用户 API Key | — | ❌ 不使用 BYOK |

---

## 10. Supabase ↔ Cloudflare 分工

```mermaid
flowchart LR
    subgraph iOS
        A[supabase-swift]
    end

    subgraph Supabase
        AUTH[Auth]
        PG[(PostgreSQL)]
        RLS[RLS]
    end

    subgraph Workers
        API[REST API]
        CRON[Cron]
        PUSH[Push]
    end

    A -->|登录 / 刷新 Token| AUTH
    A -->|业务 API| API
    API -->|service role HTTPS| PG
    AUTH --> PG
    PG --- RLS
    CRON --> PUSH
    CRON --> PG
```

| 能力 | Supabase | Cloudflare Workers |
|------|----------|-------------------|
| 用户登录 | ✅ Auth | 验证 JWT |
| 业务数据 | ✅ PostgreSQL | 读写 API |
| 主动调度 | ❌ | ✅ Cron |
| VoIP Push | ❌ | ✅ → APNs |
| 签发 UserSig + 启动 AI 对话 | ❌ | ✅ |
| StoreKit 验单 | ❌ | ✅ |
| 实时语音流 | ❌ | ❌（iOS ↔ TRTC 云） |

---

## 11. Phase 0 → Phase 1+ 演进

```mermaid
flowchart TB
    subgraph P0["Phase 0 · 当前"]
        P0IOS[iOS SwiftUI + TRTC SDK]
        P0W[Workers<br/>API + Cron + Push + Billing]
        P0TRTC[腾讯云 TRTC AI 实时对话]
        P0SB[(Supabase)]
        P0SK[StoreKit 消耗型 IAP]
    end

    subgraph P1["Phase 1+ · 有收入后"]
        P1VA[Fly.io Python<br/>Voice Agent · 可选]
        P1SUB[StoreKit 订阅]
        P1MEM[pgvector Memory]
        P1LLM[LLM Proactive Engine]
    end

    P0IOS --> P0W --> P0SB
    P0IOS --> P0TRTC
    P0IOS --> P0SK --> P0W
    P0W --> P0TRTC

    P0W -.->|扩展| P1LLM
    P0TRTC -.->|可选替换| P1VA
    P0SK -.-> P1SUB
    P0SB -.-> P1MEM
```

---

## 12. API 路由一览（Workers）

```mermaid
flowchart LR
    subgraph Push["Push & 偏好"]
        R1[POST /v1/push-tokens]
        R2[GET/PATCH /v1/call-preferences]
        R3[POST /v1/call-events]
    end

    subgraph Call["通话"]
        R4[POST /v1/calls/start]
        R5[POST /v1/calls/end]
    end

    subgraph Billing["计费"]
        R6[GET /v1/wallet]
        R7[POST /v1/billing/apple/verify]
    end

    subgraph Cron["定时"]
        R8[scheduled Cron]
    end

    R8 --> R1
    R4 --> R5
    R7 --> R6
```

---

## 13. 图例与阅读顺序

建议按以下顺序阅读本文档：

1. **§1 架构总览** — 建立全局印象  
2. **§4 主动来电** — 理解核心卖点  
3. **§5 语音通话** — 理解 TRTC AI 进房与 Workers 编排  
4. **§6 充值计费** — 理解商业化闭环  
5. **§9 安全边界** — 理解 Key 与 Token 分工  
6. **§11 演进** — 理解 Phase 1+ 扩展方向  
7. **§14 TRTC 选型** — 国内支付、Secrets、API 响应形状  
8. **§15 LLM Provider** — 多形态 LLM 适配与 TRTC 对接  

---

## 14. 腾讯云 TRTC · AI 实时对话（Phase 0 选型）

### 为什么选 TRTC

| 维度 | 说明 |
|------|------|
| **支付** | 腾讯云控制台支持 **支付宝 / 国内银行卡**，无需境外信用卡 |
| **免费额度** | 每月约 **10,000 分钟** 免费包（含 AI 对话抵扣，以官网为准） |
| **iOS 集成** | 官方 **TRTC iOS SDK**，与 CallKit / AVAudioSession 成熟配合 |
| **架构** | AI Bot **服务端进房**，iOS 只持 UserSig，不暴露 SecretKey |

### 与 OpenAI Realtime 的差异

| 项 | OpenAI Realtime | TRTC AI 实时对话 |
|----|-----------------|------------------|
| 连接方式 | WebRTC 直连 OpenAI | TRTC SDK 进房 + 云端 AI Bot |
| Workers 职责 | 签发 ephemeral token | 签发 **UserSig** + **StartAIConversation** |
| LLM | OpenAI 内置 | **LlmProvider** → TRTC `LLMConfig`（OpenAI 协议） |
| 计费主体 | OpenAI API | 腾讯云 TRTC + 各 LLM Provider 分别计费 |

### Workers Secrets（Phase 0）

按 **LlmProvider** 分包，不设单一 `LLM_API_URL` 假设。示例：

```text
# TRTC
TRTC_SDK_APP_ID
TRTC_SECRET_KEY
TENCENT_SECRET_ID
TENCENT_SECRET_KEY

# 默认 Provider：openai_compatible | anthropic_compatible
LLM_PROVIDER_DEFAULT=openai_compatible

# OpenAI 兼容（Chat Completions 协议）
LLM_OPENAI_COMPAT_API_KEY
LLM_OPENAI_COMPAT_API_URL      # 如 https://api.deepseek.com/v1/chat/completions
LLM_OPENAI_COMPAT_MODEL

# Anthropic 兼容（Messages API 协议）
LLM_ANTHROPIC_API_KEY
LLM_ANTHROPIC_MODEL            # 如 claude-sonnet-4-20250514

APNS_* / SUPABASE_* / APPLE_IAP_*
```

> 具体 Key 名由 `apps/api/src/lib/llm/` 各 Adapter 定义；新增 Provider 只加 Adapter + Secrets，不改 iOS。

### `/v1/calls/start` 响应形状（示例）

```json
{
  "data": {
    "call_id": "uuid",
    "trtc": {
      "sdk_app_id": 1400000000,
      "room_id": "call_uuid",
      "user_id": "user_xxx",
      "user_sig": "eJyrVgrx..."
    }
  }
}
```

iOS 使用 `sdk_app_id` + `user_sig` 调用 TRTC SDK 进房；Workers 已通过 `StartAIConversation` 让 AI Bot 进入同一 `room_id`。

### 开发成本提示

- 开发期可利用 **10k 分钟/月免费包** + 腾讯云新用户代金券
- LLM 费用单独计（按所选 Provider 向各厂商充值，如 DeepSeek / 百炼 / 火山等）
- 内测仍建议设单用户日上限，防止 TRTC + LLM 账单失控

---

## 15. LLM Provider 抽象（OpenAI / Anthropic 两种兼容）

业界 LLM HTTP API **两种最常见形态**：

| 协议 | 代表厂商 | Callie Provider id | 典型端点 |
|------|----------|-------------------|----------|
| **OpenAI Chat Completions** | OpenAI、DeepSeek、MiniMax、混元、Groq、多数国内网关 | `openai_compatible` | `POST …/chat/completions` |
| **Anthropic Messages** | Anthropic Claude | `anthropic_compatible` | `POST …/v1/messages` |

Workers 内统一 **`LlmProvider` 适配层**，iOS **永远不知道**具体厂商；DeepSeek / 百炼等只是挂在 `openai_compatible` 后面的 **不同 APIUrl + Model**，不是第三套架构。

### 两条 LLM 调用路径

```mermaid
flowchart LR
    subgraph Call["通话中 · TRTC 实时对话"]
        W1[Workers /v1/calls/start]
        AD1[LlmProvider.toTrtcLlmConfig]
        TRTC[StartAIConversation]
        W1 --> AD1 --> TRTC
    end

    subgraph After["通话后 · Workers 直连"]
        W2[Workers /v1/calls/end]
        AD2[LlmProvider.complete]
        W2 --> AD2
    end
```

| 路径 | 谁调 LLM | 两种兼容如何接入 |
|------|----------|------------------|
| **通话中** | TRTC AI 任务 | TRTC 原生支持 **`LLMType: openai`**（OpenAI 协议）。`anthropic_compatible` 实时通话需 **OpenAI 兼容网关转 Claude**，或 Phase 1+ 自托管 Agent 直连 Anthropic |
| **通话后** | Workers 直接 | **`openai_compatible` 与 `anthropic_compatible` 均为一等公民**，各自 `complete()` |

两条路径可 **分离 Provider**（例：通话 `openai_compatible` + DeepSeek，总结 `anthropic_compatible` + Claude）。

### Phase 0 推荐默认

```text
LLM_PROVIDER_DEFAULT=openai_compatible     # TRTC 实时对话（TRTC 要求 OpenAI 协议）
LLM_SUMMARY_PROVIDER=anthropic_compatible  # 通话后 summary（可选，质量更好）
```

### TRTC 实时通话与 Anthropic 的说明

TRTC `StartAIConversation` 的 `LLMConfig` 对「标准大模型」走 **`LLMType: openai`**（即 OpenAI Chat Completions 协议）。因此：

- **OpenAI / DeepSeek / 混元等** → 直接填 `APIUrl` + `Model` + `APIKey`  
- **Anthropic Claude 实时通话** → Phase 0 可选：经 **OpenAI 兼容代理**（如 LiteLLM / 自建网关）再交给 TRTC；或 Phase 1+ 自托管 Voice Agent 原生调 Messages API  

通话后的 summary / 学习分析 **不受 TRTC 限制**，可直接用 `anthropic_compatible`。

### Workers 代码结构（规划）

```text
apps/api/src/lib/llm/
├── types.ts
├── registry.ts
├── trtc-config.ts
└── providers/
    ├── openai-compatible.ts    # TRTC 实时 + summary（DeepSeek 等）
    └── anthropic-compatible.ts # summary；P1+ 实时 Agent
```

### `LlmProvider` 接口（概念）

```typescript
type LlmProviderId = "openai_compatible" | "anthropic_compatible";

interface LlmProvider {
  id: LlmProviderId;
  complete(input: LlmCompleteInput): Promise<LlmCompleteOutput>;
  /** openai_compatible → TRTC LLMType "openai"；anthropic 需网关或返回不可用 */
  toTrtcLlmConfig(ctx: CallPersonaContext): string;
}
```

### 设计原则

- **两种协议为主**：OpenAI Chat Completions + Anthropic Messages，覆盖绝大多数模型  
- **厂商是配置，不是架构**：换 DeepSeek → 只改 `APIUrl` / `Model`，不换 Adapter  
- **iOS 零感知**：只拿 TRTC 进房参数  
- **通话 / 总结可拆 Provider**：实时便宜、离线质量高  
- **Anthropic 实时**：文档诚实标注 TRTC 限制与 Phase 1+ 路径

---

## 16. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.4 | 2026-08-23 | §15 移除 Dify/Coze/LKE 等非 Phase 0 内容 |
| v1.3 | 2026-08-23 | §15 明确以 OpenAI / Anthropic 两种兼容为主轴 |
| v1.2 | 2026-08-23 | 新增 §15 LlmProvider 抽象 |
| v1.1 | 2026-08-23 | Phase 0 语音方案改为腾讯云 TRTC · AI 实时对话 |
| v1.0 | 2026-08-23 | 初版：Phase 0 架构图独立成文 |
