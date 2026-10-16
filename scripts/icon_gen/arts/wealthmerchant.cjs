// 财富商人 wealthmerchant：金币商贾。主色金 #F1C40F。

function coin(C, cx, cy, r) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <text x="${cx}" y="${cy + r * 0.42}" fill="${C.light}" font-family="serif" font-size="${r * 1.2}" font-weight="700" text-anchor="middle">$</text>`;
}

// 金币投掷：飞掷的金币 + 轨迹（attack）
function goldToss(C) {
  return `
    <circle cx="128" cy="96" r="72" fill="${C.main}" opacity="0.12"/>
    <path d="M48 150 C80 120 110 110 150 100" stroke="${C.main}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.55" stroke-dasharray="4 8"/>
    ${coin(C, 70, 140, 16)}
    ${coin(C, 150, 88, 38)}`;
}

// 暴击利润：金币 + 向上爆击箭头（attack）
function critProfit(C) {
  return `
    <circle cx="128" cy="100" r="72" fill="${C.main}" opacity="0.12"/>
    ${coin(C, 128, 112, 40)}
    <path d="M128 64 L128 30 M110 48 L128 30 L146 48" stroke="${C.light}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M86 56 L94 64 M170 56 L162 64" stroke="${C.main}" stroke-width="5" stroke-linecap="round"/>`;
}

// 投资回报：钱袋 + 增长（economy）
function investment(C) {
  return `
    <circle cx="128" cy="100" r="72" fill="${C.main}" opacity="0.12"/>
    <path d="M104 58 L120 46 H136 L152 58" stroke="${C.main}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M100 64 C90 64 84 74 84 92 C84 130 100 158 128 158 C156 158 172 130 172 92 C172 74 166 64 156 64 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <text x="128" y="120" fill="${C.light}" font-family="serif" font-size="46" font-weight="700" text-anchor="middle">$</text>`;
}

// 幸运硬币：四叶草 + 硬币（economy）
function luckyCoin(C) {
  return `
    <circle cx="128" cy="96" r="72" fill="${C.main}" opacity="0.12"/>
    <circle cx="128" cy="96" r="44" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <g fill="${C.light}">
      <path d="M128 96 C128 76 110 70 110 86 C100 80 96 98 116 100 Z"/>
      <path d="M128 96 C148 96 154 78 138 78 C144 68 126 64 124 84 Z"/>
      <path d="M128 96 C128 116 146 122 146 106 C156 112 160 94 140 92 Z"/>
      <path d="M128 96 C108 96 102 114 118 114 C112 124 130 128 132 108 Z"/>
    </g>`;
}

// 财富护盾：盾 + 金币纹（defense）
function wealthShield(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M128 32 L186 52 V102 C186 134 160 154 128 164 C96 154 70 134 70 102 V52 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="128" cy="92" r="26" fill="none" stroke="${C.light}" stroke-width="5"/>
    <text x="128" y="108" fill="${C.light}" font-family="serif" font-size="40" font-weight="700" text-anchor="middle">$</text>`;
}

module.exports = {
  wealth_gold_toss_1: goldToss,
  wealth_critical: critProfit,
  wealth_investment: investment,
  wealth_lucky: luckyCoin,
  wealth_shield: wealthShield,
};
