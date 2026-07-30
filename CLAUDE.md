# x-remarks

iOS Safari userscript:在 X(Twitter)的用户名旁显示本地备注。通过 Userscripts App 运行。

## 运行环境约束(改代码前必读)

- **宿主是 Userscripts App(iOS Safari),不是浏览器扩展**。没有 `chrome.*` / `browser.*` API,存储只能用 `localStorage`。
- 目标页面是 **React SPA + 虚拟列表**,DOM 节点会被持续替换和回收。
- **手机上无控制台**。调试靠页面内 `toast` 和 CSS `:active` 视觉反馈。要断点用 Mac Safari 的「开发」菜单连真机(手机端先开:设置 → Safari → 高级 → 网页检查器)。
- 单文件分发。备注数据内嵌在 `DEFAULT_REMARKS`,**仅首次运行时种入 localStorage**,之后以 localStorage 为准 —— 改内嵌数据不会影响已装的设备。
- localStorage 会被 Safari 清站点数据抹掉,所以设置面板的导出是备份手段,不是可选功能。

## 结构(单文件 `x-remarks.user.js`)

| 区块 | 职责 |
|---|---|
| `DEFAULT_REMARKS` | 内置备注数据,key 为 `@handle` |
| 存储层 | `loadStore` / `persist` / `getStyleFor` / `setNote`;`lcIndex` 做大小写不敏感查找 |
| 选项 | `getOpt` / `setOpt` 脚手架,当前无启用项,存储键 `__opt_*` |
| 主题 | `detectTheme` 读 `data-theme`,`applyTheme` 写 CSS 变量 |
| 事件 | `bindDelegation`(唯一点击入口)+ `bindDirect`(元素级兜底) |
| 渲染 | `addProfileNote` / `addNotesToTimeline` / `renderAll` / `rerender` |
| UI | `buildEditor` 编辑弹窗、`buildUI` 设置面板、`toast` |

## 已知的坑(都踩过,别重犯)

1. **不要在 `touchstart` / `pointerdown` 上 `preventDefault()`**。iOS Safari 会取消整个点击手势,`click` 永远不产生。拦 X 的跳转只用 `stopPropagation()`。
2. **事件委托挂 `window`,不是 `document`**。X 的脚本先加载,它在 document 上的监听排在前面,一旦调用 `stopImmediatePropagation` 就收不到事件。症状:一开始能点,SPA 路由切换后突然失效。
3. **不要用 `window.prompt` / `alert`**。iOS Safari 会静默拦掉,既不显示也不报错。用自建 DOM 弹窗。
4. **不要给徽章单独 `addEventListener`**。React 换掉节点后监听就没了。
5. **不要往用户名那一行插元素**。那是定宽 flex 行,会把名字挤成省略号。用 `findColumnSlot` 向上找纵向容器,让徽章独占一行。
6. **不要依赖 X 的 class 名**(混淆且常变)。只用 `data-testid`:时间线是 `User-Name`,个人主页是 `UserName`(注意有无连字符)。
7. **虚拟列表会复用节点**,同一个 User-Name 区块可能换成别的用户。靠 `badgeOwner` WeakMap 精确清理旧徽章,否则会串号。
8. **顶部 App 横幅无法用脚本移除,不要再尝试**。那是 Apple 原生 Smart App Banner,由 Safari 画成浏览器浮层、不在 DOM 里,`querySelector` 找不到它;移除 `<meta name="apple-itunes-app">` 也无效(Safari 只在解析原始 HTML 时读一次,之后 JS 改动一律不理,`@run-at document-start` 同样赶不上)。已实现过一版特征识别方案并确认失败、代码已删。用户侧的办法只有两个:点 banner 最左侧的 `×`(点掉后基本不再出现),或对 x.com 开「请求桌面网站」。
9. 输入框字号必须 ≥ 16px,否则 iOS 聚焦时会自动放大整个页面。

## 验证清单(改动后手动过一遍)

- [ ] 时间线:有备注的用户显示药丸,独占一行,**不挤压用户名**
- [ ] 时间线滚动数屏后,药丸仍与用户对应(不串号)
- [ ] 点药丸弹出编辑框;保存 / 删除 / 取消 三个按钮都生效
- [ ] 个人主页:有备注显示药丸,无备注显示「＋ 备注」,**只有一个入口**
- [ ] SPA 导航(时间线 → 个人主页 → 返回)之后点击仍然有效
- [ ] X 切换浅色 / 暗色主题,弹窗与药丸配色跟随
- [ ] 设置面板:导出 JSON 完整,粘贴导入后立即生效
- [ ] 按钮按下有变暗缩小反馈 —— 用来判断触摸是否命中(手机无控制台时的主要诊断手段)

排查点击失效时,按这个顺序定位:按下**无**视觉反馈 → 被覆盖层挡住,查 z-index / 插入位置;有反馈但无弹窗 → 事件链被拦截或弹窗被拦,查第 1~3 条。

## 约定

- 备注 key 保留 `@` 前缀;查找大小写不敏感,写入保留原始大小写
- 内部保留键:`__opt_*`(选项,当前无启用项)、`__style_*`(全局样式)
- 单条备注可用对象形式覆盖样式:`{ note, color, fontSize, borderRadius }`
- 备注文字不含 emoji
- 药丸默认色走 `var(--xr-accent)` 跟随主题;单条 `color` 优先
