/**
 * 为缺图的怪物卡牌生成 SVG 图标。
 * 设计原则：
 *  - 完全复刻现有怪牌图标风格（256×192，radialGradient 背景 + glow 滤镜 + 底部阴影弧 + 内嵌卡名）。
 *  - 背景配色按区域走（与现有同区图标一致）。
 *  - 中心图形按"效果语义(motif)"从图形库取，复用现有视觉语汇（护盾/箭头/爪击/火焰/冰晶/法力符等）。
 *  - 每张图内嵌该牌自己的卡名，避免共用文件导致名字错乱。
 * 只生成缺失文件，绝不覆盖已有图标。
 */
const fs = require('path') && require('fs');
const path = require('path');

const ENEMIES = require('../src/data/enemies.json');
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'skill_icons', 'enemy');

// —— 区域背景配色（取自现有同区图标）——
const AREA_BG = {
  forest: ['#2a1416', '#0a0506', '#050507'],
  ruins:  ['#26241d', '#0a0908', '#050507'],
  flame:  ['#3a201a', '#0c0606', '#050507'],
  frost:  ['#1f1a2c', '#07060c', '#050507'],
  chaos:  ['#1f1a2c', '#07060c', '#050507'],
};
// —— 区域强调色（图形主色，未被 motif 覆盖时用）——
const AREA_ACCENT = {
  forest: '#3fae5e',
  ruins:  '#c9a23a',
  flame:  '#ff7a3c',
  frost:  '#5ec8e0',
  chaos:  '#b07cff',
};

// —— 状态色（施加状态时叠加的小标识色）——
const STATUS_COLOR = {
  burn: '#ff7a3c', bleed: '#e0484c', poison: '#7ec850', weak: '#9aa0b0',
  fragile: '#d08bff', paralyze: '#ffd23c', empower: '#ff9a3c', regen: '#6ee0a0',
};

// —— 图形库：返回中心 <g> 内的图形（128,96 为中心），color 为主色 ——
function gfx(motif, color, statusType) {
  const halo = `<circle cx="128" cy="98" r="58" fill="${color}" opacity="0.13"/>`;
  const lib = {
    // 护甲：盾牌
    armor: `${halo}<path d="M128 36 L182 58 V104 C182 134 156 152 128 162 C100 152 74 134 74 104 V58 Z" fill="${color}" stroke="${color}" stroke-width="3" opacity="0.92"/><path d="M128 60 V140 M96 96 H160" stroke="#0a0908" stroke-width="6" opacity="0.5"/>`,
    // 治疗：十字
    heal: `${halo}<path d="M112 52 H144 V84 H176 V116 H144 V148 H112 V116 H80 V84 H112 Z" fill="${color}" stroke="${color}" stroke-width="3"/>`,
    // 法力灼烧：闪电
    manaburn: `<circle cx="128" cy="98" r="50" fill="${color}" opacity="0.85"/><circle cx="128" cy="98" r="50" fill="none" stroke="${color}" stroke-width="4"/><path d="M118 70 L104 104 H124 L116 132 L154 90 H132 Z" fill="#fff" opacity="0.92"/>`,
    // 纯伤害：爪击/利刃
    damage: `${halo}<path d="M86 40 C100 80 96 110 108 150 M118 38 C130 80 128 112 138 152 M150 40 C160 82 160 112 168 150" stroke="${color}" stroke-width="9" stroke-linecap="round" fill="none"/>`,
    // 增益(自身)：上升箭头
    selfbuff: `${halo}<path d="M128 44 L160 96 H140 V150 H116 V96 H96 Z" fill="${color}" stroke="${color}" stroke-width="3"/>`,
    // 通用：菱形能量核
    generic: `${halo}<path d="M128 40 L168 98 L128 156 L88 98 Z" fill="${color}" stroke="${color}" stroke-width="4" opacity="0.9"/><path d="M128 64 L150 98 L128 132 L106 98 Z" fill="#fff" opacity="0.25"/>`,
    // 火焰
    fire: `${halo}<path d="M128 32 C150 66 168 82 150 122 C146 144 110 148 104 122 C92 98 116 86 110 62 C124 72 120 88 128 94 C132 78 124 52 128 32 Z" fill="${color}" stroke="${color}" stroke-width="3"/>`,
    // 冰晶
    ice: `${halo}<path d="M128 36 L128 160 M76 66 L180 130 M180 66 L76 130" stroke="${color}" stroke-width="7" stroke-linecap="round"/><path d="M128 36 L118 52 M128 36 L138 52 M76 66 L84 80 M180 66 L172 80 M76 130 L84 116 M180 130 L172 116 M128 160 L118 144 M128 160 L138 144" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`,
  };
  let body = lib[motif] || lib.generic;
  // 施加状态：右上角加一个小状态标识点
  if (statusType && STATUS_COLOR[statusType]) {
    body += `<circle cx="190" cy="58" r="13" fill="${STATUS_COLOR[statusType]}" opacity="0.95" stroke="#000" stroke-width="2"/>`;
  }
  return body;
}

// —— 根据卡决定 motif 与主色 ——
function pickMotif(card, areaAccent) {
  const ef = card.effect || {};
  const status = ef.applyStatus ? ef.applyStatus.type : null;
  const statusTarget = ef.applyStatus ? (ef.applyStatus.target || 'player') : null;
  let motif, color = areaAccent;

  if (ef.armor) motif = 'armor';
  else if (ef.heal) { motif = 'heal'; color = STATUS_COLOR.regen; }
  else if (ef.manaBurn) { motif = 'manaburn'; color = '#5aa0ff'; }
  else if (statusTarget === 'enemy') motif = 'selfbuff'; // 自身增益(强化/再生)
  else if (ef.damage) {
    // 攻击：按状态选火/冰/爪击
    if (status === 'burn') { motif = 'fire'; color = STATUS_COLOR.burn; }
    else if (status === 'weak' || status === 'paralyze') { motif = 'ice'; color = areaAccent; }
    else motif = 'damage';
  }
  else if (card.type === 'buff') motif = 'selfbuff';
  else motif = 'generic';

  // 施加给玩家的状态才显示状态标识点（自身增益不显示，避免误读）
  const badge = (statusTarget === 'player') ? status : null;
  return { motif, color, badge };
}

function buildSvg(card, area) {
  const [c0, c1, c2] = AREA_BG[area] || AREA_BG.chaos;
  const accent = AREA_ACCENT[area] || '#b07cff';
  const { motif, color, badge } = pickMotif(card, accent);
  const name = card.name;
  const aria = name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="192" viewBox="0 0 256 192" role="img" aria-label="${aria}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="${c0}"/>
      <stop offset="62%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2.6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="256" height="192" rx="24" fill="url(#bg)"/>
  <path d="M18 153 C73 129 171 130 238 154" stroke="#000" stroke-width="18" opacity="0.42" fill="none"/>
  <g filter="url(#glow)">
    ${gfx(motif, color, badge)}
  </g>
  <text x="128" y="181" fill="#fff4cc" font-family="Microsoft YaHei, Noto Sans SC, sans-serif" font-size="18" font-weight="700" text-anchor="middle" paint-order="stroke" stroke="#000" stroke-width="4">${aria}</text>
</svg>
`;
}

// —— 主流程 ——
const prefixArea = {};
for (const e of ENEMIES) {
  for (const c of [...(e.deck || []), ...(e.phaseDeck || [])]) {
    const p = c.id.split('_')[0];
    if (!prefixArea[p]) prefixArea[p] = e.area;
  }
}

const seen = new Set();
let created = 0, skipped = 0;
for (const e of ENEMIES) {
  for (const c of [...(e.deck || []), ...(e.phaseDeck || [])]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    const file = path.join(OUT_DIR, c.id + '.svg');
    if (fs.existsSync(file)) { skipped++; continue; }
    const area = prefixArea[c.id.split('_')[0]] || e.area;
    fs.writeFileSync(file, buildSvg(c, area));
    created++;
  }
}
console.log(`生成: ${created} | 跳过(已存在): ${skipped} | 唯一怪牌: ${seen.size}`);
