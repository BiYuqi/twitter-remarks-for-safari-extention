# X Remarks — Claude 开发入口

开始工作前，阅读并遵循仓库根目录的 [AGENTS.md](AGENTS.md)。它是两个项目共用开发约定的唯一维护来源；本文件不重复这些规则。

然后按任务目标阅读项目文档：

- Chrome / 谷歌插件：[`chrome-extension/README.md`](chrome-extension/README.md)。入口为 `manifest.json`，使用 `chrome.storage.local`。
- Safari / Userscripts：[`safari-userscripts-extension/README.md`](safari-userscripts-extension/README.md)。入口为单文件 `x-remarks.user.js`，使用站点 `localStorage`。

目录总览见 [README.md](README.md)。不要沿用旧根目录脚本路径，也不要将 Safari 专属约束应用到 Chrome 项目。实现和验证遵循 `AGENTS.md` 与目标项目文档；维护共用规则时只修改 `AGENTS.md`，避免两份 AI 说明漂移。
