import fs from 'node:fs';
import path from 'node:path';

const skills = JSON.parse(fs.readFileSync('src/data/skills.json', 'utf8'));
const characters = JSON.parse(fs.readFileSync('src/data/characters.json', 'utf8'));
const outDir = path.resolve('public/assets/skill_icons');

const characterColors = new Map(characters.map(character => [character.id, character.mainColor]));

const typeAccents = {
  attack: '#ff4d3d',
  defense: '#4aa3ff',
  heal: '#42e37a',
  buff: '#ffd447',
  debuff: '#9b59ff',
  economy: '#f1c40f',
  special: '#ffffff',
};

const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}[char]));

function effectScene(skill, color, accent) {
  const { effect, type } = skill;
  if (effect.damage && effect.armor) return shieldBash(color, accent);
  if (effect.damageMultiplier || /连|乱舞|拳|斩|刺|击|破|处决/.test(skill.name)) return attackSlash(color, accent);
  if (effect.damage && effect.applyStatus?.type === 'poison') return poisonStrike(color, accent);
  if (effect.damage && effect.applyStatus?.type === 'burn') return fireStrike(color, accent);
  if (effect.damage && /冰|霜|寒|冻/.test(skill.name)) return frostCast(color, accent);
  if (effect.damage) return attackSlash(color, accent);
  if (effect.heal) return healCast(color, accent);
  if (effect.armor) return guardPose(color, accent);
  if (effect.goldGain || effect.goldCost || type === 'economy') return coinTrick(color, accent);
  if (effect.drawCards || effect.energyGain || type === 'buff') return powerUp(color, accent);
  if (effect.applyStatus || type === 'debuff') return curseCast(color, accent);
  return powerUp(color, accent);
}

function stickman(color, x = 112, y = 62, scale = 1) {
  const s = scale;
  return `
    <circle cx="${x}" cy="${y}" r="${13 * s}" fill="#151515" stroke="${color}" stroke-width="${5 * s}"/>
    <path d="M${x} ${y + 15 * s} L${x} ${y + 64 * s}" stroke="#161616" stroke-width="${8 * s}" stroke-linecap="round"/>
    <path d="M${x} ${y + 30 * s} L${x - 34 * s} ${y + 52 * s} M${x} ${y + 30 * s} L${x + 38 * s} ${y + 40 * s}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
    <path d="M${x} ${y + 64 * s} L${x - 28 * s} ${y + 106 * s} M${x} ${y + 64 * s} L${x + 34 * s} ${y + 102 * s}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
  `;
}

function burst(accent) {
  return `
    <path d="M128 18 L137 54 L173 36 L151 70 L190 78 L151 91 L176 128 L137 106 L128 146 L119 107 L80 128 L105 91 L66 78 L105 70 L83 36 L119 54 Z" fill="${accent}" opacity="0.22"/>
    <path d="M30 32 L74 56 M25 98 L76 88 M182 28 L150 58 M208 98 L158 88" stroke="${accent}" stroke-width="5" stroke-linecap="round" opacity="0.65"/>
  `;
}

function attackSlash(color, accent) {
  return `
    ${burst(accent)}
    <path d="M61 151 C108 57 145 28 205 18" stroke="#fff6cf" stroke-width="10" stroke-linecap="round" opacity="0.95"/>
    <path d="M56 162 C108 72 151 45 213 35" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
    ${stickman(color, 108, 60)}
  `;
}

function shieldBash(color, accent) {
  return `
    ${burst(accent)}
    <path d="M61 68 L93 52 L121 69 L115 124 L91 145 L67 124 Z" fill="#202735" stroke="${accent}" stroke-width="6"/>
    <path d="M66 102 L117 87" stroke="#fff6cf" stroke-width="5" stroke-linecap="round"/>
    ${stickman(color, 133, 58)}
  `;
}

function guardPose(color, accent) {
  return `
    <path d="M42 36 H214 V170 H42 Z" fill="#0d1320" stroke="${accent}" stroke-width="5" opacity="0.78"/>
    <path d="M64 58 H192 V148 H64 Z" fill="none" stroke="#fff6cf" stroke-width="4" opacity="0.45"/>
    ${stickman(color, 128, 62)}
  `;
}

function healCast(color, accent) {
  return `
    <circle cx="128" cy="96" r="78" fill="${accent}" opacity="0.18"/>
    <path d="M128 42 V82 M108 62 H148" stroke="#f6ffe8" stroke-width="11" stroke-linecap="round"/>
    <path d="M67 53 C42 82 48 132 87 151 M189 53 C214 82 208 132 169 151" stroke="${accent}" stroke-width="6" fill="none" opacity="0.8"/>
    ${stickman(color, 128, 72)}
  `;
}

function powerUp(color, accent) {
  return `
    <path d="M128 24 L146 79 H176 L132 174 L141 111 H105 Z" fill="${accent}" opacity="0.75"/>
    <circle cx="128" cy="101" r="70" fill="none" stroke="#fff6cf" stroke-width="4" stroke-dasharray="10 10" opacity="0.55"/>
    ${stickman(color, 128, 70)}
  `;
}

function curseCast(color, accent) {
  return `
    <path d="M168 46 C199 53 210 84 195 111 C181 135 149 133 137 106 C126 78 140 52 168 46 Z" fill="${accent}" opacity="0.28"/>
    <path d="M176 64 L160 91 L187 88 L168 122" stroke="${accent}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M43 54 C74 47 91 67 84 98" stroke="#fff6cf" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.7"/>
    ${stickman(color, 103, 67)}
  `;
}

function coinTrick(color, accent) {
  return `
    <circle cx="176" cy="67" r="23" fill="${accent}" stroke="#fff6cf" stroke-width="5"/>
    <circle cx="196" cy="105" r="17" fill="${accent}" stroke="#fff6cf" stroke-width="4" opacity="0.88"/>
    <path d="M170 66 H182 M196 96 V114" stroke="#352000" stroke-width="4" stroke-linecap="round"/>
    <path d="M52 140 C86 120 124 119 164 141" stroke="${accent}" stroke-width="7" stroke-linecap="round" fill="none"/>
    ${stickman(color, 105, 66)}
  `;
}

function poisonStrike(color, accent) {
  return `
    <path d="M158 34 C203 72 203 124 164 151" stroke="#71ff65" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.55"/>
    <circle cx="184" cy="77" r="9" fill="#71ff65" opacity="0.8"/>
    <circle cx="196" cy="113" r="6" fill="#71ff65" opacity="0.7"/>
    ${attackSlash(color, accent)}
  `;
}

function fireStrike(color, accent) {
  return `
    <path d="M177 37 C153 70 207 78 170 129 C221 100 211 54 177 37 Z" fill="#ff7a1a" opacity="0.65"/>
    <path d="M184 64 C171 82 193 94 174 118" stroke="#fff6cf" stroke-width="5" stroke-linecap="round"/>
    ${attackSlash(color, accent)}
  `;
}

function frostCast(color, accent) {
  return `
    <path d="M176 43 V126 M138 64 L214 106 M214 64 L138 106" stroke="#bff6ff" stroke-width="7" stroke-linecap="round" opacity="0.82"/>
    <circle cx="176" cy="85" r="42" fill="#69d5ff" opacity="0.16"/>
    ${stickman(color, 99, 70)}
  `;
}

function svgForSkill(skill) {
  const color = characterColors.get(skill.characterBind) ?? '#ffd447';
  const accent = typeAccents[skill.type] ?? color;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="192" viewBox="0 0 256 192" role="img" aria-label="${escapeXml(skill.name)}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#2a241d"/>
      <stop offset="62%" stop-color="#15151d"/>
      <stop offset="100%" stop-color="#08080c"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2.6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="256" height="192" rx="24" fill="url(#bg)"/>
  <path d="M18 153 C73 129 171 130 238 154" stroke="#000" stroke-width="18" opacity="0.42" fill="none"/>
  <g filter="url(#glow)">
    ${effectScene(skill, color, accent)}
  </g>
  <text x="128" y="181" fill="#fff4cc" font-family="Microsoft YaHei, Noto Sans SC, sans-serif" font-size="18" font-weight="700" text-anchor="middle" paint-order="stroke" stroke="#000" stroke-width="4">${escapeXml(skill.name)}</text>
</svg>`;
}

for (const skill of skills) {
  fs.writeFileSync(path.join(outDir, `${skill.id}.svg`), svgForSkill(skill), 'utf8');
}

console.log(`Generated ${skills.length} skill art files in ${outDir}`);
