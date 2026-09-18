# X Remarks 推特备注

在 X（Twitter）用户名下方显示本地备注，点击备注即可编辑。本仓库包含两个独立运行的项目，不需要构建。

## 选择版本

| 项目 | Safari Userscripts | Chrome 扩展 |
|---|---|---|
| 目录 | [`safari-userscripts-extension/`](safari-userscripts-extension/README.md) | [`chrome-extension/`](chrome-extension/README.md) |
| 宿主 | Safari + Userscripts App | Chrome / Chromium，Manifest V3 |
| 安装入口 | 将 `x-remarks.user.js` 放入 Userscripts | 加载 `chrome-extension/` 为已解压扩展 |
| 备注位置 | 时间线、个人主页 | 时间线、个人主页、用户列表 |
| 管理入口 | 页面右下角 ⚙ | 浏览器工具栏扩展图标 |
| 额外功能 | JSON 编辑与复制导出 | 规则上色、降噪、隐藏推广、备份回滚 |
| 存储 | 站点 `localStorage` | `chrome.storage.local` |
| 导入 | 保存 JSON 整体替换 | 文件导入合并；编辑 JSON 保存整体替换 |

## 使用文档

- [Safari：安装、使用、备份、故障排查与开发注意事项](safari-userscripts-extension/README.md)
- [Chrome：安装、管理面板、规则、视频回归与开发注意事项](chrome-extension/README.md)

备注数据由两个项目各自存储，不会自动跨浏览器或跨设备同步。Safari 清除网站数据会删除备注；请先导出备份。Chrome 使用扩展存储，清除 X 网站数据不影响备注，卸载扩展前仍应备份。

两端都使用 `@handle` 键和相同的备注 JSON 格式，可手动导出后互相导入。Chrome 的 `__settings` 在 Safari 中保留，但不会启用规则或降噪功能。内置备注只作初始化数据，更新代码不会覆盖已有备注。

## 仓库结构

```text
.
├── README.md                         # 项目总入口
├── AGENTS.md                         # AI 共用开发约定 / Codex 入口
├── CLAUDE.md                         # Claude 入口，引用共用约定
├── safari-userscripts-extension/
│   ├── README.md                     # Safari 使用与维护说明
│   └── x-remarks.user.js             # 单文件脚本
└── chrome-extension/
    ├── README.md                     # Chrome 使用与维护说明
    ├── manifest.json                 # MV3 配置
    ├── background.js                 # 首次安装初始化
    ├── defaults.js                   # 内置备注与默认设置
    ├── rules.js                      # 规则匹配
    ├── content.js / content.css       # 页面注入
    ├── popup.html / popup.js / popup.css
    └── icons/
```

## 开发入口

AI 修改代码前阅读 [AGENTS.md](AGENTS.md) 和目标项目的 README。Claude 入口是 [CLAUDE.md](CLAUDE.md)。两个项目分别维护，不应把 Safari 的 API 限制套到 Chrome，也不应直接把 Chrome API 搬进 Safari 脚本。
