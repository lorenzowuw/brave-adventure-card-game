// 全知贤者 omnisage：知识奥义。主色橙 #F39C12。

// 知识复制：两本重叠的书（buff）
function copy(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M70 64 H108 C116 64 122 70 122 78 V140 H84 C76 140 70 134 70 126 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M134 52 H172 C180 52 186 58 186 66 V128 H148 C140 128 134 122 134 114 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M146 70 H174 M146 86 H174 M146 102 H168" stroke="${C.light}" stroke-width="4" stroke-linecap="round"/>`;
}

// 贤者洞察：眼睛 + 光芒（buff）
function insight(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M60 96 C90 64 166 64 196 96 C166 128 90 128 60 96 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <circle cx="128" cy="96" r="22" fill="${C.main}"/>
    <circle cx="128" cy="96" r="10" fill="${C.deep}"/>
    <circle cx="135" cy="89" r="4" fill="${C.light}"/>
    <path d="M128 40 V56 M84 54 L94 66 M172 54 L162 66" stroke="${C.light}" stroke-width="4" stroke-linecap="round"/>`;
}

// 智慧打击：羽笔/符文剑（attack）
function strike(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M168 34 C120 50 92 96 84 150 C96 142 104 144 108 154 C150 138 176 92 184 42 C172 50 164 50 168 34 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M160 56 C132 70 112 100 102 134" stroke="${C.light}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M84 150 L70 164" stroke="${C.main}" stroke-width="5" stroke-linecap="round"/>`;
}

// 平衡之道：天平（attack）
function balance(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M128 40 V150 M96 150 H160" stroke="${C.main}" stroke-width="6" stroke-linecap="round"/>
    <path d="M68 56 H188" stroke="${C.main}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="128" cy="44" r="8" fill="${C.light}"/>
    <path d="M68 56 L52 100 H84 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <path d="M188 56 L172 100 H204 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>`;
}

// 知识洪流：奔涌的符文流（attack）
function flood(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M44 60 C90 52 120 76 166 66 C190 60 200 70 208 60 M40 96 C90 86 120 110 168 100 C192 94 202 104 210 94 M44 132 C90 124 120 146 166 138 C190 132 200 142 208 132" stroke="${C.main}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="80" cy="60" r="5" fill="${C.light}"/><circle cx="150" cy="98" r="5" fill="${C.light}"/><circle cx="100" cy="134" r="5" fill="${C.light}"/>`;
}

// 万能护盾：盾 + 多符文（defense）
function shield(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M128 32 L186 52 V102 C186 134 160 154 128 164 C96 154 70 134 70 102 V52 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="128" cy="94" r="28" fill="none" stroke="${C.light}" stroke-width="4"/>
    <path d="M128 66 V122 M100 94 H156 M110 76 L146 112 M146 76 L110 112" stroke="${C.light}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`;
}

module.exports = {
  omnisage_copy_1: copy,
  omnisage_insight: insight,
  omnisage_strike: strike,
  omnisage_balance: balance,
  omnisage_flood: flood,
  omnisage_shield: shield,
};
