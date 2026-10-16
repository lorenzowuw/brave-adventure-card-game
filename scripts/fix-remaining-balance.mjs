import fs from 'node:fs';

const skillsPath = 'src/data/skills.json';
const skills = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
const patches = {
  ironwall_bash_3: {
    effect: { damage: 14, armor: 10 },
    description: '造成14点伤害，获得10点护甲。',
  },
  armor_breaker_3: {
    effect: { damage: 14, applyStatus: { type: 'fragile', value: 3, duration: 2 } },
    description: '造成14点伤害，施加脆弱2回合。',
  },
  omnisage_copy_3: {
    effect: { drawCards: 4, energyGain: 2 },
    description: '抽4张牌，获得2点能量。',
  },
  generic_draw_potion: {
    effect: { drawCards: 2, energyGain: 1, applyStatus: { type: 'empower', value: 10, duration: 1, target: 'player' } },
    description: '抽2张牌，获得1点能量，自身强化1回合。',
  },
};
for (const skill of skills) {
  if (patches[skill.id]) Object.assign(skill, patches[skill.id]);
}
fs.writeFileSync(skillsPath, `${JSON.stringify(skills, null, 2)}\n`);
console.log('fixed remaining balance issues');
