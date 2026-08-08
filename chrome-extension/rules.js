/* 规则匹配 —— 内容脚本和弹窗共用,保证"页面上显示什么颜色"和
 * "弹窗里显示命中几人"永远是同一套判定。
 *
 * 规则:{ name, color, noise, match: [关键词...], off }
 * 按数组顺序匹配,第一条命中的生效;关键词是子串匹配,大小写不敏感。 */

function XR_ruleFor(noteText, rules) {
  if (!noteText || !Array.isArray(rules)) return null;
  const lc = String(noteText).toLowerCase();
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (!r || r.off || !Array.isArray(r.match)) continue;
    for (let j = 0; j < r.match.length; j++) {
      const k = String(r.match[j] || '').trim().toLowerCase();
      if (k && lc.indexOf(k) >= 0) return r;
    }
  }
  return null;
}

if (typeof globalThis !== 'undefined') globalThis.XR_ruleFor = XR_ruleFor;
