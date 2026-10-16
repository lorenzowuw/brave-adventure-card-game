// 特殊组：developer(金) + devourer(暗红) + generic(中性银灰)。

// ===== developer 创世者 =====
// 创世斩击：宏大十字光斩（attack）
function godSlash(C) {
  return `
    <circle cx="128" cy="96" r="76" fill="${C.main}" opacity="0.16"/>
    <path d="M40 40 L216 152 M216 40 L40 152" stroke="${C.deep}" stroke-width="14" stroke-linecap="round"/>
    <path d="M40 40 L216 152 M216 40 L40 152" stroke="${C.light}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="128" cy="96" r="16" fill="${C.light}"/>
    <path d="M128 30 V52 M128 140 V162 M62 96 H84 M172 96 H194" stroke="${C.main}" stroke-width="5" stroke-linecap="round"/>`;
}

// 绝对屏障：完美几何护盾（defense）
function dome(C) {
  return `
    <circle cx="128" cy="96" r="76" fill="${C.main}" opacity="0.16"/>
    <path d="M48 120 C48 70 84 40 128 40 C172 40 208 70 208 120 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M70 120 C70 84 96 60 128 60 C160 60 186 84 186 120" stroke="${C.light}" stroke-width="4" fill="none"/>
    <path d="M96 120 C96 100 110 84 128 84 C146 84 160 100 160 120" stroke="${C.light}" stroke-width="4" fill="none"/>
    <rect x="48" y="120" width="160" height="14" rx="6" fill="${C.main}"/>`;
}

// ===== devourer 吞噬者 =====
// 撕咬：利齿大口（attack）
function bite(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.14"/>
    <path d="M52 64 C90 52 166 52 204 64 C190 78 176 84 176 84 L80 84 C80 84 66 78 52 64 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <path d="M52 128 C90 140 166 140 204 128 C190 114 176 108 176 108 L80 108 C80 108 66 114 52 128 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <g fill="${C.light}">
      <path d="M72 84 L82 104 L92 84 Z"/><path d="M100 84 L110 106 L120 84 Z"/><path d="M128 84 L138 106 L148 84 Z"/><path d="M156 84 L166 104 L176 84 Z"/>
      <path d="M86 108 L96 90 L106 108 Z"/><path d="M114 108 L124 88 L134 108 Z"/><path d="M142 108 L152 90 L162 108 Z"/>
    </g>`;
}

// 饱餐：鼓胀的胃囊 + 能量（attack）
function feast(C) {
  return `
    <circle cx="128" cy="100" r="72" fill="${C.main}" opacity="0.14"/>
    <path d="M128 40 C172 40 188 78 184 112 C180 146 156 162 128 162 C100 162 76 146 72 112 C68 78 84 40 128 40 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <circle cx="108" cy="96" r="10" fill="${C.light}"/><circle cx="148" cy="96" r="10" fill="${C.light}"/>
    <path d="M100 128 C112 142 144 142 156 128" stroke="${C.light}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

// 血盆大口：张开的巨口深渊（attack）
function maw(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.16"/>
    <ellipse cx="128" cy="100" rx="58" ry="64" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <ellipse cx="128" cy="104" rx="28" ry="34" fill="#0a0509"/>
    <g fill="${C.light}">
      <path d="M88 64 L98 84 L108 66 Z"/><path d="M120 56 L130 78 L140 56 Z"/><path d="M152 64 L162 66 L156 84 Z"/>
      <path d="M90 138 L100 118 L110 136 Z"/><path d="M122 146 L132 122 L142 144 Z"/>
    </g>`;
}

// ===== generic 通用 =====
// 基础打击：简洁直剑（attack）
function basicAttack(C) {
  return `
    <circle cx="128" cy="96" r="70" fill="${C.main}" opacity="0.12"/>
    <path d="M128 28 L140 40 L140 132 L128 148 L116 132 L116 40 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M100 132 H156 M128 132 V160" stroke="${C.main}" stroke-width="7" stroke-linecap="round"/>
    <path d="M128 44 L128 124" stroke="${C.light}" stroke-width="4" stroke-linecap="round"/>`;
}

// 基础格挡：简洁盾（defense）
function basicBlock(C) {
  return `
    <circle cx="128" cy="94" r="70" fill="${C.main}" opacity="0.12"/>
    <path d="M128 34 L184 54 V102 C184 132 158 152 128 162 C98 152 72 132 72 102 V54 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M128 58 V138" stroke="${C.light}" stroke-width="6" stroke-linecap="round"/>`;
}

// 轻巧打击：细匕首 + 速度线（attack）
function lightAttack(C) {
  return `
    <circle cx="128" cy="96" r="70" fill="${C.main}" opacity="0.12"/>
    <path d="M56 110 H96 M50 130 H86" stroke="${C.main}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
    <path d="M170 36 L182 48 L110 134 L96 142 L92 130 L100 120 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M170 36 L182 48 L176 54 L164 42 Z" fill="${C.light}"/>`;
}

// 魔力飞弹：能量弹 + 拖尾（attack）
function magicBolt(C) {
  return `
    <circle cx="128" cy="96" r="70" fill="${C.main}" opacity="0.12"/>
    <path d="M48 130 C80 110 100 104 132 96" stroke="${C.main}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.5"/>
    <circle cx="148" cy="90" r="34" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <circle cx="148" cy="90" r="14" fill="${C.light}"/>
    <path d="M148 50 V62 M188 90 H176 M148 130 V118" stroke="${C.main}" stroke-width="4" stroke-linecap="round"/>`;
}

// 魔力护盾：能量环盾（defense）
function magicShield(C) {
  return `
    <circle cx="128" cy="94" r="72" fill="${C.main}" opacity="0.12"/>
    <path d="M128 34 L184 54 V102 C184 132 158 152 128 162 C98 152 72 132 72 102 V54 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="128" cy="96" r="26" fill="none" stroke="${C.light}" stroke-width="4"/>
    <circle cx="128" cy="96" r="12" fill="${C.light}"/>`;
}

// 冥想：盘坐光环（buff）
function meditate(C) {
  return `
    <circle cx="128" cy="96" r="62" fill="none" stroke="${C.main}" stroke-width="3" stroke-dasharray="5 7" opacity="0.5"/>
    <circle cx="128" cy="66" r="16" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <path d="M88 138 C88 110 108 96 128 96 C148 96 168 110 168 138 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M88 138 C100 130 156 130 168 138" stroke="${C.light}" stroke-width="4" fill="none"/>
    <path d="M128 30 V44 M86 96 L76 88 M170 96 L180 88" stroke="${C.light}" stroke-width="4" stroke-linecap="round"/>`;
}

// 强能药剂：药水瓶 + 上扬箭头（buff）
function empowerPotion(C) {
  return `
    <circle cx="128" cy="100" r="70" fill="${C.main}" opacity="0.12"/>
    <path d="M114 44 H142 V64 L166 122 C172 150 150 166 128 166 C106 166 84 150 90 122 L114 64 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M97 118 C108 134 148 134 159 118 L162 132 C150 152 106 152 94 132 Z" fill="${C.main}" opacity="0.85"/>
    <rect x="110" y="36" width="36" height="12" rx="3" fill="${C.main}"/>
    <path d="M128 138 V96 M112 112 L128 96 L144 112" stroke="${C.light}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
}

// 弱化药剂：药水瓶 + 下降箭头（debuff）
function weakenPotion(C) {
  return `
    <circle cx="128" cy="100" r="70" fill="${C.main}" opacity="0.12"/>
    <path d="M114 44 H142 V64 L166 122 C172 150 150 166 128 166 C106 166 84 150 90 122 L114 64 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M97 118 C108 134 148 134 159 118 L162 132 C150 152 106 152 94 132 Z" fill="${C.main}" opacity="0.85"/>
    <rect x="110" y="36" width="36" height="12" rx="3" fill="${C.main}"/>
    <path d="M128 92 V134 M112 118 L128 134 L144 118" stroke="${C.light}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
}

// 治疗药剂：药水瓶 + 十字（heal）
function healPotion(C) {
  return `
    <circle cx="128" cy="100" r="70" fill="${C.main}" opacity="0.12"/>
    <path d="M114 44 H142 V64 L166 122 C172 150 150 166 128 166 C106 166 84 150 90 122 L114 64 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M97 118 C108 134 148 134 159 118 L162 132 C150 152 106 152 94 132 Z" fill="${C.main}" opacity="0.85"/>
    <rect x="110" y="36" width="36" height="12" rx="3" fill="${C.main}"/>
    <path d="M128 96 V134 M109 115 H147" stroke="${C.light}" stroke-width="8" stroke-linecap="round"/>`;
}

// 生命之泉：涌泉 + 治疗光（heal）
function lifeSpring(C) {
  return `
    <circle cx="128" cy="100" r="72" fill="${C.main}" opacity="0.13"/>
    <path d="M78 150 C78 134 94 130 110 132 C108 116 124 108 132 120 C140 104 162 110 158 128 C174 126 184 140 178 150 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M128 110 C128 84 110 72 110 72 M140 116 C148 92 168 84 168 84 M116 120 C104 100 84 96 84 96" stroke="${C.light}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="128" cy="60" r="6" fill="${C.light}"/><circle cx="92" cy="84" r="5" fill="${C.light}"/><circle cx="166" cy="72" r="5" fill="${C.light}"/>`;
}

module.exports = {
  dev_god_slash: godSlash,
  dev_dome: dome,
  devourer_bite_1: bite,
  devourer_feast: feast,
  devourer_maw: maw,
  generic_attack_1: basicAttack,
  generic_block: basicBlock,
  generic_light_attack: lightAttack,
  generic_magic_bolt: magicBolt,
  generic_magic_shield: magicShield,
  basic_meditate: meditate,
  generic_empower_potion: empowerPotion,
  generic_weaken_potion: weakenPotion,
  generic_heal_potion: healPotion,
  generic_max_hp_up: lifeSpring,
};
