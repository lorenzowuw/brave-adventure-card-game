// 圣光牧师 holylight：神圣光辉。主色红 #E74C3C。

// 圣光打击：发光星锤砸下
function strike(C) {
  return `
    <circle cx="128" cy="96" r="72" fill="${C.main}" opacity="0.13"/>
    <path d="M70 40 L88 58 M40 70 H64 M186 40 L168 58" stroke="${C.main}" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
    <circle cx="128" cy="70" r="32" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M128 44 L136 64 L156 64 L140 78 L146 98 L128 86 L110 98 L116 78 L100 64 L120 64 Z" fill="${C.light}"/>
    <path d="M128 102 L128 158" stroke="${C.main}" stroke-width="9" stroke-linecap="round"/>`;
}

// 神圣审判：天降光柱 + 十字
function judgment(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M104 24 L152 24 L138 168 L118 168 Z" fill="${C.main}" opacity="0.28"/>
    <path d="M128 36 V150 M100 74 H156" stroke="${C.light}" stroke-width="10" stroke-linecap="round"/>
    <path d="M128 36 V150 M100 74 H156" stroke="${C.main}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="128" cy="74" r="7" fill="${C.light}"/>`;
}

// 圣光之怒：放射光芒爆发（attack）
function wrath(C) {
  return `
    <circle cx="128" cy="96" r="40" fill="${C.main}" opacity="0.3"/>
    <g stroke="${C.main}" stroke-width="6" stroke-linecap="round">
      <path d="M128 96 L128 30 M128 96 L128 162 M128 96 L62 96 M128 96 L194 96"/>
      <path d="M128 96 L80 48 M128 96 L176 48 M128 96 L80 144 M128 96 L176 144"/>
    </g>
    <circle cx="128" cy="96" r="22" fill="${C.deep}" stroke="${C.light}" stroke-width="5"/>
    <circle cx="128" cy="96" r="9" fill="${C.light}"/>`;
}

// 圣光冲击：向前冲的光弹 + 尾迹
function radiance(C) {
  return `
    <circle cx="128" cy="96" r="72" fill="${C.main}" opacity="0.12"/>
    <path d="M44 96 H110 M54 72 H104 M54 120 H104" stroke="${C.main}" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
    <circle cx="156" cy="96" r="38" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M156 70 L164 90 L186 90 L168 104 L174 126 L156 112 L138 126 L144 104 L126 90 L148 90 Z" fill="${C.light}"/>`;
}

// 圣光护盾：盾 + 光辉十字（defense）
function shield(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.13"/>
    <path d="M64 50 L80 66 M192 50 L176 66 M128 28 V44" stroke="${C.light}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
    <path d="M128 40 L186 58 V102 C186 134 160 154 128 164 C96 154 70 134 70 102 V58 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M128 62 V134 M100 96 H156" stroke="${C.light}" stroke-width="8" stroke-linecap="round"/>`;
}

module.exports = {
  holylight_strike_1: strike,
  holylight_judgment: judgment,
  holylight_wrath: wrath,
  holylight_radiance: radiance,
  holylight_shield: shield,
};
