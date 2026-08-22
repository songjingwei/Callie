# AI 主动式外语学习 App PRD

## 1. 产品概述

### 1.1 产品定位

本产品是一款**主动式 AI 外语学习 App**。

与传统外语学习产品"用户主动打开 App → 选择课程 →
开始学习"不同，本产品的核心理念是：

> **不是让用户记得学习，而是让学习主动来找用户。**

App 内拥有类似即时通讯软件的 AI 学习伙伴。AI
可以在合适的时间主动向用户发起 App
内语音通话，邀请用户进行自然语言交流。

产品不是传统意义上的"课程型学习 App"，而更接近：

> **AI 语言伙伴 + 主动式学习系统 + IM/语音通讯产品**

### 1.2 核心体验

用户注册并完成语言水平、学习目标、兴趣、可联系时间等设置后：

1.  系统建立用户学习画像。
2.  AI 根据用户的学习计划和历史表现决定合适的学习时机。
3.  AI 主动向用户发起 App 内语音通话。
4.  用户看到类似微信的"AI 正在呼叫你"界面。
5.  用户接听后，与 AI 进行实时语音交流。
6.  AI 在交流过程中根据场景自然引导对话。
7.  通话结束后生成学习反馈。
8.  用户的学习画像和错误记录被更新。
9.  AI 根据新的学习数据决定下一次沟通内容和时间。

形成：

**主动触达 → 语音交流 → 学习分析 → 用户画像更新 → 下一次主动触达**

的持续学习闭环。

### 1.3 平台与技术路线

MVP 采用 **iOS 原生（SwiftUI）**；**AI 由 Callie 服务端提供**；用户通过 **StoreKit 充值通话额度** 使用，无需自行配置 API Key。

| 决策 | Phase 0（当前） | Phase 1+（有收入后） |
|---|---|---|
| 首发平台 | iOS only | 同左 |
| 客户端 | SwiftUI 原生 | 同左 |
| 来电体验 | CallKit + PushKit | 同左 |
| Backend | **Cloudflare Workers**（API + Cron + Push + **计费**） | + Fly.io Voice Agent |
| AI 能力 | **服务端 Agent**（Realtime 临时 Token） | 完整 Python Voice Agent |
| 用户付费 | **StoreKit 充值 → 通话额度** | + 订阅包（月含 N 分钟） |
| 语音对话 | 实时双工（OpenAI Realtime，平台 Key） | Agora + 自托管 Agent（可选） |
| 数据库 | Supabase PostgreSQL | 扩容 |
| Android | 不做 | 再评估 |

理由：

- **用户不填 API Key**：信任成本低，适合大众用户
- **平台代持 Key**：仅存 Workers Secrets，下发短时效临时 Token
- **充值模式**：AI 成本由用户付费覆盖，可持续商业化
- **Backend**：Cloudflare Workers + Supabase；固定成本约 **$99/年**（Apple）+ **$0/月** 基础设施

> **不为 Android 牺牲 iOS 来电体验。**

详细工程拆分见 [project-architecture-and-tech-stack.md](./project-architecture-and-tech-stack.md)。

------------------------------------------------------------------------

# 2. 产品目标

## 2.1 核心目标

降低用户开始学习的心理和操作成本，让用户无需主动打开学习
App，也能够持续进行外语练习。

### 核心指标

第一阶段重点关注：

-   用户接听 AI 来电的比例
-   AI 通话完成率
-   单次通话平均时长
-   用户每周参与通话次数
-   7 日留存
-   30 日留存
-   用户主动关闭/拒绝 AI 来电的比例
-   用户语言能力提升情况
-   用户对 AI 学习伙伴的长期使用意愿

## 2.2 非目标

MVP 阶段暂不追求：

-   完整的传统语言课程体系
-   大规模单词背诵系统
-   专业考试题库
-   真人教师服务
-   用户与用户之间的社交
-   传统手机号电话
-   复杂的社区体系

------------------------------------------------------------------------

# 3. 产品核心理念

## 3.1 从"学习工具"转变为"学习伙伴"

传统产品：

> 用户想学习 → 打开 App → 学习

本产品：

> AI 想和用户练习 → 主动联系用户 → 用户接听 → 自然交流

AI 不应该表现得像一个不断布置作业的老师，而应该更像一个：

-   语言伙伴
-   外国朋友
-   AI 同事
-   AI 教练
-   场景角色

## 3.2 通话优先保证"交流感"

AI 不应该在用户每犯一个错误时立即打断并纠正。

例如用户说：

> I go to Japan last year.

AI 不应立即打断：

> ❌ You should say "I went to Japan last year."

而应该继续自然交流：

> Oh, you went to Japan last year? That's interesting. Where did you go?

通话结束后再反馈：

> 本次交流发现一个过去时错误：
>
> go → went

核心原则：

> **通话过程中优先保证自然交流，通话结束后完成教学反馈。**

------------------------------------------------------------------------

# 4. 用户角色

## 4.1 学习者

核心用户。

主要行为：

-   注册
-   设置学习目标
-   设置语言水平
-   设置可联系时间
-   接听 AI 通话
-   与 AI 进行语音交流
-   查看通话记录
-   查看学习反馈
-   管理 AI 学习伙伴
-   调整学习频率

## 4.2 AI 学习伙伴

AI 不是传统意义上的系统功能，而是产品中的核心"角色"。

每个 AI 伙伴具有：

-   名称
-   头像
-   性格
-   声音
-   母语/口音
-   语言水平
-   擅长场景
-   对话风格
-   学习目标
-   用户长期记忆

------------------------------------------------------------------------

# 5. MVP 产品范围

MVP 只验证一个核心假设：

> **用户是否愿意接受一个主动联系自己的
> AI，并通过语音持续进行外语交流。**

MVP 包含：

1.  用户注册/登录
2.  用户学习档案
3.  AI 学习伙伴
4.  IM 首页
5.  AI 主动来电
6.  App 内实时语音通话
7.  AI 实时语音对话
8.  通话记录
9.  通话后的学习反馈
10. 用户学习画像
11. AI 主动联系策略
12. Push 通知（VoIP Push + CallKit）
13. **账户余额与 StoreKit 充值**

**平台范围：仅 iOS。**

**Phase 0 商业模式：**

| 层 | 说明 |
|---|---|
| AI | Callie 服务端提供（OpenAI Realtime，平台 Key） |
| 付费 | StoreKit 购买通话额度；内测可赠免费分钟 |
| 计费 | 按通话时长 / token 扣减 `user_wallets` 余额 |
| 基础设施 | Cloudflare Workers + Supabase，约 $0/月 |

Android 等其他平台不在 MVP 范围内。

------------------------------------------------------------------------

# 6. 信息架构

``` text
App
├── 消息
│   ├── AI 学习伙伴
│   ├── 系统消息
│   └── 通话记录
│
├── 学习
│   ├── 今日学习
│   ├── 学习数据
│   ├── 常见错误
│   └── 学习历史
│
├── AI 伙伴
│   ├── 伙伴列表
│   ├── 伙伴详情
│   └── 伙伴设置
│
└── 我的
    ├── 学习目标
    ├── 语言水平
    ├── 通话时间
    ├── 通话频率
    ├── 通知设置
    └── 账户设置
```

------------------------------------------------------------------------

# 7. 核心页面

## 7.1 消息首页

产品首页应尽量接近 IM 产品，而不是传统学习 App。

示例：

``` text
消息

Sarah
Hey! Are you free for a quick chat?
                    2 min ago

Alex
Let's practice your job interview.
                    Yesterday

Emma
How was your weekend?
                    Yesterday
```

每个 AI 伙伴都是一个类似微信好友的会话。

展示：

-   AI 头像
-   AI 名称
-   最近一条消息
-   最近通话时间
-   未读状态
-   在线/可通话状态

------------------------------------------------------------------------

# 8. AI 学习伙伴

## 8.1 伙伴模型

每个 AI 伙伴拥有独立人格。

示例：

### Sarah

定位：

-   美国英语
-   日常交流
-   轻松、活泼
-   适合初中级用户

### Alex

定位：

-   美国英语
-   商务交流
-   稳重、专业
-   适合职场用户

### Emma

定位：

-   英国英语
-   生活交流
-   温柔、耐心
-   适合日常练习

## 8.2 AI 伙伴的核心属性

``` text
AI Partner
├── identity
│   ├── name
│   ├── avatar
│   └── persona
│
├── voice
│   ├── voice_id
│   ├── gender
│   ├── accent
│   └── speaking_style
│
├── language
│   ├── target_language
│   ├── native_language
│   └── difficulty
│
└── teaching
    ├── teaching_style
    ├── correction_style
    └── supported_scenarios
```

------------------------------------------------------------------------

# 9. 主动来电

这是整个产品最核心的功能。

## 9.1 来电触发

系统根据以下信息决定是否主动联系用户：

-   用户设置的时间
-   用户最近学习时间
-   用户最近通话时间
-   当前学习目标
-   连续学习情况
-   最近学习内容
-   最近错误
-   用户兴趣
-   用户当前学习阶段
-   最近拒接次数
-   用户主动结束通话的情况

## 9.2 主动联系策略

示例：

``` text
用户：
英语 B1
目标：
提高日常口语
兴趣：
旅行、游戏、科技

最近学习：
Travel

最近错误：
过去时

今天：
19:30

AI 决策：

联系用户
↓
选择 Sarah
↓
主题：最近一次旅行
↓
目标：自然练习过去时
↓
预计时长：5~10 分钟
```

## 9.3 来电界面

Backend 通过 **PushKit VoIP Push** 唤醒 iPhone，**CallKit** 展示系统级来电界面。

用户即使在锁屏或 App 未打开时，也会看到类似系统电话的来电 UI：

``` text
┌─────────────────────────┐
│                         │
│      [Sarah 头像]        │
│                         │
│       Sarah             │
│    正在呼叫你...         │
│                         │
│  [拒接]        [接听]    │
│                         │
└─────────────────────────┘
```

- **接听** → App 进入 RTC 语音通话页，与 AI 实时交流
- **拒接 / 稍后再说** → 上报 Backend，影响后续联系频率

MVP 不使用传统手机号电话（PSTN）。

采用：

> **PushKit VoIP Push + CallKit + App 内 RTC 语音通话**

这是 iOS 原生路线的核心差异化能力。

------------------------------------------------------------------------

# 10. 实时语音通话

## 10.1 核心体验

通话页面：

``` text
        Sarah

     🔊 正在说话...

       00:04:32

[ 静音 ] [ 扬声器 ]

       [ 挂断 ]
```

可以进一步加入：

-   AI 当前状态
-   用户当前状态
-   音量动画
-   实时字幕
-   网络状态
-   通话计时

## 10.2 技术要求

### 实时双工（必须）

接听后必须 **像打电话一样实时对话**。

**Phase 0：服务端 Agent + OpenAI Realtime 临时 Token**

```text
CallKit 接听
   ↓
POST /v1/calls/start（校验余额）
   ↓
Workers 用平台 Key 签发 Realtime ephemeral token
   ↓
iOS WebRTC 连接（客户端无 API Key）
   ↓
POST /v1/calls/end → 扣减通话额度
```

- API Key **仅存服务端**（Workers Secrets）
- 用户通过 **StoreKit 充值** 获得通话额度
- 支持打断（barge-in），体验接近真电话

### Phase 1+（可选）

- Fly.io Python Voice Agent + Agora
- 订阅包（每月含 N 分钟）+ 超额按量

> **CallKit 来电 + 服务端 Realtime Agent + 额度计费，构成完整商业闭环。**

------------------------------------------------------------------------

# 11. AI Voice Agent

AI Voice Agent 是整个产品的核心技术模块。

``` text
用户语音
    ↓
RTC
    ↓
Speech-to-Text
    ↓
Conversation Engine
    ↓
LLM
    ↓
Text-to-Speech
    ↓
RTC
    ↓
用户
```

## 11.1 AI Agent 需要理解

-   当前对话主题
-   用户语言水平
-   用户历史错误
-   用户兴趣
-   用户长期记忆
-   当前学习目标
-   当前对话状态
-   是否应该纠正用户
-   是否应该改变话题
-   是否应该结束通话

## 11.2 对话状态

``` text
START
 ↓
GREETING
 ↓
WARM_UP
 ↓
MAIN_CONVERSATION
 ↓
FOLLOW_UP
 ↓
REVIEW
 ↓
GOODBYE
 ↓
END
```

MVP 可以暂时隐藏 REVIEW，让 AI 在结束时只进行简单鼓励。

------------------------------------------------------------------------

# 12. 学习画像

系统需要持续维护用户学习画像。

``` text
User Learning Profile
├── language
│   ├── target_language
│   ├── level
│   └── goals
│
├── preferences
│   ├── interests
│   ├── preferred_topics
│   └── preferred_call_time
│
├── performance
│   ├── fluency
│   ├── vocabulary
│   ├── grammar
│   ├── pronunciation
│   └── comprehension
│
├── mistakes
│   ├── grammar_errors
│   ├── vocabulary_errors
│   └── pronunciation_errors
│
└── memory
    ├── personal_facts
    ├── recent_events
    ├── interests
    └── conversation_history
```

------------------------------------------------------------------------

# 13. 通话结束后的学习反馈

通话结束后生成总结。

示例：

``` text
本次通话
8 分 32 秒

表现很好 👍

你今天聊了：
• Weekend
• Travel
• Food

新表达：
• I'm planning to...
• It turns out that...
• By the way...

需要注意：

❌ I go to Japan last year.

✓ I went to Japan last year.

今日表现：

流利度     ████████░░
词汇       ███████░░░
语法       ██████░░░░
```

注意：

**不要让学习反馈过度复杂。**

MVP 首先验证用户是否愿意持续通话，而不是建立完整语言评测系统。

------------------------------------------------------------------------

# 14. 通话历史

用户可以查看：

``` text
Sarah
今天 19:30
8 分 32 秒

主题：
Travel

学习内容：
• past tense
• travel vocabulary

错误：
2 个

新表达：
3 个
```

支持：

-   通话时间
-   通话时长
-   对话主题
-   学习反馈
-   错误记录
-   新词/表达
-   AI 总结

MVP 可暂不保存完整录音，是否保存录音需要结合隐私和用户授权进一步设计。

------------------------------------------------------------------------

# 15. 主动学习调度系统

这是产品长期的核心能力。Phase 0 由 **Cloudflare Workers Cron** 实现简化版调度；Phase 1+ 再引入 LLM 辅助决策。

## 15.1 Scheduler

Phase 0 运行在 Cloudflare Workers（`scheduled()` handler，每 1～5 分钟触发）：

``` text
Workers Cron（Scheduler）
    ↓
HTTPS 读 Supabase：符合条件的用户
    ↓
检查用户是否处于可联系时间
    ↓
检查今日联系次数
    ↓
检查最近是否拒接
    ↓
（Phase 0 简化：固定 AI 伙伴 Sarah，规则选 topic）
    ↓
Workers 调 APNs 发 VoIP Push
    ↓
等待用户接听
```

Phase 1+ 再补：LLM 生成 Conversation Plan、多 AI 伙伴选择。

## 15.2 Conversation Plan

AI 在正式通话之前生成：

``` text
Conversation Plan
├── partner
├── topic
├── difficulty
├── target_duration
├── learning_objectives
├── vocabulary_targets
├── grammar_targets
├── user_context
└── opening_message
```

例如：

``` text
partner: Sarah

topic:
Weekend travel

difficulty:
B1

target_duration:
8 min

learning_objectives:
practice past tense

user_context:
User visited Seoul recently.

opening:
"Hey! I remember you went to Seoul recently.
How was your trip?"
```

------------------------------------------------------------------------

# 16. Push Notification

由于 AI 是主动联系用户，Push 是核心能力。

## 16.1 Push 类型

### AI 来电（VoIP Push — MVP 必须）

Backend（**Cloudflare Workers**）向 APNs 发送 VoIP Push，iOS **PushKit** 接收，**CallKit** 展示系统来电界面：

> Sarah 正在呼叫你...

特点：高优先级、可唤醒 App（含后台 / 被杀状态）、展示 CallKit 来电 UI。

### 学习提醒（普通 Push）

> 今天还没有和 Sarah 聊过，你有空吗？

### 通话结束（普通 Push）

> Sarah 已经整理好了今天的学习反馈。

### 连续学习（普通 Push）

> 你已经连续 7 天和 Sarah 聊天了。

MVP 优先实现：

> **VoIP Push + CallKit 来电**

普通 Push 作为次要能力，可在 Phase 2 之后补充。

------------------------------------------------------------------------

# 17. IM 能力

虽然产品采用 IM 形式，但 MVP 不需要完整复刻微信。

## MVP 支持

-   AI 会话列表
-   AI 会话详情
-   AI 文字消息
-   AI 语音通话
-   通话记录
-   未读状态
-   Push

## 暂不支持

-   用户之间聊天
-   群聊
-   文件
-   图片
-   视频通话
-   朋友圈
-   社交关系

核心原则：

> **IM 是产品交互载体，而不是产品最终目的。**

------------------------------------------------------------------------

# 18. 用户首次 onboarding

用户第一次打开 App：

### Step 1：选择学习语言

``` text
你想学习什么？

English
Japanese
Korean
Spanish
...
```

### Step 2：选择当前水平

``` text
你的英语水平？

完全不会
初级
初中级
中级
中高级
高级
不知道
```

### Step 3：选择学习目标

``` text
为什么学习？

日常交流
旅行
工作
考试
留学
兴趣
```

### Step 4：选择兴趣

``` text
旅行
游戏
电影
科技
音乐
运动
美食
...
```

### Step 5：选择 AI 联系时间

``` text
什么时候方便聊天？

早上
午休
晚上
自定义
```

### Step 6：选择每日频率

``` text
每天希望 AI 联系你几次？

1 次
2 次
3 次
```

最终：

> Sarah 将在你方便的时候主动联系你。

------------------------------------------------------------------------

# 19. 用户设置

用户可以修改：

-   学习语言
-   学习水平
-   学习目标
-   兴趣
-   AI 伙伴
-   AI 伙伴声音
-   联系时间
-   每日通话次数
-   单次通话时长
-   是否允许主动来电
-   Push 通知
-   通话时是否显示字幕
-   **账户余额与充值（StoreKit）**

------------------------------------------------------------------------

# 20. 核心数据模型

MVP 核心表（存 **Supabase PostgreSQL**；Workers 经 service role HTTPS 读写）。

> **Phase 0 最小必需表：** `push_tokens`、`call_preferences`、`call_events`（或等效日志）。  
> 下列其余表可在 Phase 0 简化或仅存 SwiftData 本地。

``` text
users
├── id
├── created_at
└── ...

user_learning_profiles
├── user_id
├── target_language
├── level
├── goals
├── interests
└── ...

ai_partners
├── id
├── name
├── persona
├── voice_id
├── language
└── ...

user_ai_partners
├── user_id
├── ai_partner_id
└── ...

conversations
├── id
├── user_id
├── ai_partner_id
├── topic
├── status
├── started_at
├── ended_at
└── duration

conversation_messages
├── id
├── conversation_id
├── role
├── content
├── audio_url
├── timestamp
└── ...

learning_feedback
├── conversation_id
├── fluency_score
├── vocabulary_score
├── grammar_score
├── pronunciation_score
├── summary
└── ...

learning_mistakes
├── id
├── user_id
├── conversation_id
├── type
├── original
├── correction
└── ...

user_memory
├── id
├── user_id
├── type
├── content
├── importance
└── ...

call_schedules
├── id
├── user_id
├── scheduled_at
├── status
└── ...

-- Phase 0 补充（主动来电必需）
push_tokens
├── id
├── user_id
├── voip_token          -- PushKit 设备 Token
├── environment         -- sandbox | production
└── updated_at

call_preferences
├── user_id
├── allowed_hours       -- 可联系时段
├── daily_frequency     -- 每日次数上限
├── allow_proactive     -- 是否允许主动来电
└── timezone

call_sessions          -- Phase 1+（RTC 房间）；Phase 0 可省略
├── id
├── conversation_id
├── rtc_room_id
├── status
└── ...
```

**不在 Supabase 存：** 用户 API Key（平台 Key 仅在 Workers Secrets）。

**Phase 0 计费相关表（必需）：**

``` text
user_wallets
├── user_id
├── balance_seconds       -- 或 balance_credits
├── updated_at
└── ...

credit_transactions
├── id
├── user_id
├── type                  -- purchase | usage | grant | refund
├── amount
├── reference_id          -- call_id / apple_transaction_id
└── created_at

usage_logs
├── id
├── user_id
├── call_id
├── duration_seconds
├── model
├── estimated_cost_usd    -- 内部成本核算
└── created_at
```

------------------------------------------------------------------------

# 20.1 Backend API（Cloudflare Workers）

Phase 0 自建 API 路由（`apps/api`，TypeScript + Hono）：

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/v1/push-tokens` | 注册 / 更新 VoIP Token |
| DELETE | `/v1/push-tokens` | 注销 VoIP Token |
| GET/PATCH | `/v1/call-preferences` | 联系偏好 |
| POST | `/v1/calls/start` | 校验余额，签发 Realtime 临时 Token |
| POST | `/v1/calls/end` | 结束通话，扣费，触发 summary |
| GET | `/v1/wallet` | 查询剩余通话额度 |
| POST | `/v1/billing/apple/verify` | StoreKit 2 验单，增加额度 |
| POST | `/v1/call-events` | 拒接 / 未接（Scheduler 参考） |
| — | `scheduled()` Cron | 主动来电 + VoIP Push |

鉴权：iOS 带 Supabase JWT；Workers 验证后操作对应用户数据。

Secrets（Workers）：`OPENAI_API_KEY`、`APNS_*`、`SUPABASE_*`、`APPLE_IAP_*`（验单）。

------------------------------------------------------------------------

# 20.2 商业化与充值（MVP）

## 付费方式

Phase 0：**StoreKit 消耗型 IAP（通话额度包）**

``` text
示例 SKU：
• 30 分钟额度包
• 120 分钟额度包
• （内测）新用户注册赠送 10 分钟
```

Phase 1+：可选 **自动续订订阅**（每月含 N 分钟，超额另计）。

## 计费规则（示例，可调）

| 项 | 规则 |
|---|---|
| 扣费时机 | 通话结束 `/v1/calls/end` |
| 扣费单位 | 按实际通话秒数，向上取整到 30 秒 |
| 余额不足 | `/v1/calls/start` 返回 402，iOS 引导充值 |
| 成本保护 | 单用户日上限、单通电话最长 30 分钟（可配置） |

## 用户可见

- 「我的」页展示剩余通话时间
- 余额不足时来电仍可响，接听前提示充值
- 隐私政策：通话经 Callie 服务器连接 AI，**不收集用户 API Key**

------------------------------------------------------------------------

# 21. 系统架构

``` text
              iOS App (SwiftUI)
                        │
          ┌─────────────┴─────────────┐
          │                           │
   supabase-swift              PushKit VoIP
   (Auth)                            │
          │                      CallKit 来电 UI
          ↓                           │
   Supabase Free              Cloudflare Workers
   (PostgreSQL)               (API + 计费 + Cron + Push)
          │                           │
          └───────────┬───────────────┘
                      ↓
              POST /v1/calls/start
              → Realtime 临时 Token
                      ↓
              实时双工语音（平台 Agent）
                      ↓
              POST /v1/calls/end → 扣额度
                      ↓
              SwiftData + Supabase（反馈/记录）
```

Phase 1+：Fly.io Voice Agent、订阅包、pgvector Memory。

------------------------------------------------------------------------

# 22. Supabase 与 Cloudflare 分工

**Supabase** 负责 Auth + PostgreSQL；**Cloudflare Workers** 负责你的 Backend API、Scheduler、VoIP Push。

Supabase 使用：

-   PostgreSQL：用户、push_tokens、call_preferences、通话日志
-   Auth：用户认证（iOS supabase-swift）
-   RLS：行级安全

Supabase Phase 0 **不用**：

-   Edge Functions（改由 Cloudflare Workers）
-   pg_cron（改由 Workers Cron）
-   Realtime / Storage（Phase 0 暂不需要）

Cloudflare Workers 负责：

-   REST API（token 注册、偏好、通话事件）
-   Cron Scheduler（主动来电调度）
-   VoIP Push → APNs HTTP/2

但是：

> **不要把实时语音建立在 Workers 长连接上。** Workers 只负责签发 Token 与计费；音频 WebRTC 在 iOS ↔ OpenAI 之间。

Supabase Realtime（Phase 1+ IM）适合：

-   IM 消息状态同步
-   Presence
-   数据库变化通知

不适合：

-   VoIP Push / CallKit 调度（用 Cloudflare Workers）
-   实时语音流（用 OpenAI Realtime / Agora）

------------------------------------------------------------------------

# 23. AI Agent 架构

AI Agent 不应该只是一个简单的：

``` text
用户语音 → LLM → AI 语音
```

而应该逐渐发展成：

``` text
User Profile
      +
Learning Profile
      +
Conversation Memory
      +
Recent Mistakes
      +
Conversation Plan
      ↓
Conversation Agent
      ↓
实时对话
      ↓
Learning Analyzer
      ↓
Profile Update
```

其中：

### Conversation Agent

负责：

-   理解用户
-   维持对话
-   控制话题
-   适应语言水平
-   控制难度
-   保持自然交流

### Learning Analyzer

负责：

-   识别语言错误
-   分析流利度
-   识别新词
-   分析语法
-   生成学习反馈
-   更新用户学习画像

两个 Agent 在职责上应该尽量分离。

------------------------------------------------------------------------

# 24. 关键产品原则

## 原则 1：不要像上课

用户不应该感觉：

> "又要学习了。"

而应该感觉：

> "Sarah 来找我聊天了。"

## 原则 2：主动，但不能打扰

AI 主动联系必须尊重用户。

需要：

-   可设置时间
-   可设置频率
-   可拒绝
-   可暂停
-   连续拒绝后降低联系频率

## 原则 3：交流优先

不要为了教学目标牺牲自然对话。

## 原则 4：长期关系优先

AI 应该记得用户：

-   最近发生了什么
-   喜欢什么
-   之前聊过什么
-   最近犯过什么错误
-   最近学习了什么

让用户产生：

> "它真的认识我。"

## 原则 5：学习应该隐藏在交流中

用户表面上是在聊天，实际上完成：

-   听力
-   口语
-   词汇
-   语法
-   表达
-   反应速度

------------------------------------------------------------------------

# 25. MVP 用户核心流程

``` text
注册
 ↓
选择语言
 ↓
选择水平
 ↓
选择目标
 ↓
选择兴趣
 ↓
设置方便通话时间
 ↓
选择 AI Partner
 ↓
进入消息首页
 ↓
等待 AI 主动联系
 ↓
Push
 ↓
AI 来电
 ↓
用户接听
 ↓
实时语音交流
 ↓
结束通话
 ↓
学习反馈
 ↓
更新学习画像
 ↓
等待下一次 AI 联系
```

------------------------------------------------------------------------

# 26. MVP 验证假设

MVP 最重要的不是功能数量，而是验证以下问题。

### 假设 A

用户是否愿意接受 AI 主动发起语音通话？

### 假设 B

用户是否愿意在没有明确学习任务的情况下持续与 AI 聊天？

### 假设 C

AI 主动联系是否能够提高用户留存？

### 假设 D

用户是否会逐渐把 AI 当作自己的语言伙伴？

### 假设 E

用户是否认为这种方式比传统学习 App 更轻松？

------------------------------------------------------------------------

# 27. MVP 暂不解决的问题

以下功能可以放到后续版本：

-   Android 客户端
-   AI 视频形象
-   AI 情感关系系统
-   多 AI 伙伴
-   用户之间社交
-   社区
-   排行榜
-   游戏化
-   完整课程
-   单词系统
-   专业发音评分
-   IELTS/TOEFL 等考试体系
-   真人老师
-   真正手机号电话
-   国际 PSTN 电话
-   多人语音房间

------------------------------------------------------------------------

# 28. 后续产品演进

## V1：AI 主动语音伙伴

核心：

> AI 主动找你聊天。

## V2：AI 学习教练

AI 开始根据学习数据制定：

-   学习计划
-   复习计划
-   错误复习
-   主题安排

## V3：AI 社交世界

用户可以拥有多个 AI：

``` text
Sarah
英语朋友

Alex
职场同事

Emma
旅行伙伴

Mike
面试官
```

不同 AI 承担不同语言场景。

## V4：主动式 AI 学习操作系统

最终产品不再是一个"英语学习 App"，而是：

> **一个会主动管理用户语言学习过程的 AI Agent。**

AI 自己决定：

-   今天什么时候联系
-   联系哪个 AI
-   聊什么
-   使用什么难度
-   复习什么
-   是否需要增加训练
-   是否应该减少打扰

用户只需要：

> **接听。**

------------------------------------------------------------------------

# 29. 产品一句话定义

> **一个会主动来找你聊天的 AI 外语学习伙伴。**

或者更强调产品理念：

> **Don't open an app to learn. Let learning come to you.**

------------------------------------------------------------------------

# 30. MVP 最核心的产品闭环

``` text
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
        学习反馈 + 错误
              │
              ↓
       更新用户学习画像
              │
              └──────────────→
                       下一次主动联系
```

**这个闭环是整个产品的核心。**

如果这个闭环成立，后面的课程、单词、游戏化、社区等功能都只是扩展；如果这个闭环不成立，再增加大量学习功能也很难形成真正的产品差异化。
