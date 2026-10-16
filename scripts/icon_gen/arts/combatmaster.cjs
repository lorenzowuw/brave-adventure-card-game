// 格斗大师 combatmaster：拳法搏击。主色橙 #E67E22。

// 连击拳：多重残影拳
function combo(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M60 80 H92 V128 H60 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4" opacity="0.4"/>
    <path d="M88 76 H120 V132 H88 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4" opacity="0.65"/>
    <path d="M118 70 H164 C176 70 182 80 182 96 C182 124 162 140 138 140 H118 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M118 90 H164 M118 110 H170" stroke="${C.light}" stroke-width="4" opacity="0.75"/>`;
}

// 铁桥手：交叉护臂格挡反击
function guard(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M62 56 L150 132 M194 56 L106 132" stroke="${C.deep}" stroke-width="20" stroke-linecap="round"/>
    <path d="M62 56 L150 132 M194 56 L106 132" stroke="${C.main}" stroke-width="9" stroke-linecap="round"/>
    <path d="M84 78 L100 94 M156 78 L140 94" stroke="${C.light}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="128" cy="96" r="10" fill="${C.light}"/>`;
}

// 碎骨拳：重拳 + 冲击星
function heavyFist(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M70 50 L86 66 M40 90 H62 M70 142 L86 126" stroke="${C.main}" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
    <path d="M104 60 H156 C172 60 180 74 180 96 C180 128 158 146 130 146 H104 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M104 82 H156 M104 104 H164 M104 124 H154" stroke="${C.light}" stroke-width="4" opacity="0.8"/>
    <circle cx="118" cy="72" r="6" fill="${C.light}"/>`;
}

// 极限突破：向上突破的拳 + 爆发光
function burst(C) {
  return `
    <circle cx="128" cy="100" r="50" fill="${C.main}" opacity="0.22"/>
    <path d="M128 158 V96 M104 120 L128 96 L152 120" stroke="${C.main}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M96 70 H160 C172 70 178 80 178 92 H78 C78 80 84 70 96 70 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <g stroke="${C.light}" stroke-width="5" stroke-linecap="round">
      <path d="M128 56 V36 M92 60 L80 44 M164 60 L176 44"/>
    </g>`;
}

// 战意高涨：燃烧的拳/斗气（buff）
function spirit(C) {
  return `
    <circle cx="128" cy="100" r="72" fill="${C.main}" opacity="0.13"/>
    <path d="M92 156 C76 130 84 106 100 88 C96 106 108 110 112 98 C116 74 134 64 126 42 C152 58 166 88 160 118 C170 110 174 100 172 88 C186 108 188 136 172 156 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M104 130 H152 C152 142 142 150 128 150 C114 150 104 142 104 130 Z" fill="${C.light}"/>`;
}

module.exports = {
  combatmaster_combo_1: combo,
  combatmaster_guard_1: guard,
  combatmaster_heavy: heavyFist,
  combatmaster_burst: burst,
  combatmaster_spirit: spirit,
};
