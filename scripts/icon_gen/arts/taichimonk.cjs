// 太极武僧 taichimonk：内劲掌法。主色橙 #E67E22。

// 推云掌：掌印 + 推力波
function pushPalm(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M186 50 C200 76 200 116 186 142 M204 40 C222 76 222 116 204 152" stroke="${C.main}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.55"/>
    <path d="M80 70 V58 M98 64 V50 M116 64 V52 M134 68 V58" stroke="${C.main}" stroke-width="7" stroke-linecap="round"/>
    <path d="M70 70 C70 64 78 62 80 70 L80 92 C98 88 116 88 134 92 L134 70 C146 70 150 80 150 96 C150 124 130 142 106 142 C86 142 70 124 70 100 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <circle cx="104" cy="108" r="12" fill="none" stroke="${C.light}" stroke-width="4"/>`;
}

// 吐纳循环：太极阴阳 + 气环（buff）
function breath(C) {
  return `
    <circle cx="128" cy="96" r="62" fill="none" stroke="${C.main}" stroke-width="4" stroke-dasharray="6 8" opacity="0.5"/>
    <circle cx="128" cy="96" r="46" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M128 50 A46 46 0 0 1 128 142 A23 23 0 0 1 128 96 A23 23 0 0 0 128 50 Z" fill="${C.main}"/>
    <circle cx="128" cy="73" r="7" fill="${C.deep}"/>
    <circle cx="128" cy="119" r="7" fill="${C.light}"/>
    <path d="M70 60 C60 76 60 116 70 132 M186 60 C196 76 196 116 186 132" stroke="${C.light}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.6"/>`;
}

// 气贯长虹：纵向冲天气柱
function qiPierce(C) {
  return `
    <circle cx="128" cy="96" r="72" fill="${C.main}" opacity="0.13"/>
    <path d="M128 28 L150 96 L128 164 L106 96 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M128 40 L128 152" stroke="${C.light}" stroke-width="6" stroke-linecap="round"/>
    <path d="M96 70 C108 84 108 108 96 122 M160 70 C148 84 148 108 160 122" stroke="${C.main}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.7"/>`;
}

// 四象连环：四个环相扣
function fourForms(C) {
  return `
    <circle cx="128" cy="96" r="76" fill="${C.main}" opacity="0.1"/>
    <circle cx="128" cy="60" r="24" fill="none" stroke="${C.light}" stroke-width="6"/>
    <circle cx="128" cy="132" r="24" fill="none" stroke="${C.light}" stroke-width="6"/>
    <circle cx="92" cy="96" r="24" fill="none" stroke="${C.main}" stroke-width="6"/>
    <circle cx="164" cy="96" r="24" fill="none" stroke="${C.main}" stroke-width="6"/>`;
}

// 气浪震荡：同心冲击波
function qiWave(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.1"/>
    <circle cx="128" cy="96" r="14" fill="${C.light}"/>
    <circle cx="128" cy="96" r="30" fill="none" stroke="${C.main}" stroke-width="6" opacity="0.9"/>
    <circle cx="128" cy="96" r="48" fill="none" stroke="${C.main}" stroke-width="5" opacity="0.6"/>
    <circle cx="128" cy="96" r="66" fill="none" stroke="${C.main}" stroke-width="4" opacity="0.35"/>`;
}

module.exports = {
  taichimonk_palm_1: pushPalm,
  taichimonk_breath: breath,
  taichimonk_qi: qiPierce,
  taichimonk_four_forms: fourForms,
  taichimonk_qi_wave: qiWave,
};
