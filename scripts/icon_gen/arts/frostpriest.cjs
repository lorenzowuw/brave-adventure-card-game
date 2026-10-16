// 冰霜牧师 frostpriest：寒冰法术。主色蓝 #3498DB。

// 冰霜之触：单冰晶尖刺（attack）
function freeze(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M128 28 L150 86 L140 96 L150 150 L128 168 L106 150 L116 96 L106 86 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M128 44 L128 156" stroke="${C.light}" stroke-width="5" stroke-linecap="round"/>
    <path d="M128 70 L108 58 M128 70 L148 58 M128 110 L106 100 M128 110 L150 100" stroke="${C.light}" stroke-width="4" stroke-linecap="round"/>`;
}

// 暴风雪：多片飘落雪花 + 风雪斜线（attack）
function blizzard(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M48 44 L88 84 M70 38 L120 88 M150 50 L196 96 M170 110 L206 146 M64 120 L96 152" stroke="${C.main}" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
    <g stroke="${C.light}" stroke-width="4" stroke-linecap="round">
      <path d="M96 66 V102 M80 84 H112 M84 74 L108 94 M84 94 L108 74"/>
    </g>
    <g stroke="${C.light}" stroke-width="4" stroke-linecap="round">
      <path d="M162 100 V136 M146 118 H178 M150 108 L174 128 M150 128 L174 108"/>
    </g>`;
}

// 冰霜领域：地面冰环 + 立柱（attack）
function iceField(C) {
  return `
    <ellipse cx="128" cy="128" rx="80" ry="30" fill="${C.main}" opacity="0.18"/>
    <ellipse cx="128" cy="128" rx="80" ry="30" fill="none" stroke="${C.main}" stroke-width="4"/>
    <path d="M86 128 L96 70 L106 128 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <path d="M118 132 L128 44 L138 132 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <path d="M150 128 L162 78 L172 128 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <path d="M96 70 L128 44 L162 78" stroke="${C.light}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

// 冰结界：冰盾 + 雪花（defense）
function barrier(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M128 32 L186 52 V102 C186 134 160 154 128 164 C96 154 70 134 70 102 V52 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <g stroke="${C.light}" stroke-width="5" stroke-linecap="round">
      <path d="M128 60 V132 M96 78 L160 114 M96 114 L160 78"/>
    </g>
    <circle cx="128" cy="96" r="6" fill="${C.light}"/>`;
}

// 寒冰治疗：雪花 + 十字（heal）
function iceHeal(C) {
  return `
    <circle cx="128" cy="96" r="76" fill="${C.main}" opacity="0.14"/>
    <g stroke="${C.main}" stroke-width="6" stroke-linecap="round" opacity="0.7">
      <path d="M128 40 V152 M80 68 L176 124 M80 124 L176 68"/>
    </g>
    <rect x="112" y="74" width="32" height="44" rx="6" fill="${C.deep}" stroke="${C.light}" stroke-width="4"/>
    <rect x="106" y="80" width="44" height="32" rx="6" fill="${C.deep}" stroke="${C.light}" stroke-width="4"/>
    <path d="M128 82 V110 M114 96 H142" stroke="${C.light}" stroke-width="6" stroke-linecap="round"/>`;
}

// 冰霜之怒：冰晶环绕爆发（buff）
function fury(C) {
  return `
    <circle cx="128" cy="96" r="40" fill="${C.main}" opacity="0.22"/>
    <g stroke="${C.main}" stroke-width="6" stroke-linecap="round">
      <path d="M128 96 L128 34 M128 96 L128 158 M128 96 L66 96 M128 96 L190 96"/>
      <path d="M128 96 L84 52 M128 96 L172 52 M128 96 L84 140 M128 96 L172 140"/>
    </g>
    <g stroke="${C.light}" stroke-width="3" stroke-linecap="round">
      <path d="M128 52 L120 60 M128 52 L136 60 M184 96 L176 88 M184 96 L176 104"/>
    </g>
    <circle cx="128" cy="96" r="14" fill="${C.deep}" stroke="${C.light}" stroke-width="4"/>`;
}

module.exports = {
  frostpriest_freeze_1: freeze,
  frostpriest_blizzard: blizzard,
  frostpriest_ice_field: iceField,
  frostpriest_barrier: barrier,
  frostpriest_heal: iceHeal,
  frostpriest_fury: fury,
};
