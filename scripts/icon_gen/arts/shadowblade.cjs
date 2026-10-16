// 暗影之刃 shadowblade：刺客。主色紫 #8E44AD。

// 背刺：单匕首向下突刺 + 暗影
function backstab(C) {
  return `
    <circle cx="128" cy="96" r="72" fill="${C.main}" opacity="0.12"/>
    <path d="M150 30 L162 42 L108 150 L96 162 L88 154 L100 142 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M150 30 L162 42 L156 48 L144 36 Z" fill="${C.light}"/>
    <path d="M118 120 L138 140 M108 130 L128 150" stroke="${C.main}" stroke-width="6" stroke-linecap="round"/>
    <path d="M60 60 C80 80 80 110 64 128" stroke="${C.main}" stroke-width="5" fill="none" opacity="0.5" stroke-linecap="round"/>`;
}

// 双刃连斩：两把交叉匕首
function twinBlade(C) {
  return `
    <circle cx="128" cy="96" r="72" fill="${C.main}" opacity="0.12"/>
    <path d="M70 36 L82 30 L168 142 L160 156 L150 150 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M186 36 L174 30 L88 142 L96 156 L106 150 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M70 36 L82 30 L88 38 L76 44 Z" fill="${C.light}"/>
    <path d="M186 36 L174 30 L168 38 L180 44 Z" fill="${C.light}"/>`;
}

// 淬毒刃：匕首 + 毒滴
function poisonBlade(C) {
  return `
    <circle cx="128" cy="96" r="72" fill="${C.main}" opacity="0.12"/>
    <path d="M128 26 L140 38 L140 130 L128 150 L116 130 L116 38 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M128 26 L140 38 L128 44 L116 38 Z" fill="${C.light}"/>
    <path d="M104 60 H152" stroke="${C.main}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="96" cy="120" r="9" fill="${C.light}" opacity="0.85"/>
    <circle cx="164" cy="106" r="7" fill="${C.light}" opacity="0.75"/>
    <path d="M96 130 C96 142 104 148 104 138 M164 114 C164 124 172 130 172 120" stroke="${C.main}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.7"/>`;
}

// 夜幕乱舞：多重匕首扇形挥砍
function flurry(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.12"/>
    <path d="M50 70 C100 50 156 50 206 70" stroke="${C.light}" stroke-width="6" fill="none" opacity="0.6" stroke-linecap="round"/>
    <path d="M44 110 C100 86 156 86 212 110" stroke="${C.main}" stroke-width="5" fill="none" opacity="0.5" stroke-linecap="round"/>
    <path d="M92 60 L100 56 L120 120 L112 128 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="3"/>
    <path d="M128 54 L136 54 L136 124 L128 132 L120 124 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="3"/>
    <path d="M164 60 L156 56 L136 120 L144 128 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="3"/>`;
}

// 烟幕步：烟雾云 + 闪现星点（buff）
function smoke(C) {
  return `
    <circle cx="128" cy="96" r="74" fill="${C.main}" opacity="0.14"/>
    <path d="M84 112 C68 112 60 96 74 88 C70 72 92 62 104 74 C114 60 142 62 148 78 C166 74 178 92 164 104 C172 120 152 136 138 126 C126 138 96 134 96 116 Z" fill="${C.deep}" stroke="${C.main}" stroke-width="5"/>
    <circle cx="110" cy="98" r="6" fill="${C.light}"/>
    <circle cx="146" cy="104" r="5" fill="${C.light}"/>
    <path d="M70 50 L78 62 M186 56 L176 66 M196 120 L184 124" stroke="${C.light}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>`;
}

module.exports = {
  shadowblade_strike_1: backstab,
  shadowblade_twin: twinBlade,
  shadowblade_poison: poisonBlade,
  shadowblade_flurry: flurry,
  shadowblade_smoke: smoke,
};
