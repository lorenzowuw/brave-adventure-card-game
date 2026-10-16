// 荆棘守卫 thornguardian：带刺自然护卫。主色绿 #27AE60。

// 荆棘之甲：盾 + 缠绕的刺藤（defense）
function thornArmor(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M128 32 L186 52 V102 C186 134 160 154 128 164 C96 154 70 134 70 102 V52 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M84 60 C108 90 100 120 130 150 M172 64 C150 92 156 124 126 150" stroke="${C.light}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M96 78 L86 70 M112 104 L122 98 M150 84 L160 76 M140 116 L130 110" stroke="${C.main}" stroke-width="4" stroke-linecap="round"/>`;
}

// 以血换甲：盾 + 血滴（defense）
function bloodPact(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M128 32 L186 52 V102 C186 134 160 154 128 164 C96 154 70 134 70 102 V52 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M128 64 C140 86 150 98 150 112 C150 128 140 138 128 138 C116 138 106 128 106 112 C106 98 116 86 128 64 Z" fill="${C.light}"/>
    <path d="M122 100 C118 106 118 114 124 118" stroke="${C.deep}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

// 反刺：尖刺向外弹射（attack）
function counter(C) {
  return `
    <circle cx="128" cy="96" r="40" fill="${C.main}" opacity="0.22"/>
    <circle cx="128" cy="96" r="22" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <g fill="${C.light}" stroke="${C.main}" stroke-width="3">
      <path d="M128 74 L120 44 L136 44 Z"/>
      <path d="M128 118 L120 148 L136 148 Z"/>
      <path d="M106 96 L76 88 L76 104 Z"/>
      <path d="M150 96 L180 88 L180 104 Z"/>
      <path d="M112 80 L88 60 L100 50 Z"/>
      <path d="M144 80 L168 60 L156 50 Z"/>
    </g>`;
}

// 荆棘缠绕：交缠的带刺藤蔓束缚（attack）
function bind(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M64 40 C100 80 100 112 64 152 M192 40 C156 80 156 112 192 152" stroke="${C.deep}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M64 40 C100 80 100 112 64 152 M192 40 C156 80 156 112 192 152" stroke="${C.main}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M82 70 L70 64 M86 120 L74 126 M174 70 L186 64 M170 120 L182 126 M128 88 V108" stroke="${C.light}" stroke-width="4" stroke-linecap="round"/>`;
}

// 荆棘绽放：带刺的花绽放（attack）
function thornBloom(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <g fill="${C.deep}" stroke="${C.main}" stroke-width="4">
      <path d="M128 96 C128 56 108 44 96 64 C112 70 120 80 128 96 Z"/>
      <path d="M128 96 C168 96 180 76 160 64 C154 80 144 88 128 96 Z"/>
      <path d="M128 96 C128 136 148 148 160 128 C144 122 136 112 128 96 Z"/>
      <path d="M128 96 C88 96 76 116 96 128 C102 112 112 104 128 96 Z"/>
    </g>
    <circle cx="128" cy="96" r="13" fill="${C.light}"/>
    <path d="M96 64 L84 50 M160 64 L172 50 M160 128 L172 142 M96 128 L84 142" stroke="${C.main}" stroke-width="4" stroke-linecap="round"/>`;
}

// 棘刺吸血：藤蔓 + 吸取的血珠（special）
function leech(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M56 150 C84 110 80 80 110 56 C140 32 150 72 178 50" stroke="${C.deep}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M56 150 C84 110 80 80 110 56 C140 32 150 72 178 50" stroke="${C.main}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M82 110 L70 104 M108 76 L122 76 M140 56 L130 46" stroke="${C.main}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="150" cy="110" r="12" fill="${C.light}"/>
    <path d="M150 122 C150 134 158 140 158 128" stroke="${C.main}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

module.exports = {
  thornguardian_thorn_1: thornArmor,
  thornguardian_bloodpact: bloodPact,
  thornguardian_counter: counter,
  thornguardian_bind: bind,
  thornguardian_thorn_bloom: thornBloom,
  thornguardian_leech: leech,
};
