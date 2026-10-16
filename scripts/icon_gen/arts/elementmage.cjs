// 元素法师 elementmage：奥术元素。主色紫 #8E44AD。
// 用角色主色统一着色保持识别，靠图案形态区分火/冰/电/土。

// 火球术：火焰球
function fireball(C) {
  return `
    <circle cx="128" cy="100" r="50" fill="${C.main}" opacity="0.25"/>
    <path d="M128 42 C152 70 168 88 168 116 C168 146 150 162 128 162 C106 162 88 146 88 116 C88 88 104 70 128 42 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M128 80 C140 96 148 106 148 122 C148 140 140 150 128 150 C116 150 108 140 108 122 C108 106 116 96 128 80 Z" fill="${C.light}" opacity="0.85"/>
    <path d="M108 42 C100 56 104 68 114 74 M150 48 C160 60 158 72 148 78" stroke="${C.main}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.7"/>`;
}

// 冰霜新星：六角雪花爆发
function frostNova(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <g stroke="${C.main}" stroke-width="6" stroke-linecap="round">
      <path d="M128 36 V156 M76 66 L180 126 M76 126 L180 66"/>
    </g>
    <g stroke="${C.light}" stroke-width="4" stroke-linecap="round">
      <path d="M128 60 L114 50 M128 60 L142 50 M128 132 L114 142 M128 132 L142 142"/>
      <path d="M96 78 L82 76 M160 114 L174 116 M96 114 L82 116 M160 78 L174 76"/>
    </g>
    <circle cx="128" cy="96" r="9" fill="${C.light}"/>`;
}

// 闪电链：折线闪电
function lightning(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M150 28 L104 92 L132 96 L92 164 L108 102 L80 98 Z" fill="${C.light}" stroke="${C.main}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M170 60 L150 84 M64 120 L84 100" stroke="${C.main}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>`;
}

// 元素融合：火+冰+电三色旋
function fusion(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M128 96 C128 60 96 56 90 84 C112 78 122 84 128 96 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <path d="M128 96 C160 78 156 46 132 52 C140 72 136 84 128 96 Z" fill="${C.light}" stroke="${C.main}" stroke-width="4"/>
    <path d="M128 96 C150 128 182 116 172 92 C152 104 140 102 128 96 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <path d="M128 96 C100 124 110 156 134 144 C120 124 122 108 128 96 Z" fill="${C.light}" stroke="${C.main}" stroke-width="4"/>
    <circle cx="128" cy="96" r="12" fill="${C.main}"/>`;
}

// 烈焰环：环形火焰
function flameRing(C) {
  return `
    <circle cx="128" cy="96" r="50" fill="none" stroke="${C.main}" stroke-width="12" opacity="0.85"/>
    <circle cx="128" cy="96" r="50" fill="none" stroke="${C.light}" stroke-width="4"/>
    <g fill="${C.deep}" stroke="${C.main}" stroke-width="3">
      <path d="M128 34 C134 44 134 50 128 54 C122 50 122 44 128 34 Z"/>
      <path d="M190 96 C180 102 174 102 170 96 C174 90 180 90 190 96 Z"/>
      <path d="M128 158 C122 148 122 142 128 138 C134 142 134 148 128 158 Z"/>
      <path d="M66 96 C76 90 82 90 86 96 C82 102 76 102 66 96 Z"/>
    </g>`;
}

// 大地护盾：岩石盾（defense）
function earthShield(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M128 32 L186 52 V102 C186 134 160 154 128 164 C96 154 70 134 70 102 V52 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M128 56 L104 86 L116 110 L128 92 L142 116 L156 84 Z" fill="${C.light}" opacity="0.85"/>
    <path d="M90 110 L110 120 M166 108 L146 120 M128 128 V146" stroke="${C.main}" stroke-width="4" stroke-linecap="round"/>`;
}

module.exports = {
  element_fireball_1: fireball,
  element_frost: frostNova,
  element_lightning: lightning,
  element_fusion: fusion,
  elementmage_flame_ring: flameRing,
  element_earth: earthShield,
};
