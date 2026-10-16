// 生命贤者 lifesage：自然治疗。主色绿 #2ECC71。

// 回春术：十字 + 生命光环
function rejuvenate(C) {
  return `
    <circle cx="128" cy="96" r="76" fill="${C.main}" opacity="0.14"/>
    <path d="M67 56 C42 84 48 130 86 150 M189 56 C214 84 208 130 170 150" stroke="${C.main}" stroke-width="6" fill="none" opacity="0.7"/>
    <rect x="110" y="50" width="36" height="92" rx="10" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <rect x="84" y="76" width="88" height="36" rx="10" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M128 62 V130 M96 94 H160" stroke="${C.light}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>`;
}

// 净化微风：飘动叶片 + 风线
function cleanse(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M40 70 C90 60 150 60 200 64 M36 100 C96 92 150 92 210 100 M44 130 C96 124 150 124 204 132" stroke="${C.main}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.55"/>
    <path d="M128 48 C100 60 92 96 110 130 C146 120 160 84 148 50 C140 70 130 78 128 48 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M124 64 C124 92 118 110 112 124" stroke="${C.light}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

// 远古种子：发芽的种子
function seed(C) {
  return `
    <circle cx="128" cy="100" r="72" fill="${C.main}" opacity="0.13"/>
    <ellipse cx="128" cy="128" rx="34" ry="40" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M128 96 C128 70 110 56 90 54 C96 76 110 90 128 96 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <path d="M128 96 C128 66 148 50 170 50 C162 74 148 90 128 96 Z" fill="${C.light}" stroke="${C.main}" stroke-width="4"/>
    <path d="M128 96 L128 132" stroke="${C.light}" stroke-width="5" stroke-linecap="round"/>`;
}

// 荆棘藤蔓：带刺藤条缠绕（attack）
function vine(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M70 156 C90 110 80 80 110 50 C140 22 150 70 180 44" stroke="${C.deep}" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M70 156 C90 110 80 80 110 50 C140 22 150 70 180 44" stroke="${C.main}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M92 120 L78 108 M104 92 L120 92 M118 64 L104 56 M148 56 L164 60 M86 138 L100 134" stroke="${C.light}" stroke-width="5" stroke-linecap="round"/>`;
}

// 孢子爆发：中心荚 + 四散孢子（attack）
function sporeBurst(C) {
  return `
    <circle cx="128" cy="96" r="40" fill="${C.main}" opacity="0.25"/>
    <circle cx="128" cy="96" r="26" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <circle cx="128" cy="96" r="10" fill="${C.light}"/>
    <g stroke="${C.main}" stroke-width="5" stroke-linecap="round">
      <path d="M128 60 L128 36 M128 132 L128 156 M92 96 L66 96 M164 96 L190 96"/>
      <path d="M103 71 L86 54 M153 71 L170 54 M103 121 L86 138 M153 121 L170 138"/>
    </g>
    <circle cx="128" cy="34" r="6" fill="${C.light}"/><circle cx="128" cy="158" r="6" fill="${C.light}"/>
    <circle cx="64" cy="96" r="6" fill="${C.light}"/><circle cx="192" cy="96" r="6" fill="${C.light}"/>`;
}

// 自然庇护：叶状护盾（defense）
function ward(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M128 30 C168 44 184 60 184 100 C184 134 158 154 128 164 C98 154 72 134 72 100 C72 60 88 44 128 30 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M128 54 V140 M128 78 C112 82 100 96 96 112 M128 78 C144 82 156 96 160 112 M128 108 C116 110 108 120 104 132 M128 108 C140 110 148 120 152 132" stroke="${C.light}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

module.exports = {
  lifesage_heal_1: rejuvenate,
  lifesage_cleanse: cleanse,
  lifesage_seed: seed,
  lifesage_vine: vine,
  lifesage_spore_burst: sporeBurst,
  lifesage_ward: ward,
};
