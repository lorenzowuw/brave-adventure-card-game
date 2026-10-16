// 亡灵牧师 undeadpriest：死灵法术。主色蓝 #3498DB。

// 生命汲取：骷髅 + 吸取的生命线（attack）
function drain(C) {
  return `
    <circle cx="128" cy="92" r="72" fill="${C.main}" opacity="0.12"/>
    <path d="M170 130 C150 118 130 116 110 120" stroke="${C.light}" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="3 7"/>
    <path d="M128 48 C100 48 82 70 82 98 C82 114 90 124 100 130 V146 H114 V134 H126 V148 H140 V134 H152 V146 H166 V130 C176 124 174 112 174 98 C174 70 156 48 128 48 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <circle cx="110" cy="96" r="11" fill="${C.main}"/><circle cx="146" cy="96" r="11" fill="${C.main}"/>
    <path d="M122 114 L128 124 L134 114 Z" fill="${C.main}"/>`;
}

// 灵魂收割：镰刀（attack）
function harvest(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M148 32 L148 150" stroke="${C.deep}" stroke-width="11" stroke-linecap="round"/>
    <path d="M148 32 L148 150" stroke="${C.main}" stroke-width="5" stroke-linecap="round"/>
    <path d="M148 40 C100 40 60 64 52 108 C92 84 124 86 148 96 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M148 52 C112 52 80 70 70 100" stroke="${C.light}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

// 腐蚀诅咒：滴落腐蚀的骷髅头（debuff）
function corruptCurse(C) {
  return `
    <circle cx="128" cy="90" r="72" fill="${C.main}" opacity="0.13"/>
    <path d="M128 42 C96 42 76 66 76 96 C76 114 84 126 94 134 L94 150 H108 V138 H120 V152 H136 V138 H148 V150 H162 V134 C172 126 180 114 180 96 C180 66 160 42 128 42 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <circle cx="108" cy="94" r="12" fill="${C.main}" opacity="0.9"/><circle cx="148" cy="94" r="12" fill="${C.main}" opacity="0.9"/>
    <path d="M122 112 L128 124 L134 112 Z" fill="${C.main}"/>
    <path d="M96 162 C96 174 104 180 104 168 M128 164 C128 178 136 184 136 172 M160 162 C160 174 152 180 152 168" stroke="${C.light}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.85"/>`;
}

// 死亡诅咒：骷髅 + 诅咒符文环（debuff）
function deathCurse(C) {
  return `
    <circle cx="128" cy="92" r="74" fill="${C.main}" opacity="0.12"/>
    <circle cx="128" cy="92" r="66" fill="none" stroke="${C.main}" stroke-width="3" stroke-dasharray="3 9" opacity="0.6"/>
    <path d="M128 52 C102 52 84 72 84 96 C84 110 90 120 98 126 L98 142 H112 V132 H120 V144 H136 V132 H144 V142 H158 V126 C166 120 172 110 172 96 C172 72 154 52 128 52 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M104 88 L120 96 L104 104 M152 88 L136 96 L152 104" stroke="${C.main}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M120 116 L128 122 L136 116" stroke="${C.main}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

// 亡灵复苏：向上升起的灵魂 + 光（heal）
function resurrect(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.13"/>
    <path d="M88 150 C92 120 84 96 100 72 C112 54 144 54 156 72 C172 96 164 120 168 150" stroke="${C.main}" stroke-width="5" fill="${C.deep}" opacity="0.9"/>
    <circle cx="128" cy="76" r="16" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <path d="M128 40 L128 24 M108 50 L98 38 M148 50 L158 38" stroke="${C.light}" stroke-width="5" stroke-linecap="round"/>
    <path d="M114 96 C120 108 136 108 142 96" stroke="${C.light}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

module.exports = {
  undead_drain_1: drain,
  undead_harvest: harvest,
  undead_curse_1: corruptCurse,
  undead_curse: deathCurse,
  undead_resurrect: resurrect,
};
