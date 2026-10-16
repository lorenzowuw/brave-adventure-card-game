import fs from 'node:fs';

const charactersPath = 'src/data/characters.json';
const skillsPath = 'src/data/skills.json';
const enemiesPath = 'src/data/enemies.json';

const characters = JSON.parse(fs.readFileSync(charactersPath, 'utf8'));
const skills = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
const enemies = JSON.parse(fs.readFileSync(enemiesPath, 'utf8'));

for (const character of characters) {
  if (character.id === 'developer') {
    character.baseHp = 666;
    character.baseEnergy = 998;
    continue;
  }
  character.baseHp = Math.max(10, Math.round(character.baseHp * 2 / 3));
  character.baseEnergy = Math.max(3, character.baseEnergy - 1);
}

function inferSkillTags(skill) {
  const text = `${skill.id} ${skill.name} ${skill.description} ${skill.flavorText}`;
  const tags = new Set(skill.tags ?? []);
  if (/fire|flame|炎|火|焰|灼|燃|地狱/.test(text)) tags.add('fire');
  if (/frost|ice|冰|霜|寒|冻|雪/.test(text)) tags.add('ice');
  if (/holy|light|圣|光|审判/.test(text)) tags.add('holy');
  if (/shadow|暗影|夜幕|背刺|烟幕/.test(text)) tags.add('shadow');
  if (/undead|亡灵|死亡|灵魂|诅咒|汲取|收割/.test(text)) tags.add('death');
  if (/poison|毒|中毒/.test(text) || skill.effect?.applyStatus?.type === 'poison') tags.add('poison');
  if (/bleed|流血|撕裂|斩|刃|刺/.test(text) || skill.effect?.applyStatus?.type === 'bleed') tags.add('bleed');
  if (/破甲|粉碎|重武器|盾牌|盾|猛击|护盾|甲/.test(text) || skill.effect?.armor) tags.add('armor_break');
  if (/太极|拳|掌|格斗|连击|碎骨/.test(text)) tags.add('martial');
  if (/金币|财富|商|悬赏|投资|交易|雇佣/.test(text)) tags.add('coin');
  if (/生命|自然|回春|藤蔓|荆棘|种子|再生/.test(text)) tags.add('nature');
  if (skill.type === 'attack' && tags.size === 0) tags.add('physical');
  skill.tags = [...tags];
}

for (const skill of skills) inferSkillTags(skill);

const ecology = {
  forest_wolf: {
    traits: ['beast', 'forest'], weaknesses: ['bleed', 'fire'], resistances: ['poison'],
    traitHints: ['野兽会连续撕咬，流血和火焰能快速压低血量。'],
    intents: [
      { type: 'attack', value: 5, description: '撕咬', applyStatus: { type: 'bleed', value: 1, duration: 2 } },
      { type: 'attack', value: 6, description: '扑咬' },
      { type: 'defense', value: 3, description: '警戒' },
    ],
  },
  forest_treant: {
    traits: ['plant', 'forest'], weaknesses: ['fire', 'armor_break'], resistances: ['poison', 'nature'],
    traitHints: ['植物会回复和叠甲，火焰技能能造成双倍伤害。'],
    intents: [
      { type: 'defense', value: 6, description: '树皮硬化' },
      { type: 'attack', value: 8, description: '枝干横扫', applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
      { type: 'buff', value: 5, description: '自然回复', applyStatus: { type: 'regen', value: 2, duration: 2 }, target: 'enemy' },
    ],
  },
  forest_shadow: {
    traits: ['beast', 'shadow'], weaknesses: ['holy', 'fire'], resistances: ['shadow'],
    traitHints: ['暗影生物会施加虚弱，圣光和火焰能克制它。'],
    intents: [
      { type: 'attack', value: 8, description: '暗影突袭', applyStatus: { type: 'weak', value: 1, duration: 2 } },
      { type: 'debuff', value: 2, description: '暗影缠绕', applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
      { type: 'attack', value: 10, description: '致命扑击', applyStatus: { type: 'bleed', value: 2, duration: 2 } },
    ],
  },
  boss_tree_king: {
    traits: ['plant', 'boss', 'forest'], weaknesses: ['fire', 'armor_break'], resistances: ['poison', 'nature'],
    traitHints: ['树精之王会再生和缠绕，火焰牌是最有效的突破口。'],
  },
  ruins_golem: {
    traits: ['construct', 'ruins'], weaknesses: ['armor_break', 'lightning'], resistances: ['poison', 'bleed'],
    traitHints: ['构装体不怕流血和毒，破甲技能更有效。'],
    intents: [
      { type: 'attack', value: 6, description: '石拳' },
      { type: 'defense', value: 6, description: '石化' },
      { type: 'debuff', value: 0, description: '机关震荡', applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
    ],
  },
  ruins_ghost: {
    traits: ['undead', 'spirit', 'ruins'], weaknesses: ['holy', 'fire'], resistances: ['bleed', 'poison'],
    traitHints: ['幽灵会绕过防御施加虚弱，圣光技能最稳定。'],
    intents: [
      { type: 'attack', value: 7, description: '灵魂冲击', applyStatus: { type: 'weak', value: 1, duration: 2 } },
      { type: 'debuff', value: 3, description: '虚弱诅咒', applyStatus: { type: 'weak', value: 2, duration: 2 } },
      { type: 'attack', value: 9, description: '怨灵附体', applyStatus: { type: 'fragile', value: 2, duration: 2 } },
    ],
  },
  boss_ruins_watcher: {
    traits: ['construct', 'undead', 'boss', 'ruins'], weaknesses: ['holy', 'armor_break'], resistances: ['poison', 'bleed'],
    traitHints: ['遗迹守灵兼具机关与亡灵特性，破甲和圣光能突破。'],
  },
  flame_imp: {
    traits: ['demon', 'fire'], weaknesses: ['ice'], resistances: ['fire', 'burn'],
    traitHints: ['火魔抗火但怕冰，拖久会被灼烧消耗。'],
    intents: [
      { type: 'attack', value: 6, description: '火球', applyStatus: { type: 'burn', value: 2, duration: 2 } },
      { type: 'buff', value: 0, description: '火苗暴涨', applyStatus: { type: 'empower', value: 15, duration: 1 }, target: 'enemy' },
    ],
  },
  flame_lava_beast: {
    traits: ['beast', 'fire'], weaknesses: ['ice', 'armor_break'], resistances: ['fire', 'bleed'],
    traitHints: ['熔岩兽护甲高且抗火，冰霜与破甲是关键。'],
    intents: [
      { type: 'attack', value: 10, description: '熔岩吐息', applyStatus: { type: 'burn', value: 3, duration: 2 } },
      { type: 'defense', value: 7, description: '岩浆护甲' },
      { type: 'attack', value: 12, description: '烈焰冲撞' },
    ],
  },
  boss_flame_lord: {
    traits: ['demon', 'fire', 'boss'], weaknesses: ['ice'], resistances: ['fire', 'burn'],
    traitHints: ['炎魔领主几乎不怕火焰，冰霜牌能造成双倍伤害。'],
  },
  frost_wraith: {
    traits: ['undead', 'frost'], weaknesses: ['fire', 'holy'], resistances: ['ice'],
    traitHints: ['冰霜怨灵抗冰，火焰技能会造成双倍伤害。'],
    intents: [
      { type: 'attack', value: 5, description: '寒冰刺', applyStatus: { type: 'weak', value: 1, duration: 2 } },
      { type: 'debuff', value: 2, description: '冰冻', applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
    ],
  },
  boss_frost_dragon: {
    traits: ['dragon', 'frost', 'boss'], weaknesses: ['fire'], resistances: ['ice', 'weak'],
    traitHints: ['冰霜巨龙抗冰，火焰技能会造成双倍伤害。'],
  },
  boss_chaos_lord: {
    traits: ['chaos', 'boss'], weaknesses: ['holy'], resistances: ['shadow', 'poison'],
    traitHints: ['混沌之主状态复杂，圣光技能能稳定压制。'],
  },
};

for (const enemy of enemies) {
  const patch = ecology[enemy.id];
  if (patch) Object.assign(enemy, patch);
}

fs.writeFileSync(charactersPath, `${JSON.stringify(characters, null, 2)}\n`);
fs.writeFileSync(skillsPath, `${JSON.stringify(skills, null, 2)}\n`);
fs.writeFileSync(enemiesPath, `${JSON.stringify(enemies, null, 2)}\n`);
console.log('patched monster ecosystem');
