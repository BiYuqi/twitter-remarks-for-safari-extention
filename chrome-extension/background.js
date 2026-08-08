/* Service Worker:只做一件事 —— 首次安装时把内置备注种进 storage。
 * 之后一切以 chrome.storage.local 为准,升级扩展不会覆盖用户数据。 */

const STORAGE_KEY = 'x_remarks_v1';

importScripts('defaults.js');

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== 'install') return;   // 升级不动数据
  const cur = await chrome.storage.local.get(STORAGE_KEY);
  if (cur[STORAGE_KEY]) return;               // 已有数据不覆盖
  const seed = Object.assign({}, XR_DEFAULT_REMARKS);
  seed.__settings = XR_DEFAULT_SETTINGS;      // 设置和备注同住一份扁平 JSON
  await chrome.storage.local.set({ [STORAGE_KEY]: seed });
});
