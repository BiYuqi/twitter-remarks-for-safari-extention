# X Remarks — Chrome 扩展版

和 `x-remarks.user.js`(iOS Safari / Userscripts)同样的功能:在 X(Twitter)的用户名下面显示本地备注,点一下药丸就能改。这一版是标准的 Chrome MV3 扩展。

## 安装

1. 打开 `chrome://extensions/`
2. 右上角打开「开发者模式」
3. 点「加载已解压的扩展程序」,选中 **本文件夹**(`chrome-extension/`)
4. 打开 https://x.com,首次安装会自动种入内置的 155 条备注

Edge / Brave / Arc 等 Chromium 内核浏览器同样适用。

## 用法

- **时间线**:有备注的用户,名字下面独占一行显示蓝色药丸;点药丸弹出编辑框(保存 / 删除 / 取消,回车保存,Esc 取消)
- **个人主页**:有备注显示药丸,没有备注显示「＋ 备注」
- **工具栏图标**:备注管理面板
  - 顶部一行直接新增(`@handle` 支持粘贴完整主页链接,会自动截成 handle)
  - 搜索框按 handle 或备注内容过滤
  - 点备注文字就地改,点 `✕` 删除,点 handle 在新标签打开该用户主页
  - `导出文件` / `导入文件`(合并导入,同名覆盖)/ `复制 JSON`
  - 右上角 `{ }` 切到 JSON 视图整体编辑(保存是**整体替换**)

改动在打开的 X 标签页里即时生效,不需要刷新。

## 与 Safari userscript 版的差异

| | userscript(iOS) | Chrome 扩展 |
|---|---|---|
| 存储 | `localStorage`,清站点数据会丢 | `chrome.storage.local`,清网站数据不受影响 |
| 设置入口 | 页面右下角悬浮 ⚙ 按钮 | 浏览器工具栏图标弹窗 |
| 备注管理 | 只有一个 JSON 文本框 | 列表 + 搜索 + 就地编辑,外加 JSON 视图 |
| 导入导出 | 复制粘贴 | 文件导入导出 + 复制 |
| 内置数据 | 内嵌在脚本里,首次运行种入 | `defaults.js`,`onInstalled` 时种入,**升级扩展不覆盖已有数据** |

数据结构完全一致,两边的 JSON 可以直接互相导入。

## 数据格式

```jsonc
{
  "@elonmusk": "马斯克",
  // 单条可以用对象形式覆盖样式
  "@someone": { "note": "备注", "color": "#ff3b30", "fontSize": "13px", "borderRadius": "10px" },
  // 内部保留键
  "__style_bgColor": "#007aff",
  "__style_fontSize": "12px",
  "__style_borderRadius": "6px"
}
```

- key 保留 `@` 前缀;查找大小写不敏感,写入保留原始大小写
- 药丸默认色走 `var(--xr-accent)`,跟随 X 的浅色 / 暗色主题;单条 `color` 优先

## 文件结构

| 文件 | 职责 |
|---|---|
| `manifest.json` | MV3 清单,只申请 `storage` 权限 + x.com/twitter.com 主机权限 |
| `defaults.js` | 内置备注数据,content script 和 service worker 共用 |
| `background.js` | 仅在首次安装时把内置数据写进 storage |
| `content.js` | 页面注入:识别用户、插徽章、编辑弹窗、主题跟随 |
| `content.css` | 徽章 / 弹窗 / toast 样式,主题变量由 `content.js` 写到 `:root` |
| `popup.html/css/js` | 工具栏备注管理面板 |

## 改代码前必读(踩过的坑,别重犯)

1. **事件委托挂 `window`,不是 `document`**。X 的脚本先加载,它在 document 上的监听排在前面,一旦 `stopImmediatePropagation` 就收不到事件。症状:一开始能点,SPA 路由切换后突然失效。
2. **不要在 `pointerdown` / `touchstart` 上 `preventDefault()`**,只 `stopPropagation()`。拦 X 的「点推文进详情」用后者就够。
3. **不要给徽章单独 `addEventListener` 当唯一通路**。React 换掉节点后监听就没了 —— 委托是主通路,元素级绑定只是兜底。
4. **不要往用户名那一行插元素**。那是定宽 flex 行,会把名字挤成省略号。`findColumnSlot` 向上找纵向容器,让徽章独占一行。
5. **不要依赖 X 的 class 名**(混淆且常变)。只用 `data-testid`:时间线是 `User-Name`,个人主页是 `UserName`(注意有无连字符)。
6. **虚拟列表会复用节点**,同一个 User-Name 区块可能换成别的用户。靠 `badgeOwner` WeakMap 精确清理旧徽章,否则会串号。
7. **编辑弹窗要拦 `keydown/keyup/keypress`**。X 有一堆单键快捷键(j/k/n/l…),不拦的话打字会触发它们。
8. 扩展重新加载后,旧标签页的 content script 会 context invalidated;`persist()` 已经接住同步抛错和异步 reject,提示刷新页面。

## 验证清单(改动后手动过一遍)

- [ ] 时间线:有备注的用户显示药丸,独占一行,不挤压用户名
- [ ] 滚动数屏后药丸仍与用户对应(不串号)
- [ ] 点药丸弹出编辑框;保存 / 删除 / 取消 都生效;回车保存、Esc 取消
- [ ] 个人主页:有备注显示药丸,无备注显示「＋ 备注」,只有一个入口
- [ ] SPA 导航(时间线 → 个人主页 → 返回)之后点击仍然有效
- [ ] X 切换浅色 / 暗色,弹窗与药丸配色跟随
- [ ] 弹窗改备注后,已打开的 X 页面即时更新(不刷新)
- [ ] 导出文件 → 清空 → 导入文件,数据完整回来
