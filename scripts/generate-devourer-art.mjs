/**
 * 生成吞噬者(devourer)火柴人风格 SVG 资产
 * - 角色立绘 characters/devourer.png (实为svg内容，但项目用png扩展名加载，故输出svg并复制)
 * 实际：项目卡图用 {id}.svg，角色立绘用 {id}.png。
 * 这里生成 SVG，立绘需 png——用 sharp 把 svg 栅格化为 png。
 *
 * 运行: node scripts/generate-devourer-art.mjs
 */
import fs from 'fs';
import sharp from 'sharp';

const COLOR = '#9B2D6F';      // 主题紫红
const DARK = '#1a0a14';
const LINE = '#0a0a0a';

// —— 吞噬者火柴人立绘：黑色身体 + 血盆大口头部 + 紫红光环 ——
function devourerPortrait() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <radialGradient id="aura" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="${COLOR}" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="${COLOR}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${DARK}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="${DARK}"/>
  <circle cx="200" cy="185" r="170" fill="url(#aura)"/>
  <!-- 身体 -->
  <g stroke="${LINE}" stroke-width="9" stroke-linecap="round" fill="none">
    <line x1="200" y1="150" x2="200" y2="265"/>
    <!-- 手臂(爪) -->
    <path d="M200 185 L150 220 L135 205 M150 220 L138 232"/>
    <path d="M200 185 L250 220 L265 205 M250 220 L262 232"/>
    <!-- 腿 -->
    <path d="M200 265 L168 320 L158 345"/>
    <path d="M200 265 L232 320 L242 345"/>
  </g>
  <!-- 血盆大口头部 -->
  <circle cx="200" cy="110" r="48" fill="#000" stroke="${COLOR}" stroke-width="4"/>
  <!-- 上排牙 -->
  <path d="M163 100 Q200 78 237 100 L237 108 Q200 90 163 108 Z" fill="#fff"/>
  <g fill="#fff" stroke="${LINE}" stroke-width="1">
    <polygon points="168,104 174,124 180,104"/>
    <polygon points="184,106 190,130 196,106"/>
    <polygon points="200,107 206,132 212,106"/>
    <polygon points="216,106 222,128 228,104"/>
  </g>
  <!-- 下排牙 -->
  <g fill="#fff" stroke="${LINE}" stroke-width="1">
    <polygon points="172,138 178,120 184,138"/>
    <polygon points="190,140 196,120 202,140"/>
    <polygon points="206,139 212,120 218,139"/>
  </g>
  <!-- 喉咙深处 -->
  <ellipse cx="200" cy="120" rx="20" ry="10" fill="${COLOR}" opacity="0.7"/>
  <!-- 发光眼 -->
  <circle cx="184" cy="92" r="5" fill="${COLOR}"/>
  <circle cx="216" cy="92" r="5" fill="${COLOR}"/>
</svg>`;
}

// —— 卡牌类型兜底图标 (按 {character}_{type}.png) ——
function cardIcon(emoji, glyph) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs><radialGradient id="g" cx="50%" cy="45%" r="60%">
    <stop offset="0%" stop-color="${COLOR}" stop-opacity="0.4"/>
    <stop offset="100%" stop-color="${DARK}" stop-opacity="0"/>
  </radialGradient></defs>
  <rect width="120" height="120" fill="${DARK}"/>
  <circle cx="60" cy="56" r="50" fill="url(#g)"/>
  ${glyph}
</svg>`;
}

// 攻击：獠牙
const atkGlyph = `
  <circle cx="60" cy="52" r="30" fill="#000" stroke="${COLOR}" stroke-width="3"/>
  <g fill="#fff" stroke="${LINE}" stroke-width="1">
    <polygon points="42,44 47,68 52,44"/>
    <polygon points="56,46 61,72 66,46"/>
    <polygon points="70,44 75,68 80,44"/>
  </g>
  <circle cx="50" cy="40" r="3.5" fill="${COLOR}"/>
  <circle cx="70" cy="40" r="3.5" fill="${COLOR}"/>`;

async function main() {
  // 立绘 → png
  const portraitSvg = devourerPortrait();
  await sharp(Buffer.from(portraitSvg)).png().toFile('public/assets/characters/devourer.png');
  console.log('✅ characters/devourer.png');

  // 类型兜底图标 → png
  await sharp(Buffer.from(cardIcon('⚔️', atkGlyph))).png().toFile('public/assets/skill_icons/devourer_atk.png');
  console.log('✅ skill_icons/devourer_atk.png');

  // 专属卡配图 → svg (项目优先加载 {id}.svg)
  const cardArts = {
    devourer_bite_1: atkGlyph,
    devourer_bite_2: atkGlyph,
    devourer_bite_3: atkGlyph,
    devourer_feast: atkGlyph,
    devourer_feast_green: atkGlyph,
    devourer_maw: atkGlyph,
    devourer_maw_blue: atkGlyph,
    devourer_maw_purple: atkGlyph,
  };
  for (const [id, glyph] of Object.entries(cardArts)) {
    fs.writeFileSync(`public/assets/skill_icons/${id}.svg`, cardIcon('', glyph), 'utf-8');
  }
  console.log('✅ 8 张专属卡 SVG 配图');
}

main().catch(e => { console.error(e); process.exit(1); });
