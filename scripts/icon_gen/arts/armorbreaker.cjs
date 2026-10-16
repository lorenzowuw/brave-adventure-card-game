// 破甲狂战 armorbreaker：重武碎甲。主色灰 #7F8C8D。

// 破甲斩：巨斧（attack）
function breaker(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M120 30 L132 30 L132 162 L120 162 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="3"/>
    <path d="M132 40 C176 44 196 68 196 100 C170 92 148 92 132 98 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M120 40 C76 44 56 68 56 100 C82 92 104 92 120 98 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M132 52 C160 56 176 72 180 92 M120 52 C92 56 76 72 72 92" stroke="${C.light}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

// 重武器猛击：战锤（attack）
function heavy(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M122 60 L134 60 L134 160 L122 160 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="3"/>
    <rect x="78" y="34" width="100" height="52" rx="8" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M78 60 H178 M98 40 V80 M158 40 V80" stroke="${C.light}" stroke-width="4" opacity="0.8"/>`;
}

// 真实伤害：穿透的箭/标记（attack）
function trueDmg(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <circle cx="128" cy="96" r="46" fill="none" stroke="${C.main}" stroke-width="5" opacity="0.6"/>
    <circle cx="128" cy="96" r="24" fill="none" stroke="${C.main}" stroke-width="5" opacity="0.8"/>
    <path d="M44 96 H212" stroke="${C.deep}" stroke-width="9" stroke-linecap="round"/>
    <path d="M44 96 H212" stroke="${C.light}" stroke-width="4" stroke-linecap="round"/>
    <path d="M212 96 L188 82 M212 96 L188 110" stroke="${C.light}" stroke-width="6" stroke-linecap="round"/>`;
}

// 粉碎打击：拳头 + 碎裂纹（attack）
function crush(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M56 96 L96 96 M50 70 L92 84 M50 122 L92 108" stroke="${C.main}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
    <path d="M96 64 H150 C166 64 174 76 174 96 C174 124 156 140 132 140 H96 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M96 82 H150 M96 100 H160 M96 118 H150" stroke="${C.light}" stroke-width="4" opacity="0.7"/>
    <path d="M158 96 L182 80 M170 110 L196 104" stroke="${C.light}" stroke-width="5" stroke-linecap="round"/>`;
}

// 狂暴：怒吼/烈焰升腾（buff）
function berserk(C) {
  return `
    <circle cx="128" cy="100" r="72" fill="${C.main}" opacity="0.13"/>
    <path d="M90 158 C70 130 78 104 96 84 C92 104 104 110 108 96 C112 70 132 60 124 36 C152 52 168 84 162 116 C172 108 178 96 176 82 C190 104 192 134 174 158 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M120 140 C108 122 114 104 126 90 C124 106 134 110 138 100 C142 116 138 132 130 144 Z" fill="${C.light}"/>`;
}

module.exports = {
  armor_breaker_1: breaker,
  armor_heavy: heavy,
  armor_true: trueDmg,
  armor_crush: crush,
  armor_berserk: berserk,
};
