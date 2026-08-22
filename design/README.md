# Callie HTML Design Prototypes

浏览器打开 **`index.html`** 查看设计系统与全部页面入口。

## 结构

```
design/
├── index.html          # 设计系统 hub + 页面索引
├── css/
│   ├── tokens.css
│   ├── components.css
│   ├── assets.css      # 头像/配图样式
│   └── …
├── assets/             # 头像 PNG、配图、Logo
│   ├── avatars/
│   ├── images/moments/
│   └── README.md
└── screens/            # iPhone 15 Pro 帧原型
    ├── messages.html / messages-dark.html
    ├── add-partner.html / partner-profile.html
    ├── moments.html    # 朋友圈（第三 Tab）
    └── …
```

## 预览

```bash
open design/index.html
```

- **索引页始终浅色**，不受系统 Dark Mode 影响
- 顶部 **Light / Dark** 切换器只改变手机预览框
- 各屏幕页右上角也有相同切换器

```bash
python3 -m http.server 8765 --directory design
# → http://localhost:8765
```

## v1.2 修复

- 移除 `prefers-color-scheme` 对 hub 的全局污染（此前导致白字 on  beige 看不清）
- Dark token 仅作用于 `.device[data-theme="dark"]`
- 屏幕卡片增加缩略图预览

## 开发对照

- **Coding Agent / iOS**：阅读 [docs/design.md](../docs/design.md)
- **产品**：对照 [docs/prd.md](../docs/prd.md) §7.1–7.3
