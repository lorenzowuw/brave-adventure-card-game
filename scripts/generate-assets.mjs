// SVG 资产生成脚本 — 卡牌生存探索
// 运行: node scripts/generate-assets.mjs

import fs from 'fs';
import path from 'path';

const ASSETS_DIR = 'C:/myPrograms/card/assets';

const files = {

  // ========== UI 图标 ==========
  'ui/icon_hp.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#C0392B" stroke="#2C1810" stroke-width="0.5"/>
</svg>`,

  'ui/icon_stamina.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
<path d="M13 2L4 14h6v8l9-12h-6V2z" fill="#2980B9" stroke="#2C1810" stroke-width="0.5"/>
</svg>`,

  'ui/icon_wood.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
<rect x="9" y="3" width="6" height="18" rx="1" fill="#8B5E3C" stroke="#2C1810" stroke-width="0.5"/>
<ellipse cx="6" cy="6" rx="3" ry="2" fill="#6D4C2A" stroke="#2C1810" stroke-width="0.5"/>
<ellipse cx="18" cy="10" rx="3" ry="2" fill="#6D4C2A" stroke="#2C1810" stroke-width="0.5"/>
<ellipse cx="6" cy="18" rx="3" ry="2" fill="#6D4C2A" stroke="#2C1810" stroke-width="0.5"/>
</svg>`,

  'ui/icon_metal.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
<rect x="6" y="8" width="12" height="10" rx="2" fill="#95A5A6" stroke="#2C1810" stroke-width="0.5"/>
<rect x="8" y="6" width="8" height="4" rx="1" fill="#BDC3C7" stroke="#2C1810" stroke-width="0.5"/>
<circle cx="12" cy="13" r="2" fill="#7F8C8D" stroke="#2C1810" stroke-width="0.5"/>
</svg>`,

  'ui/icon_food.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
<path d="M14 4h2v7h-2V4zm-6 0h2v7H8V4zm2 11h4v5H10v-5zm-2-3h8v2H8v-2z" fill="#E67E22" stroke="#2C1810" stroke-width="0.5"/>
</svg>`,

  'ui/icon_pelt.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
<path d="M4 4h16v6c0 4-2 6-4 8s-4 4-4 4-2-2-4-4-4-4-4-8V4z" fill="#D4A574" stroke="#2C1810" stroke-width="0.5"/>
<path d="M4 4c2 2 6 2 8 0s4-2 8 0" fill="none" stroke="#2C1810" stroke-width="0.5"/>
</svg>`,

  'ui/icon_herb.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
<path d="M12 2c-3 0-5 2-5 5 0 2 1 4 2 5l-3 8h12l-3-8c1-1 2-3 2-5 0-3-2-5-5-5z" fill="#27AE60" stroke="#2C1810" stroke-width="0.5"/>
<path d="M9 4c1 1 2 3 2 5" fill="none" stroke="#2C1810" stroke-width="0.5"/>
<path d="M15 4c-1 1-2 3-2 5" fill="none" stroke="#2C1810" stroke-width="0.5"/>
</svg>`,

  'ui/btn_end_turn.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="120" height="40">
<rect x="1" y="1" width="118" height="38" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="2"/>
<text x="60" y="26" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#2C1810">结束回合</text>
</svg>`,

  'ui/panel_bg.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 900" width="280" height="900">
<rect width="280" height="900" fill="#8B6914" opacity="0.3"/>
<rect x="4" y="4" width="272" height="892" rx="8" fill="#F5E6C8" opacity="0.9" stroke="#2C1810" stroke-width="2"/>
</svg>`,

  // ========== 卡牌边框（用作参考/占位） ==========
  'ui/card_frame_common.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 126" width="90" height="126">
<rect x="2" y="2" width="86" height="122" rx="6" fill="#F5E6C8" stroke="#BDC3C7" stroke-width="2"/>
<rect x="6" y="6" width="78" height="50" rx="4" fill="#FFF8E7" stroke="#BDC3C7" stroke-width="1"/>
</svg>`,

  'ui/card_frame_rare.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 126" width="90" height="126">
<rect x="2" y="2" width="86" height="122" rx="6" fill="#F5E6C8" stroke="#3498DB" stroke-width="2"/>
<rect x="6" y="6" width="78" height="50" rx="4" fill="#E8F4FD" stroke="#3498DB" stroke-width="1"/>
</svg>`,

  'ui/card_frame_epic.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 126" width="90" height="126">
<rect x="2" y="2" width="86" height="122" rx="6" fill="#F5E6C8" stroke="#9B59B6" stroke-width="2"/>
<rect x="6" y="6" width="78" height="50" rx="4" fill="#F4ECF7" stroke="#9B59B6" stroke-width="1"/>
</svg>`,

  'ui/card_frame_legend.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 126" width="90" height="126">
<rect x="2" y="2" width="86" height="122" rx="6" fill="#F5E6C8" stroke="#F39C12" stroke-width="2"/>
<rect x="6" y="6" width="78" height="50" rx="4" fill="#FEF5E7" stroke="#F39C12" stroke-width="1"/>
<path d="M10 10 L80 10 L80 56 L10 56 Z" fill="none" stroke="#F39C12" stroke-width="0.5" stroke-dasharray="2,2"/>
</svg>`,

  // ========== 卡牌图标 (60x60) ==========
  'cards/knife.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<path d="M30 8 L42 24 L38 28 L44 44 L40 46 L34 30 L30 34 L18 18 Z" fill="#95A5A6" stroke="#2C1810" stroke-width="1"/>
<rect x="16" y="36" width="16" height="6" rx="2" fill="#8B5E3C" stroke="#2C1810" stroke-width="0.8"/>
</svg>`,

  'cards/shortbow.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<path d="M10 48 Q30 36 50 48 Q40 30 50 12 Q30 24 10 12 Q20 30 10 48Z" fill="#8B5E3C" stroke="#2C1810" stroke-width="1"/>
<line x1="14" y1="44" x2="46" y2="16" stroke="#BDC3C7" stroke-width="0.8"/>
<line x1="10" y1="12" x2="10" y2="48" stroke="#BDC3C7" stroke-width="0.8"/>
</svg>`,

  'cards/stone_axe.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<rect x="18" y="14" width="12" height="30" rx="3" fill="#8B5E3C" stroke="#2C1810" stroke-width="0.8"/>
<path d="M30 12 L42 6 L46 18 L34 20 Z" fill="#95A5A6" stroke="#2C1810" stroke-width="0.8"/>
</svg>`,

  'cards/iron_pick.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<rect x="20" y="16" width="10" height="28" rx="3" fill="#8B5E3C" stroke="#2C1810" stroke-width="0.8"/>
<path d="M14 14 L24 12 L30 22 L22 26 Z" fill="#7F8C8D" stroke="#2C1810" stroke-width="0.8"/>
<path d="M14 14 L10 18 L18 26" fill="none" stroke="#7F8C8D" stroke-width="1"/>
</svg>`,

  'cards/herb_pack.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<rect x="16" y="18" width="28" height="24" rx="4" fill="#F5E6C8" stroke="#27AE60" stroke-width="1"/>
<path d="M20 22 Q30 14 40 22" fill="#27AE60" stroke="#1E8449" stroke-width="0.5"/>
<path d="M22 26 Q30 18 38 26" fill="#27AE60" stroke="#1E8449" stroke-width="0.5"/>
<line x1="30" y1="22" x2="30" y2="18" stroke="#8B5E3C" stroke-width="0.8"/>
</svg>`,

  'cards/dried_food.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<rect x="14" y="16" width="32" height="28" rx="4" fill="#F5DEB3" stroke="#8B5E3C" stroke-width="1"/>
<line x1="20" y1="26" x2="40" y2="26" stroke="#8B5E3C" stroke-width="0.8"/>
<line x1="20" y1="32" x2="40" y2="32" stroke="#8B5E3C" stroke-width="0.8"/>
<line x1="20" y1="38" x2="40" y2="38" stroke="#8B5E3C" stroke-width="0.8"/>
</svg>`,

  'cards/torch.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<rect x="26" y="22" width="8" height="24" rx="3" fill="#8B5E3C" stroke="#2C1810" stroke-width="0.8"/>
<path d="M22 22 Q30 8 38 22 Q32 18 30 24 Q28 18 22 22Z" fill="#E67E22" stroke="#2C1810" stroke-width="0.5"/>
<path d="M26 20 Q30 12 34 20" fill="#F39C12" stroke="none"/>
</svg>`,

  'cards/trap.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<circle cx="30" cy="30" r="14" fill="none" stroke="#7F8C8D" stroke-width="2"/>
<circle cx="30" cy="30" r="8" fill="none" stroke="#7F8C8D" stroke-width="1.5"/>
<path d="M20 20 L40 40 M40 20 L20 40" stroke="#7F8C8D" stroke-width="1.5"/>
<circle cx="30" cy="30" r="3" fill="#C0392B"/>
</svg>`,

  'cards/bandage.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<rect x="14" y="20" width="32" height="20" rx="6" fill="#ECF0F1" stroke="#BDC3C7" stroke-width="1"/>
<line x1="20" y1="24" x2="20" y2="36" stroke="#C0392B" stroke-width="1.5"/>
<line x1="26" y1="24" x2="26" y2="36" stroke="#C0392B" stroke-width="1.5"/>
<line x1="34" y1="24" x2="34" y2="36" stroke="#C0392B" stroke-width="1.5"/>
<line x1="40" y1="24" x2="40" y2="36" stroke="#C0392B" stroke-width="1.5"/>
</svg>`,

  'cards/leather_armor.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<path d="M18 12 L42 12 L46 28 Q30 40 14 28 Z" fill="#D4A574" stroke="#2C1810" stroke-width="1"/>
<line x1="24" y1="12" x2="24" y2="36" stroke="#8B5E3C" stroke-width="0.8"/>
<line x1="36" y1="12" x2="36" y2="36" stroke="#8B5E3C" stroke-width="0.8"/>
<line x1="14" y1="28" x2="46" y2="28" stroke="#8B5E3C" stroke-width="0.8"/>
</svg>`,

  'cards/bone_knife.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<path d="M28 12 L40 24 L36 28 L42 40 L38 42 L32 30 L28 34 L18 22 Z" fill="#F5DEB3" stroke="#2C1810" stroke-width="1"/>
<rect x="16" y="34" width="16" height="6" rx="2" fill="#D4A574" stroke="#2C1810" stroke-width="0.8"/>
</svg>`,

  'cards/sprint.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<circle cx="22" cy="18" r="5" fill="#F5E6C8" stroke="#2C1810" stroke-width="0.8"/>
<path d="M20 23 L18 38 L24 36 L22 44 L30 42 L26 34 L32 26 Z" fill="#E67E22" stroke="#2C1810" stroke-width="0.8"/>
<line x1="34" y1="16" x2="44" y2="10" stroke="#BDC3C7" stroke-width="1.5" stroke-linecap="round"/>
<line x1="36" y1="20" x2="46" y2="16" stroke="#BDC3C7" stroke-width="1.5" stroke-linecap="round"/>
<line x1="38" y1="24" x2="46" y2="22" stroke="#BDC3C7" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,

  'cards/scout.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<rect x="4" y="4" width="52" height="52" rx="6" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<ellipse cx="30" cy="28" rx="12" ry="10" fill="#F5E6C8" stroke="#2C1810" stroke-width="1"/>
<circle cx="30" cy="26" r="5" fill="#2C1810"/>
<circle cx="30" cy="26" r="2" fill="#F5E6C8"/>
<path d="M22 10 L26 20 M38 10 L34 20" stroke="#2C1810" stroke-width="0.8" fill="none"/>
</svg>`,

  // ========== 遭遇/敌人 (120x168) ==========
  'encounters/wolf.svg': fullEncounterSvg('🐺', '野狼', '#95A5A6'),
  'encounters/boar.svg': fullEncounterSvg('🐗', '野猪', '#8B5E3C'),
  'encounters/snake.svg': fullEncounterSvg('🐍', '毒蛇', '#27AE60'),
  'encounters/bear.svg': fullEncounterSvg('🐻', '巨熊', '#6D4C2A'),
  'encounters/goblin.svg': fullEncounterSvg('👺', '哥布林', '#27AE60'),
  'encounters/spider.svg': fullEncounterSvg('🕷', '蜘蛛', '#2C1810'),
  'encounters/tree.svg': fullEncounterSvg('🌲', '树木', '#8B5E3C'),
  'encounters/ore_vein.svg': fullEncounterSvg('🪨', '矿脉', '#7F8C8D'),
  'encounters/herbs.svg': fullEncounterSvg('🍃', '药草', '#27AE60'),
  'encounters/carcass.svg': fullEncounterSvg('🦌', '猎物', '#D4A574'),
};

function fullEncounterSvg(emoji, name, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 168" width="120" height="168">
<rect x="4" y="4" width="112" height="160" rx="8" fill="#F5E6C8" stroke="${color}" stroke-width="2"/>
<text x="60" y="70" text-anchor="middle" font-size="48">${emoji}</text>
<text x="60" y="110" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="#2C1810">${name}</text>
</svg>`;
}

// 写入所有文件
let count = 0;
for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(ASSETS_DIR, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  count++;
}

// 写入敌人专用大图
const enemies = {
  'wolf': { emoji: '🐺', name: '野狼', desc: '饥饿的灰狼在林间低吼', hp: 'HP 6', atk: 'ATK 2', color: '#95A5A6' },
  'bear': { emoji: '🐻', name: '巨熊', desc: '挡住去路的庞然大物', hp: 'HP 15', atk: 'ATK 4', color: '#6D4C2A' },
};
for (const [id, data] of Object.entries(enemies)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 168" width="120" height="168">
<rect x="4" y="4" width="112" height="160" rx="8" fill="#F5E6C8" stroke="${data.color}" stroke-width="2"/>
<rect x="8" y="8" width="104" height="96" rx="6" fill="#FFF8E7" stroke="${data.color}" stroke-width="1"/>
<text x="60" y="68" text-anchor="middle" font-size="52">${data.emoji}</text>
<text x="60" y="120" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#2C1810">${data.name}</text>
<text x="60" y="140" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#7F8C8D">${data.hp} | ${data.atk}</text>
</svg>`;
  fs.writeFileSync(path.join(ASSETS_DIR, 'encounters', `${id}_full.svg`), svg, 'utf-8');
  count++;
}

console.log(`✅ 已生成 ${count} 个 SVG 资产`);
console.log('📁 assets/ui/    — UI 元素');
console.log('📁 assets/cards/  — 卡牌图标');
console.log('📁 assets/encounters/ — 遭遇/敌人');
