// 共享生成框架：外框 + 升级阶配色 + 写盘
// 每个家族提供一个 art(C) 函数，返回 <g filter> 内部的 SVG 图案字符串。
// C 是该族的主色调对象 { main, deep, light }，由角色主色派生。
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'skill_icons');

// 升级阶 → 亮度系数（同图换色，越高阶越亮/越饱和）
// 6 阶: 白 绿 蓝 紫 橙 红（用后缀数量判断在 chain 中的位置）
const STAGE_TINT = [0.78, 0.86, 0.94, 1.0, 1.08, 1.16];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
function tint(hex, factor) {
  const [r, g, b] = hexToRgb(hex);
  if (factor >= 1) {
    // 提亮：向白色插值
    const t = (factor - 1) * 1.6;
    return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
  }
  // 降亮：向黑插值
  return rgbToHex(r * factor, g * factor, b * factor);
}

// 由角色主色派生一族的色板
function palette(mainColor, stageFactor) {
  const main = tint(mainColor, stageFactor);
  return {
    main,
    deep: tint(mainColor, stageFactor * 0.45),   // 深色（描边/暗部）
    light: tint(mainColor, Math.min(stageFactor * 1.25, 1.3)), // 高光
    mainColor,
  };
}

function frame(name, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="192" viewBox="0 0 256 192" role="img" aria-label="${name}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#2a241d"/>
      <stop offset="62%" stop-color="#15151d"/>
      <stop offset="100%" stop-color="#08080c"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2.6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="256" height="192" rx="24" fill="url(#bg)"/>
  <path d="M18 153 C73 129 171 130 238 154" stroke="#000" stroke-width="18" opacity="0.42" fill="none"/>
  <g filter="url(#glow)">
${inner}
  </g>
  <text x="128" y="181" fill="#fff4cc" font-family="Microsoft YaHei, Noto Sans SC, sans-serif" font-size="18" font-weight="700" text-anchor="middle" paint-order="stroke" stroke="#000" stroke-width="4">${name}</text>
</svg>
`;
}

// 主生成：families = [{chain:[ids], name, char, artKey}], arts = {artKey: fn(C)}, charColors, skillById
function generate(families, arts, charColors, skillById) {
  let count = 0, missing = [];
  for (const fam of families) {
    const art = arts[fam.artKey];
    if (!art) { missing.push(fam.artKey); continue; }
    const baseColor = charColors[fam.char] || '#cfcfcf';
    fam.chain.forEach((id, i) => {
      const card = skillById[id];
      const name = card ? card.name : id;
      const C = palette(baseColor, STAGE_TINT[Math.min(i, STAGE_TINT.length - 1)]);
      const svg = frame(name, art(C));
      fs.writeFileSync(path.join(DIR, id + '.svg'), svg, 'utf8');
      count++;
    });
  }
  return { count, missing };
}

module.exports = { generate, palette, tint, frame, DIR, STAGE_TINT };
