# AI 主动式外语学习 App：项目拆分与技术栈规划

> 文档版本：v1.4  
> 更新时间：2026-08-23

## 1. 文档目的

本文档记录 AI 主动式外语学习 App 的工程拆分方式、各模块职责、推荐技术栈以及推荐开发顺序。

核心理念：

> **不是让用户记得学习，而是让学习主动来找用户。**

App 采用类似微信的 IM 交互形式，但核心不是传统聊天，而是 AI 学习伙伴主动向用户发起 **App 内实时语音通话**，通过自然语言交流完成外语学习。

工程采用：

> **先实现独立能力模块 → 分别验证 → 最后进行业务组装**

需要强调：

> **模块独立 ≠ 微服务独立 ≠ Git Repository 独立。**

初期推荐使用 Monorepo，将能力模块进行逻辑隔离，而不是一开始拆成大量独立仓库和微服务。

---

## 1.1 平台与技术路线决策

**MVP 采用 iOS 原生（SwiftUI）路线，优先保证最佳来电与语音体验。**

| 决策项 | 选择 | 理由 |
|---|---|---|
| 首发平台 | **iOS only** | 订阅付费习惯更好；CallKit / PushKit 体验成熟 |
| 客户端技术 | **SwiftUI 原生** | 来电、后台音频、RTC 等核心链路需要系统级集成 |
| 跨平台方案 | **暂不使用 React Native / Expo** | 来电体验是产品核心，原生上限更高、踩坑更少 |
| Android | **MVP 不做** | iOS 验证核心闭环后再评估（Kotlin Compose 或 RN） |

核心原则：

> **为「AI 主动来电 + 实时语音」选择原生 iOS，而不是为「未来可能上 Android」牺牲 iOS 体验。**

客户端与 **Cloudflare Workers REST API** 通信；Auth 走 Supabase；**AI 能力由服务端提供，用户通过充值/订阅付费，客户端不接触 API Key。**

---

## 1.2 商业模式与 AI 架构决策

**AI Agent 做在服务端；平台代持 API Key；用户充值使用。**

| 决策项 | 选择 | 理由 |
|---|---|---|
| AI 能力提供方 | **Callie 服务端** | 用户无需配置 Key；体验像正常 App |
| API Key 存放 | **Workers Secrets / 服务端** | 永不下发客户端，消除 Key 信任问题 |
| 用户付费 | **StoreKit 充值（通话额度）** | iOS 原生支付；可扩展订阅包 |
| Phase 0 语音 | **Workers 签发 Realtime 临时 Token** | 实时双工 + 服务端计量扣费 |
| Phase 1+ 语音 | **Fly.io Python Voice Agent**（可选） | 更可控的 STT/LLM/TTS 管道 |

核心原则：

> **用户付费买「和 Sarah 通话」，不是买 API Key。**  
> **平台承担 AI 成本，通过充值额度回收并留合理毛利。**

### 通话鉴权与计费流程（Phase 0）

```text
用户接听 CallKit
   ↓
iOS POST /v1/calls/start（Supabase JWT）
   ↓
Workers：查 user_wallets 余额 → 不足则拒绝
   ↓
Workers：用平台 Key 向 OpenAI 申请 Realtime 临时 Token（ephemeral）
   ↓
返回临时 Token 给 iOS（非 API Key，短时效）
   ↓
iOS WebRTC 连 OpenAI Realtime → 实时双工通话
   ↓
挂断 → iOS POST /v1/calls/end（时长 / usage）
   ↓
Workers：扣减额度 + 写 usage_logs + 异步生成 learning summary
```

---

## 1.3 预算约束与 Phase 0 策略

**初期无投资、预算有限：在保留「主动来电」卖点的前提下，尽量把自有成本压到最低。**

### 成本原则

> **主动来电（PushKit + CallKit + Scheduler）不能砍。**  
> **实时双工语音不能降级为回合制。**  
> **AI 由服务端提供；开发者先垫付 API 成本，用户充值覆盖。**  
> **Phase 0 用 Workers 签发 Realtime 临时 Token，暂不上独立 Python Agent，控制基础设施成本。**

### Phase 0 vs 完整版

| 维度 | Phase 0（预算有限） | Phase 1+（有收入后） |
|---|---|---|
| **主动来电** | ✅ PushKit + CallKit | 同左 |
| **Scheduler** | Cloudflare Workers Cron | + LLM 智能 Proactive Engine |
| **Backend** | **Cloudflare Workers**（API + Cron + Push + 计费） | + Fly.io Voice Agent |
| **Auth** | Supabase Auth 免费档 | 同左 |
| **AI 能力** | **服务端 Realtime 临时 Token** | 完整 Voice Agent 服务 |
| **API Key** | Workers Secrets（平台代持） | 同左 + 密钥轮换 |
| **用户付费** | **StoreKit 充值 → 通话额度** | + 订阅包（月含 N 分钟） |
| **语音对话** | ✅ OpenAI Realtime（服务端签发） | Agora + 自托管 Agent（可选） |
| **Voice Agent** | Workers 编排（轻量） | Python + LiveKit Agents |
| **Memory / 画像** | SwiftData + Supabase 通话记录 | + pgvector |
| **监控** | ❌ 暂不上 | Sentry + PostHog |

### 1.4 Phase 0 实时语音方案（服务端 Agent + 像电话）

回合制**不像接电话**；Phase 0 必须 **实时双工**。

**推荐 — 服务端签发 OpenAI Realtime Ephemeral Token**

```text
CallKit 接听
   ↓
Workers /v1/calls/start（校验额度）
   ↓
平台 Key → OpenAI 创建 ephemeral session
   ↓
iOS 拿临时 Token 建 WebRTC（客户端无 API Key）
   ↓
实时 speech-to-speech（可打断）
   ↓
挂断 → Workers 扣费 + 生成 feedback
```

| 优点 | 说明 |
|---|---|
| 像真电话 | Realtime 原生双工 |
| 用户信任 | 不填 Key、不担心被偷 |
| 可计费 | 服务端掌握 session 起止与用量 |
| Phase 0 够轻 | 不必先部署 Python Agent |

**Phase 1+ 备选 — Fly.io Python Voice Agent + Agora**

适合要换模型、自控 prompt、或 OpenAI Realtime 成本过高时迁移。

**不推荐回合制作为默认方案。**

### Phase 0 月度成本估算

| 项目 | 方案 | 月成本（开发者） |
|---|---|---|
| Apple Developer | 必选 | **~$8**（$99/年摊销） |
| Backend | Cloudflare Workers Free | **$0** |
| 数据库 | Supabase Free | **$0** |
| VoIP Push | Workers → APNs | **$0** |
| **AI API** | **平台 Key，按用户通话量计费** | **变动**（用户充值覆盖） |
| Voice Agent 服务器 | Phase 0 不需要 | **$0** |
| **固定合计** | | **~$8/月 + AI 浮动** |

> 内测阶段可设：新用户赠送少量免费分钟，严格单用户日上限，防止 API 账单失控。

### Phase 0 架构一览

```text
iOS App (SwiftUI)
├── CallKit + PushKit
├── Realtime 通话（临时 Token，无 API Key）
├── StoreKit 充值
└── SwiftData（本地缓存）

Supabase Free
├── Auth
├── PostgreSQL（额度、通话、订单）
        ↑ HTTPS
Cloudflare Workers
├── REST API（通话 / 计费 / 偏好）
├── Cron Scheduler + VoIP Push
├── 签发 Realtime ephemeral token
└── Secrets：OPENAI_API_KEY, APNS_*, SUPABASE_*

Phase 0 不做：
✗ 客户端 BYOK
✗ 独立 Python Agent（Phase 1+）
✗ Redis / BullMQ
```

Supabase Free 限额：500MB DB、5 万 MAU Auth。  
Cloudflare Workers 免费档：10 万请求/天，Cron 包含在内。

---

# 2. 产品核心闭环

```text
                    用户
                     │
                     ↓
                用户学习画像
                     │
                     ↓
              AI 主动学习调度器
                     │
                     ↓
                AI 决定联系用户
                     │
                     ↓
                🔔 App 内来电
                     │
                     ↓
               用户接听语音通话
                     │
                     ↓
               AI 实时自然交流
                     │
                     ↓
                通话结束
                     │
                     ↓
                AI 学习分析器
                     │
                     ↓
              学习反馈 + 错误记录
                     │
                     ↓
               更新学习画像
                     │
                     └──────────────→ 下一次主动联系
```

---

# 3. 工程拆分总览

```text
AI Language Learning
│
├── 01. app-shell
│      iOS App 基础框架（SwiftUI）
│
├── 02. auth
│      用户认证
│
├── 03. im-core
│      IM 消息系统
│
├── 04. push
│      PushKit VoIP + CallKit 来电
│
├── 05. rtc
│      实时语音（Phase 0: OpenAI Realtime；P1+: Agora SDK）
│
├── 06. voice-agent
│      AI 语音（Phase 0: Workers Realtime；P1+: Python Agent）
│
├── 07. conversation
│      AI 对话引擎
│
├── 08. learning-engine
│      学习分析 / 学习画像
│
├── 09. memory
│      AI 长期记忆
│
├── 10. proactive-engine
│      主动联系调度（Phase 0: Workers Cron）
│
├── 11. backend
│      Cloudflare Workers API + Supabase DB
│
└── 12. product
       最终业务组装
```

这些模块是为了降低研发复杂度、隔离技术风险，不意味着最终必须部署成 12 个微服务。

---

# 4. 技术栈总览

> 下表标注 **P0** = Phase 0（预算有限）采用；**P1+** = 有收入后再上。

| 模块 | Phase 0（P0） | Phase 1+（P1+） |
|---|---|---|
| **iOS App** | SwiftUI + Swift 5.9+ | 同左 |
| **iOS 架构** | MVVM + `@Observable` | 同左 |
| **iOS 本地存储** | SwiftData + Keychain | + iCloud 同步（可选） |
| **来电体验** | CallKit + PushKit | 同左 |
| **iOS 音频** | AVAudioSession + OpenAI Realtime WebRTC | + Agora SDK（可选） |
| **AI 能力** | **服务端提供**（Workers 编排） | Fly.io Voice Agent |
| **API Key** | Workers Secrets，不下发客户端 | 密钥轮换 / 多模型 |
| **用户付费** | StoreKit → 通话额度（credits） | + 订阅包 |
| **LLM / 语音** | OpenAI Realtime（平台 Key + 临时 Token） | 可选 Agora + 自托管管道 |
| **Backend** | **Cloudflare Workers**（API + Cron + Push + 计费） | + Fly.io Voice Agent |
| **Database** | Supabase PostgreSQL | 扩容 |
| **Scheduler** | Workers Cron | + LLM 决策 |
| **Push** | Workers → APNs | + Queues |
| **RTC / 实时语音** | Realtime ephemeral token（WebRTC） | Agora / LiveKit + Agent |
| **Voice Agent** | Workers 轻量编排 | Python + LiveKit Agents |
| **Memory** | SwiftData 本地 | pgvector |
| **Realtime IM** | ❌ 不做 | Supabase Realtime |
| **Cache / Queue** | ❌ 不做 | Redis + BullMQ |
| **监控** | ❌ 不做 | Sentry 免费档 |
| **分析** | ❌ 不做 | PostHog 免费档 |
| **CI/CD** | 本地 Xcode 构建 | GitHub Actions + Fastlane |
| **订阅 / 充值** | StoreKit 2（通话额度包） | 订阅 + 消耗型 IAP |

---

# 5. 01 — App Shell

目标：建立 iOS 原生 App 基础工程。

技术栈：

```text
SwiftUI
Swift 5.9+
NavigationStack + TabView
@Observable / Observation（状态管理）
URLSession + async/await（网络层）
SwiftData（本地缓存，可选）
```

基础能力：

- Tab 导航（消息 / 学习 / AI 伙伴 / 我的）
- 主题与 Design System（颜色、字体、间距）
- 网络层封装（Supabase JWT、Workers API Base URL）
- 环境配置（Dev / Staging / Prod）
- Phase 0 不上 Sentry / PostHog（有收入后再加）

iOS 工程要求：

- 最低部署目标：**iOS 17+**（SwiftUI Observation、StoreKit 2 等现代 API）
- Xcode 项目 + Swift Package Manager 管理依赖
- 按 Feature 组织代码（Auth / IM / Call / Settings 等）

---

# 6. 02 — Auth

目标：

```text
注册 → 登录 → Session → Refresh Token → 退出
```

技术栈：

```text
SwiftUI
supabase-swift（Supabase Auth SDK）
Keychain（Token 安全存储）
PostgreSQL（via Supabase）
```

---

# 7. 03 — IM Core

Phase 0 做**简化版**：会话列表 + 通话记录，不做完整 Realtime IM。

核心能力（Phase 0）：

- AI 伙伴会话列表（本地 + 少量云端元数据）
- 通话记录展示
- 未读状态（本地）

Phase 1+ 再补：

- 消息分页、实时消息、已读同步

技术栈：

```text
Phase 0:
  Client: SwiftUI + SwiftData
  Backend: Cloudflare Workers（通话记录 API，可选）

Phase 1+:
  Client: SwiftUI + supabase-swift
  Realtime: Supabase Realtime
  Backend: Workers + Supabase PostgreSQL
```

核心数据：

```text
conversations
conversation_members
messages
message_reads
```

IM 是交互载体，不是最终产品目的。

---

# 8. 04 — Push & CallKit

目标：

> **服务端主动通知 iPhone，并以系统级来电界面呈现。**

这是 iOS 原生路线的核心优势模块。

技术栈：

```text
PushKit（VoIP Push — 高优先级唤醒 App）
CallKit（系统来电 UI — 「Sarah 正在呼叫你」）
UserNotifications（普通 Push — 学习提醒、反馈通知）
APNs（Apple Push Notification service）
```

核心流程：

```text
Cloudflare Workers Cron（Scheduler）决定联系用户
   ↓
Workers 发送 VoIP Push（PushKit）→ APNs
   ↓
iPhone 唤醒 App（即使 App 在后台/被杀）
   ↓
CallKit 展示系统来电界面
   ↓
用户点击「接听」
   ↓
App 进入实时通话（OpenAI Realtime WebRTC）
```

Phase 0 必须实现：

1. **VoIP Push** — Cloudflare Workers → APNs HTTP/2（JWT 自签 `.p8` Key）
2. **CallKit** — 锁屏/前台统一的系统来电 UI

Phase 0 可延后：

3. **普通 Push** — 通话结束后的学习反馈通知

CallKit 集成要点：

- `CXProvider` 注册来电
- `CXCallController` 处理接听/拒接/挂断
- Phase 0：接听 → `/v1/calls/start` 拿 Realtime 临时 Token → WebRTC
- Phase 1+：可选 Agora + Fly.io Voice Agent
- 拒接/未接 → 经 Workers API 写入 Supabase，影响下次调度

> **Push 与 Scheduler 均在 Cloudflare Workers（`apps/api`），Supabase 只存 Token 与偏好。**

---

# 9. 05 — RTC / 实时语音

> **Phase 0 必须实时双工。** AI 由**服务端**提供；iOS 仅持**短时效临时 Token**，不持有 API Key。

## Phase 0 — 服务端签发 Realtime Ephemeral Token

```text
CallKit 接听
   ↓
POST /v1/calls/start（JWT + 余额校验）
   ↓
Workers：OPENAI_API_KEY → 创建 Realtime session / ephemeral token
   ↓
iOS：WebRTC + 临时 Token → OpenAI Realtime
   ↓
实时 speech-to-speech（支持打断）
   ↓
POST /v1/calls/end → 扣额度 + usage_logs
```

iOS 实现要点：

- `AVAudioSession` 与 CallKit 协同
- 通话页：计时、静音、扬声器、挂断；可展示剩余额度
- **禁止**在客户端存储 OpenAI API Key

## Phase 1+ — Fly.io Voice Agent + Agora（可选）

```text
iOS ↔ Agora ↔ Python Voice Agent ↔ STT / LLM / TTS
```

适合需要完全自控管道、或多模型路由时。

---

# 10. 06 — Voice Agent / 服务端 AI

> **AI 能力在服务端。** Phase 0 由 Workers 编排 Realtime 会话；Phase 1+ 可迁 Fly.io Python Agent。

## Phase 0 — Workers 轻量 Agent

```text
/v1/calls/start
   → 校验 user_wallets 余额
   → 注入 system prompt（Sarah 人设、用户水平）
   → OpenAI Realtime ephemeral token
   → 返回 iOS

/v1/calls/end
   → 记录时长 / token 用量
   → 扣减 credits
   → Chat Completions 生成 learning summary → 存 Supabase
```

Secrets（Workers，用户不可见）：

```text
OPENAI_API_KEY
```

## Phase 1+ — Python Voice Agent（Fly.io）

```text
User ↔ Agora ↔ Python Agent ↔ STT / LLM / TTS
```

Workers 仍负责：鉴权、计费、Push、Scheduler。

---

# 11. 07 — Conversation Engine

重要架构原则：

> **Voice Agent ≠ Conversation Engine**

Voice Agent 负责：

> 怎么听、怎么说。

Conversation Engine 负责：

> 应该说什么。

输入：

```text
User Profile
+
Learning Profile
+
Conversation Memory
+
Recent Mistakes
+
Conversation Plan
```

输出：

```text
下一句话
是否继续主题
是否改变话题
是否调整难度
是否纠正用户
是否结束通话
```

推荐：

```text
Phase 0:
  iOS 调 Workers API（已注入人设 / 水平的 session）
  Conversation prompt 在 /v1/calls/start 服务端配置

Phase 1+:
  Python Conversation Engine on Fly.io
```

Phase 0 不急着使用复杂 Agent Framework；结构化 Prompt + 简单对话 State 即可。

---

# 12. 08 — Learning Engine

目标：

> **分析用户刚才说得怎么样。**

```text
Conversation
     ↓
Learning Analyzer
     ↓
┌───────────────┐
│ Grammar       │
│ Vocabulary    │
│ Fluency       │
│ Pronunciation │
│ Expressions   │
└───────────────┘
```

输出：

- 新表达
- 语法问题
- 词汇问题
- 流利度
- 发音
- 学习反馈

推荐：

```text
Phase 0:
  Workers 调 LLM 生成 summary（平台 Key）
  结果存 Supabase + 同步 iOS

Phase 1+:
  Python Learning Engine on Fly.io
```

Phase 0 不建立复杂语言测评体系；简单反馈 + 错误列表即可。

---

# 13. 09 — Memory

目标：

> **让 AI 真正“记得用户”。**

例如用户说：

> I went to Seoul last week.

系统记录：

```text
User Memory
└── recently visited Seoul
```

下一次 AI 可以问：

> Hey! How was your trip to Seoul?

技术路线：

```text
Phase 0:
  SwiftData（本地 JSON / 结构化记忆）
  通话结束时 LLM 提取关键 fact 写入本地

Phase 1+:
  PostgreSQL JSONB → pgvector + Embedding
```

最终：

```text
Structured Memory
+
Semantic Memory
```

不要一开始把全部历史聊天都塞进 Prompt，而应逐渐形成：

```text
Conversation History
        ↓
Memory Extraction
        ↓
Important Memories
        ↓
PostgreSQL / pgvector
        ↓
Relevant Memory Retrieval
        ↓
Conversation Engine
```

---

# 14. 10 — Proactive Engine

这是产品最核心的业务能力。

它负责回答：

> **“AI 为什么今天要主动联系这个用户？”**

输入：

```text
User Profile
+
Learning Profile
+
Conversation History
+
Learning History
+
Preferences
+
Last Conversation
+
Current Time
```

输出：

```text
Should Call?
Which Partner?
When?
Topic?
Duration?
Difficulty?
Learning Goal?
```

例如：

```text
User:
B1

Preferred:
19:00 - 21:00

Last Call:
Yesterday

Last Topic:
Travel

Recent Mistake:
Past tense

Decision:

call = true
time = 19:30
partner = Sarah
topic = Travel
goal = Past Tense
duration = 8 min
```

推荐：

```text
Phase 0:
  Cloudflare Workers Cron（Scheduler）
  + Workers → APNs（VoIP Push）
  + Supabase PostgreSQL（偏好 / 额度 / 通话记录）

Phase 1+:
  + Cloudflare Queues（批量 Push）
  + LLM 辅助决策（话题 / 难度）
  + Fly.io Python Voice Agent（可选）
```

Phase 0 Scheduler 逻辑：

```text
Workers Cron 每 5 分钟触发
   ↓
查 call_preferences：当前时段 + 频率 + 允许来电
   ↓
查上次通话 / 拒接次数
   ↓
满足条件 → 读 push_tokens → Workers 调 APNs 发 VoIP Push
```

---

# 15. 11 — Backend

## Phase 0 — 自建 Backend（Cloudflare Workers，推荐）

**你有自己的后端代码，托管在 Cloudflare 免费档，月成本 $0～$5。**

```text
Cloudflare Workers（TypeScript + Hono）
├── REST API（Push Token、偏好、通话、**计费**）
├── /v1/calls/start | end（Realtime 临时 Token + 扣费）
├── /v1/billing/*（StoreKit 验单、余额查询）
├── Cron Scheduler + VoIP Push → APNs
└── Secrets：OPENAI_API_KEY, APNS_*, SUPABASE_*

Supabase Free：
├── Auth
└── PostgreSQL（user_wallets, usage_logs, push_tokens, …）

Phase 0 **不需要**：

```text
✗ 客户端 BYOK / 用户 API Key
✗ 独立 VPS / 常驻 Fastify
✗ Python Voice Agent（Phase 1+ Fly.io）
✗ Redis / BullMQ
```

### 为什么 Cloudflare 适合 Callie Phase 0

| 需求 | Cloudflare 方案 | 免费档 |
|---|---|---|
| REST API | Workers + Hono | 10 万请求/天 |
| 定时 Scheduler | **Cron Triggers** | ✅ 包含 |
| VoIP Push → APNs | Workers `fetch()` + JWT 签名 | ✅ 生产环境支持 HTTP/2 |
| 数据库 | D1 或 Supabase Postgres | D1 免费 / Supabase 免费 |
| 密钥管理 | Workers Secrets | ✅ |
| 全球低延迟 | Edge 部署 | ✅ |

> APNs 要求 HTTP/2：Cloudflare **生产环境** Workers 经代理栈支持；本地 `wrangler dev` 可能需打真实部署验证 Push。

### Workers API 示例

| Route / Trigger | 作用 |
|---|---|
| `POST /v1/push-tokens` | 注册 PushKit VoIP Token |
| `GET/PATCH /v1/call-preferences` | 联系偏好 |
| `POST /v1/calls/start` | 校验余额 → 签发 Realtime 临时 Token |
| `POST /v1/calls/end` | 结束通话 → 扣费 + usage |
| `GET /v1/wallet` | 查询剩余额度 |
| `POST /v1/billing/apple/verify` | StoreKit 验单 → 增加额度 |
| `scheduled()` Cron | Scheduler + VoIP Push |

### Phase 1+ — 扩展 Backend

```text
Cloudflare Workers（边缘 API + Scheduler + Push）
        +
Fly.io / Hetzner VPS（Python Voice Agent，有收入后）
```

Workers 始终负责：鉴权、计费、Push、Scheduler；Voice Agent 只处理音频 AI 管道。

---

# 15.12 — 计费与充值（Billing）

Phase 0 与 Backend 同在 Cloudflare Workers + Supabase。

```text
StoreKit 购买
   ↓
iOS POST /v1/billing/apple/verify（收据 / Transaction ID）
   ↓
Workers 验单 → credit_transactions + user_wallets 加额度

通话结束
   ↓
POST /v1/calls/end
   ↓
扣减 balance_seconds → usage_logs → credit_transactions(type=usage)
```

| 表 | 作用 |
|---|---|
| `user_wallets` | 当前剩余通话秒数 / 额度 |
| `credit_transactions` | 充值、消耗、赠送、退款流水 |
| `usage_logs` | 每通电话用量与内部成本估算 |

内测风控（建议）：

- 新用户注册赠送有限免费分钟（`type=grant`）
- 单用户每日消耗上限
- 余额 ≤ 0 时拒绝 `/v1/calls/start`（402 Payment Required）

StoreKit：Phase 0 用 **消耗型 IAP（Consumable 额度包）**；Phase 1+ 可加自动续订订阅。

---

# 16. Supabase 的定位

Phase 0：**Supabase 管 Auth + 数据库；业务 API / Scheduler / Push 放在 Cloudflare Workers。**

```text
              iOS App (SwiftUI)
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
   supabase-swift  PushKit   SwiftData
   (Auth)          CallKit   (本地)
        │           │
        ↓           ↓
   Supabase Free   Cloudflare Workers  ← 你的 Backend
   ├── Auth        ├── REST API
   └── PostgreSQL  ├── Cron Scheduler
        ↑          └── VoIP Push → APNs
        └──── HTTPS（service role）──┘
```

### 分工

| 组件 | 放哪 | 理由 |
|---|---|---|
| 用户登录 | Supabase Auth | iOS SDK 成熟，免费 |
| 业务表 | Supabase Postgres 或 Cloudflare D1 | Postgres 功能更强；D1 则全在 CF |
| REST API | **Cloudflare Workers** | 你的代码，免费档够用 |
| Scheduler | **Workers Cron** | 替代 pg_cron / BullMQ |
| VoIP Push | **Workers → APNs** | 不依赖第三方 Push 服务 |
| Realtime IM | Phase 0 不做 | — |
| Storage | Phase 0 不做 | 头像本地 |

### 数据库选型

**方案 A（推荐）：Supabase Postgres + Workers API**

- iOS Auth 走 Supabase；Workers 用 `@supabase/supabase-js` + service role 读写表
- 无需 Hyperdrive，走 HTTPS PostgREST
- 免费档：500MB DB

**方案 B：Cloudflare D1 全栈**

- 数据全在 Cloudflare，部署更简单
- Auth 仍可用 Supabase，或 Workers + JWT 自管
- SQLite 语法，MVP 表足够

不适合放在 Supabase Edge Functions 的：VoIP Push、Cron Scheduler——**迁到 Cloudflare Workers 更合适**。

不适合 Cloudflare Workers 的（Phase 1+）：

- Python Voice Agent 长连接
- 大文件音频流处理  
→ 届时用 Fly.io / Hetzner 跑 Python 服务

---

# 16.1 部署与托管方案对比

Phase 0 推荐 **Cloudflare Workers + Supabase Free**；有收入后再加 VPS 跑 Voice Agent。

| 平台 | 适合 Callie 什么 | 免费档 | 月成本 | Phase 0 |
|---|---|---|---|---|
| **Cloudflare Workers** | REST API、Cron Scheduler、APNs Push | 10 万 req/天 | $0～5 | ✅ **主力 Backend** |
| **Cloudflare D1** | SQLite 数据库（可选替代 Supabase DB） | 5GB | $0 | ✅ 可选 |
| **Cloudflare Queues** | 异步 Push 队列 | 有免费额 | $0 | Phase 1+ |
| **Supabase Free** | Auth + PostgreSQL | 500MB DB | $0 | ✅ Auth + DB |
| **Fly.io** | Fastify / Python 常驻进程 | 额度很少 | ~$5+ | Phase 1+ Voice Agent |
| **Hetzner VPS** | 自建 Docker（Fastify + Python） | 无 | ~€4 | Phase 1+ 最便宜 VPS |
| **Railway / Render** | Node/Python 一键部署 | 试用 / 有限 | ~$5+ | 可选 |
| **Vercel** | Serverless API + Cron | 有限 | $0～20 | 可行但 Cron 不如 CF 直观 |

### 什么不能放 Cloudflare Workers

| 组件 | 原因 | 替代 |
|---|---|---|
| Python Voice Agent | Workers 无 Python 长进程 | Fly.io / Hetzner |
| OpenAI Realtime 音频 | Workers 签发临时 Token；iOS WebRTC | 平台 Key 在 Secrets |
| 传统 Fastify 24h 进程 | Workers 是 request/cron 模型 | Workers + Hono，或 VPS |

### 推荐 Phase 0 部署拓扑

```text
                    [ 你的 Cloudflare 账号 ]
                              │
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
   Workers API          Workers Cron          Workers Secrets
   /v1/push-tokens      每 5min 扫描           APNS .p8 Key
   /v1/preferences      → 发 VoIP Push         Supabase Key
         │                    │
         └────────┬───────────┘
                  ↓ HTTPS
         [ Supabase Free · 你的项目 ]
         Auth + push_tokens + call_preferences
```

**部署**：`apps/api` 用 `wrangler deploy`；iOS 指向 `https://api.yourdomain.com`（Workers 自定义域名免费）。

---

# 17. 最终 Product

最后才进行业务组装：

```text
                 iOS App (SwiftUI)
                        │
        ┌───────────────┼────────────────┐
        ↓               ↓                ↓
   CallKit+Push    StoreKit          Realtime
   (PushKit)       (充值)         (临时 Token)
        │               │                │
        └───────────────┼────────────────┘
                        ↓
         Cloudflare Workers + Supabase
         (API + 计费 + Cron + Push / Auth + 额度)
                        ↓
              Phase 1+ 再叠加：
              Fly.io Voice Agent / 官方 Key 订阅
```

最终用户体验：

```text
注册
 ↓
设置学习目标
 ↓
选择 AI 学习伙伴
 ↓
设置方便时间
 ↓
进入 IM 首页
 ↓
等待 AI 主动联系
 ↓
收到 Push
 ↓
AI 来电
 ↓
接听
 ↓
实时语音交流
 ↓
结束通话
 ↓
学习反馈
 ↓
更新学习画像
 ↓
等待下一次主动联系
```

---

# 18. Monorepo 结构

不建议初期创建 12 个 Git Repository。

推荐：

```text
callie/
│
├── apps/
│   ├── ios/                    # SwiftUI 原生 iOS App
│   │   ├── Callie/
│   │   ├── CallieKit/
│   │   └── Callie.xcodeproj
│   └── api/                    # Cloudflare Workers Backend
│       ├── src/
│       │   ├── index.ts        # Hono 路由 + scheduled()
│       │   ├── scheduler.ts    # Cron：主动来电调度
│       │   ├── apns.ts         # VoIP Push → APNs
│       │   └── db.ts           # Supabase 客户端
│       ├── wrangler.toml
│       └── package.json
│
├── supabase/
│   └── migrations/             # PostgreSQL schema（push_tokens 等）
│
├── docs/                       # Obsidian vault（仅产品/工程文档，不含代码）
│   ├── .obsidian/
│   ├── prd.md
│   └── project-architecture-and-tech-stack.md
│
├── README.md
└── .gitignore
```

Phase 1+ 再添加：`apps/voice-agent/`（Python，部署 Fly.io / Hetzner）。

> **Obsidian 只打开 `docs/` 目录作为 vault**；`apps/`、`supabase/` 在仓库根目录，不纳入 Obsidian。

部署命令：`cd apps/api && npx wrangler deploy`

### wrangler.toml 要点（Phase 0）

```toml
name = "callie-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[triggers]
crons = ["*/5 * * * *"]   # 每 5 分钟跑 Scheduler

# Secrets（wrangler secret put）：
# OPENAI_API_KEY, APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# APPLE_IAP_*（StoreKit 验单，Phase 0-B）
```

iOS 生产环境 API 基址：`https://callie-api.<your-subdomain>.workers.dev` 或自定义域名。

---

# 19. 推荐开发顺序

Phase 0 优先验证 **「主动来电 + 愿意接 + 聊得下去」**，按成本从低到高排列。

## Phase 0-A — 主动来电链路（最高优先级）

```text
Cloudflare Workers（API + Cron + APNs Push）
        ↓
PushKit + CallKit（iOS 真机）
```

目标：

> **到点 → Backend 发 Push → iPhone CallKit 来电 → 用户能看到「Sarah 正在呼叫你」。**

## Phase 0-B — 接听后能实时聊（服务端 Agent + 计费）

```text
CallKit 接听 → POST /v1/calls/start
        ↓
Workers 签发 Realtime 临时 Token
        ↓
实时双向语音
        ↓
POST /v1/calls/end → 扣额度 + summary
```

目标：

> **接听 → 像打电话一样实时聊 → 按额度扣费。** API Key 仅在服务端，用户 StoreKit 充值。

## Phase 0-C — 产品闭环

```text
Onboarding + API Key 设置
        ↓
本地学习画像（SwiftData）
        ↓
简化 IM 首页 + 通话记录
        ↓
拒接/频率 反馈到 Scheduler
```

## Phase 1+ — 体验升级（有预算后）

```text
Agora / LiveKit + Python Voice Agent
        ↓
官方 AI Key + StoreKit 订阅
        ↓
pgvector Memory / 完整 Learning Engine
```

---

# 20. 技术风险排序

```text
Voice Agent      ██████████
CallKit+PushKit  █████████   ← iOS 原生优势，但仍需验证
RTC (iOS SDK)    ████████
Conversation     ███████
Memory           ██████
Learning         ██████
Proactive        █████
IM               █████
Backend          ███
Auth             ██
App Shell        ██
```

因此不应该先花大量时间做 UI、登录页、课程列表，而应该尽早证明：

> **iOS 上 AI 实时语音对话 + 系统级来电体验是否真的好用。**

---

# 21. 核心架构原则

## 原则 1：先能力，后业务

先验证：

> RTC 能不能稳定通话？

再验证：

> AI 能不能实时交流？

再验证：

> AI 能不能进行有效语言教学？

最后才组装成主动式外语学习 App。

## 原则 2：Voice Agent 与 Conversation Engine 分离

Voice Agent：

> **怎么听、怎么说。**

Conversation Engine：

> **为什么说、应该说什么。**

这样更换 STT、LLM、TTS、RTC 时，不会影响核心对话逻辑。

## 原则 3：学习系统与对话系统分离

Conversation Engine 负责：

> 让聊天自然。

Learning Engine 负责：

> 让聊天产生学习价值。

不要为了纠错破坏自然交流。

## 原则 4：主动性是核心业务能力

Proactive Engine 最终应该成为：

> **AI 学习调度器。**

负责判断：

- 什么时候联系
- 联系哪个 AI
- 聊什么
- 聊多久
- 难度多少
- 是否需要复习
- 是否应该减少打扰

## 原则 5：不要过早微服务化

初期：

```text
Monorepo
+
Modular Architecture
```

优先于：

```text
12 Microservices
+
12 Repositories
```

只有出现独立扩容、独立部署、团队边界、稳定服务契约或明确性能瓶颈时，再考虑服务拆分。

## 原则 6：iOS 原生优先，不为跨平台牺牲核心体验

- MVP 只做 iOS，使用 SwiftUI 原生开发
- 来电（CallKit + PushKit）和语音必须原生实现
- Android 等其他平台在 iOS 核心闭环验证后再评估

## 原则 7：预算有限时，保卖点、砍成本

- **必须保留**：PushKit + CallKit + Scheduler + 服务端 AI + 计费
- **API Key**：仅存 Workers Secrets，**永不下发客户端**
- **用户付费**：StoreKit 充值通话额度；内测可赠免费分钟
- **AI 成本**：平台先垫付，通过充值回收；设单用户日上限防刷
- **Backend**：Cloudflare Workers + Supabase Postgres
- **禁止**：客户端 BYOK（已废弃）

---

# 22. MVP 最终目标

Phase 0 不需要完整语言学习平台，只需证明：

```text
AI 主动联系（CallKit 来电）     ← 卖点，必须成立
      ↓
用户愿意接
      ↓
接听后实时语音聊（服务端 Realtime Agent）  ← 像电话，必须成立
      ↓
用户愿意为通话充值 / 续费
      ↓
有学习反馈
      ↓
用户愿意接下一次
```

开发者 Phase 0：**~$8/月固定** + **AI API 浮动**（靠用户充值覆盖；内测严格控制免费额度）。

如果这个闭环成立，再逐步投入：RTC → 官方 AI Key → 订阅 → 完整 Learning Engine。

---

# 23. 最重要的一句话

整个项目应该始终围绕一个核心问题：

> **用户为什么愿意接 AI 的下一次“来电”？**

RTC、LLM、STT、TTS、IM、Memory 都是实现这个目标的技术积木。

真正的产品核心不是：

> “我们做了一个 AI 英语学习 App。”

而是：

> **“这是一个会记得你、了解你，并且会主动来找你聊天的 AI 语言伙伴。”**
