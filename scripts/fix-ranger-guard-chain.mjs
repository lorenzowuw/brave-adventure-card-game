import fs from 'node:fs';

const path = 'src/data/skills.json';
const skills = JSON.parse(fs.readFileSync(path, 'utf8'));
const patch = {
  rangermerchant_guard_green: { effect: { goldCost: 3, armor: 13 }, description: '消耗3金币，获得13点护甲。' },
  rangermerchant_guard_green_blue: { effect: { goldCost: 3, armor: 19 }, description: '消耗3金币，获得19点护甲。' },
  rangermerchant_guard_green_blue_purple: { effect: { goldCost: 3, armor: 29 }, description: '消耗3金币，获得29点护甲。' },
  rangermerchant_guard_green_blue_purple_orange: { effect: { goldCost: 3, armor: 45 }, description: '消耗3金币，获得45点护甲。' },
  rangermerchant_guard_green_blue_purple_orange_red: { effect: { goldCost: 3, armor: 76 }, description: '消耗3金币，获得76点护甲。' },
};
for (const skill of skills) {
  if (patch[skill.id]) Object.assign(skill, patch[skill.id]);
}
fs.writeFileSync(path, `${JSON.stringify(skills, null, 2)}\n`);
console.log('fixed ranger guard chain');
