// 钢铁壁垒 ironwall：盾牌战士。主色蓝 #4A90D9。
// 图案居中(128,96)，主体 x:50-206 y:30-160，底部留名牌。
// 画法标准：光晕圆 + deep填充main描边主体 + light高光。

// 盾牌猛击：盾牌正面带冲击星芒
function bash(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.13"/>
    <path d="M70 44 L96 30 M186 44 L160 30 M48 96 H30 M208 96 H226" stroke="${C.main}" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
    <path d="M128 30 L186 50 V100 C186 134 160 154 128 164 C96 154 70 134 70 100 V50 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M128 56 L106 92 H122 L116 128 L150 84 H132 L140 56 Z" fill="${C.light}"/>`;
}

// 惩戒反击：盾后斜插长剑（attack）
function retaliate(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M176 32 L188 44 L96 142 L84 154 L78 148 L90 136 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M176 32 L188 44 L182 50 L170 38 Z" fill="${C.light}"/>
    <path d="M108 40 L160 58 V96 C160 124 138 140 116 148 C94 140 72 124 72 96 V58 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" opacity="0.92"/>
    <path d="M116 62 L116 124 M94 88 H138" stroke="${C.light}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>`;
}

// 盾刃横扫：盾牌带横向弧形挥砍轨迹（attack）
function shieldSweep(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M44 138 C96 108 168 108 214 142" stroke="${C.light}" stroke-width="9" stroke-linecap="round" fill="none" opacity="0.85"/>
    <path d="M50 150 C100 122 166 122 208 152" stroke="${C.main}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.6"/>
    <path d="M128 34 L182 52 V96 C182 126 158 144 128 152 C98 144 74 126 74 96 V52 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M104 62 H152 M128 58 V120" stroke="${C.light}" stroke-width="7" stroke-linecap="round"/>`;
}

// 挑衅架势：盾牌 + 怒吼弧线（defense）
function taunt(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M52 60 C40 78 40 114 52 132 M204 60 C216 78 216 114 204 132" stroke="${C.main}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.55"/>
    <path d="M128 32 L184 52 V102 C184 134 158 154 128 164 C98 154 72 134 72 102 V52 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="128" cy="96" r="22" fill="none" stroke="${C.light}" stroke-width="6"/>
    <path d="M128 80 V112 M112 96 H144" stroke="${C.light}" stroke-width="6" stroke-linecap="round"/>`;
}

// 盾墙推进：两面交叠盾牌（defense）
function shieldWall(C) {
  return `
    <circle cx="128" cy="94" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M104 38 L150 54 V96 C150 122 130 138 110 146 C90 138 70 122 70 96 V54 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5" opacity="0.85"/>
    <path d="M150 44 L196 60 V102 C196 128 176 144 156 152 C136 144 116 128 116 102 V60 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M156 70 L156 126 M134 96 H178" stroke="${C.light}" stroke-width="6" stroke-linecap="round"/>`;
}

// 堡垒誓约：盾牌 + 城垛/誓约光环（defense）
function fortress(C) {
  return `
    <circle cx="128" cy="94" r="76" fill="${C.main}" opacity="0.14"/>
    <circle cx="128" cy="96" r="66" fill="none" stroke="${C.main}" stroke-width="3" stroke-dasharray="8 8" opacity="0.5"/>
    <path d="M88 48 V36 H104 V48 H120 V36 H136 V48 H152 V36 H168 V48 V60 H88 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4"/>
    <path d="M88 60 H168 V112 C168 138 148 154 128 162 C108 154 88 138 88 112 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <path d="M128 78 L128 138 M108 104 H148" stroke="${C.light}" stroke-width="7" stroke-linecap="round"/>`;
}

module.exports = {
  ironwall_bash_1: bash,
  ironwall_retaliate: retaliate,
  ironwall_sweep: shieldSweep, // 盾刃横扫
  ironwall_taunt: taunt,
  ironwall_shield_wall: shieldWall,
  ironwall_oath: fortress, // 堡垒誓约
};
