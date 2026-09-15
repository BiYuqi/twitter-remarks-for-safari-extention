# X Remarks — AI 开发约定

本文件是仓库共用的 AI 开发说明，也是 Codex 的入口。Claude 从 `CLAUDE.md` 转到本文件。共用规则只维护在这里，平台细节维护在对应项目 README。

## 先确定目标项目

修改前阅读目标项目 README 中的开发注意事项与验证清单。

| 项目 | 源码入口 | 文档 | 运行与存储 |
|---|---|---|---|
| Safari | `safari-userscripts-extension/x-remarks.user.js` | [Safari README](safari-userscripts-extension/README.md) | Userscripts App；单文件；仅 `localStorage`，无 `chrome.*` / `browser.*` |
| Chrome | `chrome-extension/manifest.json` | [Chrome README](chrome-extension/README.md) | MV3；`chrome.storage.local`；content script + popup + service worker |

- “谷歌插件 / Chrome 扩展”指 `chrome-extension/`；“手机 Safari / Userscripts”指 `safari-userscripts-extension/`。
- 根目录已不再存放 `x-remarks.user.js`，不要重新创建旧路径。
- 两端独立分发。只改请求涉及的平台；共用逻辑是否同步需要检查两端实现。
- 开始前检查工作区改动，保留用户已有编辑和文件移动，不自行回退。

## 共用 DOM 与事件约束

1. X 是 React SPA + 虚拟列表，DOM 会持续替换和回收。保持 `badgeOwner` WeakMap 的所有者清理，防止备注串号。
2. 使用 `data-testid`，不依赖混淆 class。时间线为 `User-Name`，个人主页为 `UserName`；Chrome 用户列表用不限标签的 `[data-testid="UserCell"]`。
3. 徽章通过 `findColumnSlot` 独占一行，不挤压用户名的定宽 flex 行。
4. 全局事件委托挂 `window`，避免 X 在 `document` 上先拦截。元素监听只作兜底，不能成为唯一通路。
5. `touchstart` / `pointerdown` 只拦传播，不 `preventDefault()`；否则 Safari 可能不产生 click。拦截范围限制在扩展自己的交互元素。
6. 使用自建 DOM 编辑弹窗，不用 `window.prompt` / `alert`。保留按钮按下的视觉反馈。
7. 保留主题跟随、SPA 路由后的重绘和虚拟列表清理。

## 平台特别要求

### Safari

- 单文件分发；内置 `DEFAULT_REMARKS` 只作初始化，更新脚本不覆盖 localStorage 中已有数据。
- `localStorage` 按站点隔离，清除网站数据会丢失备注。导出备份功能必须保留。
- 输入框字号至少 16px，避免 iOS 聚焦时放大页面。
- 手机排查优先用 toast 和 `:active` 反馈，需要调试时用 Mac Safari 连接真机。
- 不再尝试移除 Safari 原生 Smart App Banner：它不在 DOM 中，修改 meta 也无法移除。已有结论见 Safari README。

### Chrome

- 存储和权限以 `manifest.json` 为准；不要把 Safari 的无扩展 API 限制套到本项目。
- 规则匹配共用 `rules.js`，保证页面和管理面板一致。
- 降噪只认推文作者，不能因引用作者命中规则就处理整条推文；保留节点复用时的降噪清理。
- 视频及其祖先不得施加整条推文的淡化滤镜或透明度。淡化仅作用于作者、正文和备注。
- `placementTracking` 不能无差别隐藏；去广告限定包含完整推文的容器并排除推文和播放器内部。视频修复的真机效果尚需回归验证，不把静态检查写成播放验证通过。
- 保留观察器有上限的防抖与插入层级缓存，避免播放视频时持续 DOM 变化导致备注不渲染。
- 重新加载扩展后需刷新已有 X 标签页，才能使用新内容脚本。

## 数据约定

- key 带 `@`；查找不区分大小写，写入保留原有 key 的大小写。
- 值支持字符串或 `{ note, color, fontSize, borderRadius }`；备注文字不含 emoji。
- 保留键：`__style_*`（全局样式）、`__opt_*`（Safari 预留）、`__settings`（Chrome 设置）。不要删除跨端导入时不使用的保留字段。
- Chrome 色彩优先级：单条颜色 > 规则颜色 > 全局颜色 > 主题强调色；Safari 没有规则层。
- Chrome 文件导入合并同名键，JSON 编辑保存整体替换；Safari 保存导入整体替换。文档必须区分。
- 修改默认数据不等于迁移已安装用户的数据，不自动清空用户存储。

## 验证与文档维护

- JavaScript 修改后运行相关文件的 `node --check`；差异运行 `git diff --check`。本仓库没有配置构建或自动化测试套件。
- 按对应 README 手动验证：时间线与虚拟列表、编辑保存/删除/取消、个人主页唯一入口、SPA 返回、主题、导入导出。
- Chrome 涉及样式或降噪时追加视频（普通、引用、详情、全屏）与去广告回归。
- 无浏览器或真机验证条件时，明确列出未验证项，不宣称通过。
- 用户说明写在对应项目 README；总入口仅维护导航和平台差异；共用 AI 约定更新本文件，`CLAUDE.md` 保持引用入口。

## 提交与推送约定

- 完成改动并报告检查结果后，用户回复“没问题”或“提交”，即授权提交本次任务相关改动，并推送到对应 GitHub 远程分支，无需再次确认。
- 提交前检查工作区和差异，完成相关检查；只暂存本次任务相关改动，不夹带用户其它未提交编辑。
- 提交信息用中文，说明具体改动；推送后报告提交编号与目标分支。
- 未完成的浏览器或真机验证仍需如实说明，不将用户授权或静态检查等同于实际验证通过。
- 不强制推送，不自行覆盖远程历史；若遇到冲突、权限或网络问题，保留改动并说明阻碍。
