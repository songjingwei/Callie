# Callie Design Specification

> 版本 v1.1 · 2026-08-23  
> HTML 原型：`../design/` · 关联 [prd.md](./prd.md) · [architecture.md](./architecture.md)

本文档供 **iOS / Coding Agent** 实现 UI 时使用。视觉与交互的 HTML 可交互原型见 `design/index.html`（浏览器直接打开）。

---

## 1. 设计定位

### 1.1 产品气质 — Warm Companion

| 维度 | 要 | 不要 |
|------|----|------|
| 整体感受 | 像 **微信 + 电话**，温暖、有人味 | 传统课表型学习 App |
| 色彩 | 暖中性底 + 渐变层次 + 珊瑚品牌色 | 整页纯白、冷紫 AI 风 |
| 信息密度 | IM 列表清晰、卡片有阴影与分区 | 仪表盘堆满图表 |
| 通话 | 深色沉浸、大头像、波形 | 聊天窗口里小语音条 |

### 1.2 设计原则

1. **IM First**：默认着陆页是「消息」，不是课程列表。  
2. **WeChat Patterns**：右上角「+」添加伙伴；会话行 **点头像 → 伙伴资料**，点正文 → 聊天。  
3. **Moments for Learning**：第三 Tab 为「朋友圈」—— AI 伙伴发布语言学习动态，非用户社交。  
4. **Call is Hero**：来电与通话全屏；CallKit 为系统 UI。  
5. **Light + Dark**：跟随系统 `ColorScheme`，所有 Tab 页必须双主题可用。  
6. **Visual Depth**：页面用 `--color-bg-gradient` 底 + 卡片 `--shadow-card`，避免「全白平板感」。

---

## 2. 设计 Token（SwiftUI 映射）

实现路径：`CallieKit/Design/DesignTokens.swift`  
CSS 源文件：`design/css/tokens.css`（v1.1）

### 2.1 色彩 — Light

| Token | Hex | SwiftUI | 用途 |
|-------|-----|---------|------|
| `brand` | `#D94432` | `Color.callieBrand` | CTA、Tab 选中、出站气泡 |
| `brandSoft` | `#FDEBE8` | `Color.callieBrandSoft` | 选中卡片、accent stat |
| `bg` | `#F7F5F2` | `Color.callieBackground` | 兜底背景 |
| `bgGradient` | 165° `#FAF8F5→#EBE6DE` | `LinearGradient.calliePageBackground` | **页面主背景** |
| `bgElevated` | `#FFFFFF` | `Color.callieSurface` | 卡片、列表面板 |
| `textPrimary` | `#1A1816` | — | 标题、正文 |
| `textSecondary` | `#6B6560` | — | 副文案 |
| `textTertiary` | `#9C9690` | — | 时间戳 |

### 2.2 色彩 — Dark（Warm Dark，非纯黑）

| Token | Hex | 说明 |
|-------|-----|------|
| `bg` | `#252322` | 暖灰褐底，**不用 #000** |
| `bgElevated` | `#32302E` | 卡片表面 |
| `bgMuted` | `#3D3B38` | 次级块、secondary 按钮 |
| `textPrimary` | `#F7F5F2` | 标题、正文 |
| `textSecondary` | `#C8C2BC` | 副文案（≥4.5:1 对比） |
| `brand` | `#F07568` | 略提亮 |

**HTML 原型注意**：`.device` 必须设置 `color: var(--color-text-primary)`，否则文字会继承 hub 页的深色字，导致 Dark 背景下看不清。

**SwiftUI**：使用 `Color(.systemBackground)` / 自定义 warm dark，避免 `Color.black` 铺全屏。

**SwiftUI 实现**

```swift
enum CallieColorScheme {
  static func brand(_ scheme: ColorScheme) -> Color { ... }
  static func pageBackground(_ scheme: ColorScheme) -> LinearGradient { ... }
}
```

- 默认：`.preferredColorScheme(nil)` 跟随系统  
- 设置页可选：跟随系统 / 浅色 / 深色（见 Profile「外观」）  
- **HTML 原型**：Design System 索引页 (`index.html`) **始终浅色**；仅 `.device[data-theme]` 内预览 Dark/Light，用页面右上角或索引页切换器，**不受 macOS 系统主题影响**

### 2.3 伙伴色

| Partner | Hex | Soft (Light / Dark) |
|---------|-----|---------------------|
| Sarah | `#E85D4C` | `#FDE8E5` / `#3D2520` |
| Alex | `#3D7A99` | `#E3EEF4` / `#1E2D36` |
| Emma | `#7C6BAE` | `#EDE9F5` / `#2A2538` |

### 2.4 阴影与层次

| Token | 用途 |
|-------|------|
| `shadowCard` | 会话面板、朋友圈卡片、设置组 |
| `shadowMd` | Hero strip、Wallet 卡片 |
| `page--rich` | 所有 Tab 根页面加渐变底 |

---

## 3. 组件规范

### 3.1 导航 — 四 Tab

| Tab | SF Symbol | SwiftUI View |
|-----|-----------|--------------|
| 消息 | `bubble.left.and.bubble.right` | `MessagesHomeView` |
| 学习 | `book.closed` | `LearnHomeView` |
| **朋友圈** | `circle.circle` 或 `sparkles` | `MomentsFeedView` |
| 我的 | `person.circle` | `ProfileView` |

> 原「伙伴」Tab 已改为「朋友圈」。伙伴列表入口在消息页右上角「+」。

### 3.2 消息首页

| 元素 | 规范 |
|------|------|
| 右上角 | `NavIconButton` 圆形「+」→ `AddPartnerView`（sheet） |
| Hero strip | 品牌渐变条：今日练习状态 + 快捷「去通话」 |
| 会话列表 | `ConversationPanel` 圆角卡片容器，非贴边白条 |
| 头像点击 | → `PartnerProfileView(partnerId:)` |
| 行正文点击 | → `ChatDetailView` |

```swift
struct ConversationRow: View {
  let partner: Partner
  let onAvatarTap: () -> Void
  let onRowTap: () -> Void
}
```

### 3.3 AddPartnerView

- 顶栏：取消 + 标题「添加 AI 伙伴」  
- `SearchBar`：按名称 / 场景搜索  
- `AddPartnerRow`：Avatar + 描述 + 「添加」/「已添加」  
- 场景 `ChipGroup`：全部 / 日常 / 商务 / 旅行  

Phase 0：固定 Sarah / Alex / Emma，搜索为本地过滤。

### 3.4 PartnerProfileView

- Hero：大 Avatar + 名称 + Tag + 统计（通话次数 / 时长 / 在线）  
- Grouped 属性：场景、口音、纠错风格  
- CTA：发消息、语音通话  

### 3.5 MomentsFeedView（朋友圈）

AI 伙伴发布的 Feed，**学习 + 生活** 混合。

**动态类型 `MomentKind`**

| Kind | Tag | 内容 |
|------|-----|------|
| `life` | 日常 | 符合人格的生活/旅行/感悟，英文正文 |
| `vocabulary` | 单词 | 来自通话 feedback 的应掌握词 |
| `expression` | 今日表达 | 语法/句型 |
| `scenario` | 商务口语等 | 场景化教学 |
| `pronunciation` | 发音 | 音标 + 播放 |

**生活类**：`moment-card__body--life`，可选 `moment-card__snap` 占位图（Phase 1+  AI 生图或图库）。文案遵循伙伴 persona（Sarah 活泼 emoji、Alex 简洁 professional、Emma 温柔）。

**单词类**：`VocabChip` 横排 chips，与 feedback 的 `VocabItem` 同源。

**互动栏 `MomentActionBar`**（每条动态底部，三列等宽）

| 按钮 | Asset | SF Symbol | 状态 |
|------|-------|-----------|------|
| 点赞 | inline SVG `heart` / `heart.fill` | `heart` / `heart.fill` | `--liked` 品牌色底 |
| 评论 | inline SVG 气泡 | `bubble.left` | 有评论时 label 显示数量 |
| 加入复习 | inline SVG 书本+ | `text.book.closed.fill` | `--review-added` 成功色 |

```swift
struct MomentActionBar: View {
  let moment: MomentPost
  @Binding var isLiked: Bool
  @Binding var isInReviewQueue: Bool
  let likeCount: Int
  let commentCount: Int
  var onLike: () -> Void
  var onComment: () -> Void
  var onAddReview: () -> Void
}
```

```swift
struct MomentPost: Identifiable {
  let partnerId: String
  let kind: MomentKind
  let body: String
  let phrase: MomentPhrase?
  let vocabulary: [VocabItem]?
  let snapshotCaption: String?
  let likeCount: Int
  let commentCount: Int
  let createdAt: Date
}

struct VocabItem: Identifiable {
  let word: String
  let definition: String
  let context: String?
  let priority: VocabPriority   // suggested | optional
}
```

### 3.6 CallFeedbackView — 应掌握单词

区块顺序建议：今天聊了 → **应掌握单词** → 新表达 → 需要注意 → 今日表现。

```swift
struct CallFeedback {
  let topics: [String]
  let vocabularyItems: [VocabItem]
  let newExpressions: [String]
  let corrections: [Correction]
  let scores: FeedbackScores
}
```

`VocabItem` 复用于 Moments 的 vocabulary 动态。

### 3.7 其他组件

沿用 v1.0：`Avatar`、`MessageBubble`、`WalletCard`、`CallScreen`、`PackageCard` — 见 `design/css/components.css`。  
新增：`VocabItem`、`VocabChip`、`MomentCard`（life / vocabulary / expression 变体）。

---

## 4. 信息架构与路由

```
Tab: Messages (default)
  ├─ AddPartnerView          // sheet，「+」
  ├─ PartnerProfileView      // push，点头像
  ├─ ChatDetailView          // push，点会话
  └─ CallFeedbackView        // after call

Tab: Learn
  └─ CallHistoryDetail (optional)

Tab: Moments（朋友圈）
  ├─ MomentDetail (optional Phase 1)
  └─ PartnerProfileView      // 点头像

Tab: Profile
  ├─ WalletView
  ├─ AppearanceSettings      // 外观：跟随系统 / 浅 / 深
  └─ CallPreferences
```

**Modal / FullScreenCover**

- `ActiveCallView`：fullScreenCover  
- `AddPartnerView`：sheet  
- `InsufficientBalanceSheet`：402 → Wallet  

---

## 5. Phase 0 页面清单

| # | 屏幕 | HTML | SwiftUI | 优先级 |
|---|------|------|---------|--------|
| 01 | Onboarding | `onboarding.html` | `OnboardingFlow` | P1 |
| 02 | 消息首页 | `messages.html` | `MessagesHomeView` | **P0** |
| 02b | 消息 Dark | `messages-dark.html` | （同一 View） | 参考 |
| 02c | 添加伙伴 | `add-partner.html` | `AddPartnerView` | P1 |
| 02d | 伙伴资料 | `partner-profile.html` | `PartnerProfileView` | P1 |
| 03 | 聊天详情 | `chat.html` | `ChatDetailView` | P1 |
| 04 | 来电 | CallKit + `incoming-call.html` | `CXProvider` | **P0** |
| 05 | 通话中 | `active-call.html` | `ActiveCallView` | **P0** |
| 06 | 学习反馈 | `feedback.html` | `CallFeedbackView` | P0 |
| 07 | 学习 | `learn.html` | `LearnHomeView` | P2 |
| 08 | **朋友圈** | `moments.html` | `MomentsFeedView` | P1 |
| 09 | 我的 | `profile.html` | `ProfileView` | P0 |
| 10 | 充值 | `wallet.html` | `WalletView` | P0 |

---

## 6. Dark Mode 实施要点

- [ ] `DesignTokens` 全部颜色提供 light/dark 两套  
- [ ] Tab 页根视图使用 `pageBackground` 渐变，非纯 `Color.white`  
- [ ] `ConversationPanel`、`MomentCard` 在 dark 下用 `bgElevated` + 调浅 shadow  
- [ ] Hero strip、Wallet 渐变在 dark 下可略降饱和度，保持对比  
- [ ] 测试：`UITraitCollection.userInterfaceStyle` + 设置页手动切换  

---

## 7. 交互与动效

| 场景 | 规范 |
|------|------|
| 「+」按钮 | sheet 弹出 AddPartner，系统 spring |
| 头像点击 | push PartnerProfile |
| 卡片按压 | `scaleEffect(0.98)` 可选 |
| 朋友圈短语块 | 伙伴色左边框，dark 下 soft 色加深 |

---

## 8. 无障碍

- 「+」：`accessibilityLabel = "添加 AI 伙伴"`  
- 会话行：头像与正文分为两个 accessibility 元素  
- Dark mode 对比度同样 ≥ 4.5:1  

---

## 9. Coding Agent 检查清单

- [ ] 阅读对应 `design/screens/*.html`  
- [ ] Tab 第三项为「朋友圈」，不是「伙伴」  
- [ ] 消息页有 toolbar「+」与 `ConversationPanel` 卡片列表  
- [ ] 所有 Tab 根页支持 Dark Mode  
- [ ] 页面背景用 gradient，卡片带 shadow  

建议目录：

```
apps/ios/CallieKit/
├── Design/
│   ├── DesignTokens.swift      // light + dark
│   └── ButtonStyles.swift
├── Components/
│   ├── ConversationPanel.swift
│   ├── NavIconButton.swift
│   ├── MomentCard.swift
│   ├── HeroStrip.swift
│   └── ...
└── Features/
    ├── Messages/
    ├── Moments/                 // 原 Partners 目录改名
    ├── Learn/
    └── Profile/
```

---

## 10. 视觉素材 Assets

目录：`design/assets/` · 清单见 [assets/README.md](../design/assets/README.md)

### 10.1 图标（inline SVG）

- **无独立 `assets/icons/` 文件**；图标内联在各 `screens/*.html`，`stroke="currentColor"` · `stroke-width="2"`
- Tab / 导航 / 通话 / 朋友圈互动 — 以 `messages.html` · `moments.html` 设计稿为准
- iOS：**优先 SF Symbols**，不必导出 SVG

### 10.2 伙伴头像

| Asset | Phase 0 | Phase 1+ |
|-------|---------|----------|
| `avatar-{partner}.png` | 3D 角色肖像（512×512，Warm Companion） | 全设计稿统一使用 |
| 字母 Avatar | 系统消息等无头像实体 | `.avatar--system` |

### 10.3 朋友圈配图（JPG）

- `moment-sarah-park.jpg` — 生活类  
- `moment-emma-kitchen.jpg` — 生活类  
- `moment-alex-flight.jpg` — 生活类  
- 学习类动态以文字 + `MomentPhrase` 为主，可不配图  
- Phase 1+：LLM + 生图 API 按 persona 生成

### 10.4 Brand

- `callie-logo.png` — 1024×1024 App Icon 源；暖色渐变 + 白气泡 + 语音波形  
- `onboarding-hero.svg` — 首屏插画

### 10.5 iOS Asset Catalog 建议

```
Assets.xcassets/
├── Avatars/{sarah,alex,emma}.imageset
├── Moments/
├── Brand/AppIcon.appiconset
└── (Icons 用 SF Symbols，不必入库)
```

---

## 11. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-08-23 | 初版 Warm Companion + 10 屏 |
| v1.1 | 2026-08-23 | Dark Mode；消息「+」与伙伴资料；Tab 改朋友圈；视觉层次增强 |
| v1.2 | 2026-08-23 | 修复 hub 暗色可读性；Dark 限定在 device 框；Light/Dark 切换器 |
| v1.3 | 2026-08-23 | 学习反馈/朋友圈增加「应掌握单词」；朋友圈增加生活类人格动态 |
| v1.4 | 2026-08-23 | Dark 改 Warm Dark 调色板；修复 device 文字继承导致不可读 |
| v1.5 | 2026-08-23 | 新增 design/assets：SVG 图标、伙伴头像、朋友圈 JPG、Logo |
| v1.6 | 2026-08-23 | 朋友圈统一点赞/评论/加入复习互动栏 + 图标规范 |
| v1.7 | 2026-08-23 | 素材 v1.3：自定义 SVG 图标初版（已由 v1.9 Lucide 替代） |
| v1.8 | 2026-08-23 | 素材 v1.4：Warm Duotone 图标 + 半身肖像头像 + Logo 阴影层次 |
| v1.9 | 2026-08-23 | 图标改 Lucide outline（icon-design skill）+ export-lucide-icons.sh |
| v1.10 | 2026-08-23 | 修复图标 currentColor 变黑；简化头像/Logo；Hub icon-tile 布局 |
| v1.11 | 2026-08-23 | 头像层叠/居中修正；Logo 对称居中重绘 |
| v1.12 | 2026-08-23 | 头像：发顶全覆盖 + 三人差异化发型/五官 |
| v1.13 | 2026-08-23 | 删除 assets/icons；图标统一为设计稿 inline SVG |
| v1.14 | 2026-08-23 | 伙伴头像 v2 全量重绘：满顶发型 + 三人差异化轮廓 |
| v1.15 | 2026-08-23 | 头像/Logo 按 logo-creator（mascot + minimalist flat）第三次重绘 |
| v1.16 | 2026-08-23 | 伙伴头像改为 3D PNG；全设计稿统一替换 |
| v1.17 | 2026-08-23 | Logo 换为 3D PNG（渐变底 + 气泡语音波形）；Onboarding 展示新 Logo |
