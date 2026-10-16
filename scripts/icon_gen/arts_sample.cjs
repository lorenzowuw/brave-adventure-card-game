// 样板图案库：确立风格标准。每个 art 接收色板 C={main,deep,light,mainColor}，
// 返回 <g filter> 内部 SVG。所有图案居中于 (128,96)，主体落在 x:50-206 y:30-160 区域，
// 底部 y>168 留给名牌。统一画法：底层光晕圆 + 主体剪影(deep填充+main描边) + main高光线条。

// 剑（直刺挥砍类 attack）
function sword(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M150 36 L168 54 L96 150 L78 132 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M150 36 L168 54 L160 62 L142 44 Z" fill="${C.light}"/>
    <path d="M70 140 L88 158 M64 150 L80 166" stroke="${C.main}" stroke-width="7" stroke-linecap="round"/>
    <path d="M60 132 L96 96" stroke="${C.light}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>`;
}

// 盾（defense）
function shield(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M128 32 L188 52 V104 C188 138 160 158 128 168 C96 158 68 138 68 104 V52 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M128 50 L170 64 V104 C170 128 150 144 128 152 Z" fill="${C.main}" opacity="0.35"/>
    <path d="M128 70 L128 132 M104 96 H152" stroke="${C.light}" stroke-width="8" stroke-linecap="round"/>`;
}

// 治疗十字（heal）
function healCross(C) {
  return `
    <circle cx="128" cy="96" r="76" fill="${C.main}" opacity="0.14"/>
    <path d="M67 60 C42 88 48 132 86 152 M189 60 C214 88 208 132 170 152" stroke="${C.main}" stroke-width="6" fill="none" opacity="0.7"/>
    <rect x="108" y="52" width="40" height="92" rx="10" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <rect x="82" y="78" width="92" height="40" rx="10" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M128 64 V132 M94 98 H162" stroke="${C.light}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>`;
}

// 火球（元素 attack）
function fireball(C) {
  return `
    <circle cx="128" cy="100" r="50" fill="${C.main}" opacity="0.25"/>
    <path d="M128 44 C150 70 166 86 166 112 C166 142 150 160 128 160 C106 160 90 142 90 112 C90 86 106 70 128 44 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M128 78 C140 94 148 104 148 120 C148 138 140 148 128 148 C116 148 108 138 108 120 C108 104 116 94 128 78 Z" fill="${C.light}" opacity="0.85"/>
    <path d="M110 40 C104 54 108 64 116 70 M150 46 C158 58 156 70 148 76" stroke="${C.main}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.7"/>`;
}

module.exports = { sword, shield, healCross, fireball };
