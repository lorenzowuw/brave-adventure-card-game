import fs from 'node:fs';

const skillsPath = 'src/data/skills.json';
const enemiesPath = 'src/data/enemies.json';
const skills = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
const enemies = JSON.parse(fs.readFileSync(enemiesPath, 'utf8'));

const skillPatch = {
  shadowblade_strike_1: {
    effect: { damage: 6 },
    description: '造成6点伤害。',
  },
  shadowblade_strike_2: {
    effect: { damage: 9 },
    description: '造成9点伤害。',
  },
  shadowblade_strike_3: {
    cost: 2,
    effect: { damage: 18, applyStatus: { type: 'bleed', value: 4, duration: 2 } },
    description: '造成18点伤害，施加流血2回合。',
  },
  shadowblade_twin: {
    effect: { damage: 4, drawCards: 1 },
    description: '造成4点伤害，抽1张牌。',
  },
  shadowblade_flurry: {
    effect: { damage: 18, applyStatus: { type: 'bleed', value: 3, duration: 3 } },
    description: '造成18点伤害，施加流血3回合。',
  },
  lifesage_heal_3: {
    effect: { heal: 16, armor: 8, applyStatus: { type: 'regen', value: 3, duration: 2, target: 'player' } },
    description: '恢复16点生命，获得8点护甲，自身再生2回合。',
  },
  lifesage_vine: {
    effect: { damage: 8, applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
    description: '造成8点伤害，施加麻痹1回合。',
  },
  lifesage_seed: {
    effect: { heal: 14, energyGain: 1, applyStatus: { type: 'regen', value: 4, duration: 2, target: 'player' } },
    description: '恢复14点生命，获得1点能量，自身再生2回合。',
  },
  taichimonk_palm_3: {
    effect: { damage: 16, armor: 8, applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
    description: '造成16点伤害，获得8点护甲，施加麻痹1回合。',
  },
  taichimonk_qi: {
    effect: { damage: 10, applyStatus: { type: 'weak', value: 2, duration: 2 } },
    description: '造成10点伤害，施加虚弱2回合。',
  },
  rangermerchant_bounty_3: {
    effect: { damage: 16, goldGain: 10 },
    description: '造成16点伤害，获得10金币。',
  },
  rangermerchant_trap: {
    effect: { damage: 9, applyStatus: { type: 'bleed', value: 3, duration: 3 } },
    description: '造成9点伤害，施加流血3回合。',
  },
  holylight_strike_1: {
    effect: { damage: 5 },
    description: '造成5点伤害。',
  },
  holylight_strike_2: {
    effect: { damage: 8 },
    description: '造成8点伤害。',
  },
  holylight_wrath: {
    effect: { damage: 12, heal: 6, applyStatus: { type: 'fragile', value: 3, duration: 2 } },
    description: '造成12点伤害，恢复6点生命，施加脆弱2回合。',
  },
  wealth_critical: {
    effect: { damage: 3, goldGain: 4 },
    description: '造成3点伤害，获得4金币。',
  },
  wealth_lucky: {
    effect: { goldGain: 12, drawCards: 2, applyStatus: { type: 'empower', value: 25, duration: 1, target: 'player' } },
    description: '抽2张牌，获得12金币，自身强化1回合。',
  },
  undead_curse: {
    effect: { damage: 4, applyStatus: { type: 'weak', value: 3, duration: 3 } },
    description: '造成4点伤害，施加虚弱3回合。',
  },
  armor_breaker_1: {
    effect: { damage: 5 },
    description: '造成5点伤害。',
  },
  armor_breaker_2: {
    effect: { damage: 8, applyStatus: { type: 'fragile', value: 2, duration: 2 } },
    description: '造成8点伤害，施加脆弱2回合。',
  },
  armor_heavy: {
    effect: { damage: 10, applyStatus: { type: 'fragile', value: 2, duration: 2 } },
    description: '造成10点伤害，施加脆弱2回合。',
  },
  armor_true: {
    effect: { damage: 18, applyStatus: { type: 'bleed', value: 4, duration: 2 } },
    description: '造成18点伤害，施加流血2回合。',
  },
  armor_berserk: {
    effect: { energyGain: 2, applyStatus: { type: 'empower', value: 20, duration: 1, target: 'player' } },
    description: '获得2点能量，自身强化1回合。',
  },
  element_fireball_1: {
    effect: { damage: 6 },
    description: '造成6点伤害。',
  },
  element_frost: {
    effect: { damage: 7, applyStatus: { type: 'weak', value: 2, duration: 2 } },
    description: '造成7点伤害，施加虚弱2回合。',
  },
  element_lightning: {
    effect: { damage: 5, applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
    description: '造成5点伤害，施加麻痹1回合。',
  },
  element_fusion: {
    effect: { damage: 16, applyStatus: { type: 'burn', value: 4, duration: 3 } },
    description: '造成16点伤害，施加灼烧3回合。',
  },
  omnisage_copy_2: {
    effect: { drawCards: 2, applyStatus: { type: 'empower', value: 10, duration: 1, target: 'player' } },
    description: '抽2张牌，自身强化1回合。',
  },
  omnisage_copy_3: {
    effect: { drawCards: 4, energyGain: 1 },
    description: '抽4张牌，获得1点能量。',
  },
  omnisage_strike: {
    effect: { damage: 6 },
    description: '造成6点伤害。',
  },
  combatmaster_combo_1: {
    effect: { damage: 4, damageMultiplier: 2 },
    description: '造成4点伤害，连击2次。',
  },
  combatmaster_combo_2: {
    effect: { damage: 5, damageMultiplier: 2 },
    description: '造成5点伤害，连击2次。',
  },
  combatmaster_combo_3: {
    effect: { damage: 7, damageMultiplier: 3, applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
    description: '造成7点伤害，连击3次，施加麻痹1回合。',
  },
  combatmaster_spirit: {
    effect: { drawCards: 2, applyStatus: { type: 'empower', value: 25, duration: 1, target: 'player' } },
    description: '抽2张牌，自身强化1回合。',
  },
  combatmaster_burst: {
    effect: { damage: 16, armor: 5, applyStatus: { type: 'empower', value: 20, duration: 1, target: 'player' } },
    description: '造成16点伤害，获得5点护甲，自身强化1回合。',
  },
  frostpriest_freeze_2: {
    effect: { damage: 6, applyStatus: { type: 'weak', value: 3, duration: 2 } },
    description: '造成6点伤害，施加虚弱2回合。',
  },
  frostpriest_freeze_3: {
    effect: { damage: 10, applyStatus: { type: 'weak', value: 5, duration: 3 } },
    description: '造成10点伤害，施加虚弱3回合。',
  },
  frostpriest_fury: {
    effect: { energyGain: 2, applyStatus: { type: 'empower', value: 25, duration: 1, target: 'player' } },
    description: '获得2点能量，自身强化1回合。',
  },
  frostpriest_blizzard: {
    effect: { damage: 14, applyStatus: { type: 'weak', value: 4, duration: 3 } },
    description: '造成14点伤害，虚弱4层持续3回合。',
  },
  thornguardian_thorn_1: {
    effect: { armor: 4, applyStatus: { type: 'fragile', value: 1, duration: 2 } },
    description: '获得4点护甲，施加脆弱2回合。',
  },
  thornguardian_bloodpact: {
    effect: { armor: 8, applyStatus: { type: 'regen', value: 2, duration: 2, target: 'player' } },
    description: '获得8点护甲，自身再生2回合。',
  },
  thornguardian_leech: {
    effect: { damage: 8, heal: 6, applyStatus: { type: 'bleed', value: 2, duration: 3 } },
    description: '造成8点伤害，恢复6点生命，施加流血3回合。',
  },
  generic_draw_potion: {
    effect: { drawCards: 2, energyGain: 1 },
    description: '抽2张牌，获得1点能量。',
  },
  generic_energy_potion: {
    effect: { energyGain: 2, applyStatus: { type: 'empower', value: 10, duration: 1, target: 'player' } },
    description: '获得2点能量，自身强化1回合。',
  },
};

for (const skill of skills) {
  const patch = skillPatch[skill.id];
  if (!patch) continue;
  Object.assign(skill, patch);
}

const enemyPatch = {
  boss_tree_king: {
    intents: [
      { type: 'attack', value: 8, description: '藤蔓鞭击', applyStatus: { type: 'bleed', value: 2, duration: 2 } },
      { type: 'buff', value: 7, description: '森林再生', applyStatus: { type: 'regen', value: 3, duration: 2 }, target: 'enemy' },
      { type: 'attack', value: 12, description: '万木齐鸣' },
      { type: 'debuff', value: 0, description: '根须缠绕', applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
    ],
    phaseIntents: [
      { type: 'attack', value: 13, description: '狂暴生长', applyStatus: { type: 'bleed', value: 3, duration: 2 } },
      { type: 'attack', value: 15, description: '根须绞杀', applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
      { type: 'buff', value: 10, description: '生命汲取', applyStatus: { type: 'regen', value: 4, duration: 2 }, target: 'enemy' },
      { type: 'summon', value: 2, description: '召唤树精' },
    ],
  },
  boss_ruins_watcher: {
    intents: [
      { type: 'attack', value: 9, description: '机关利刃', applyStatus: { type: 'bleed', value: 2, duration: 2 } },
      { type: 'buff', value: 5, description: '符文充能' },
      { type: 'debuff', value: 3, description: '亡魂诅咒', applyStatus: { type: 'weak', value: 2, duration: 2 } },
      { type: 'attack', value: 14, description: '亡魂风暴' },
    ],
    phaseIntents: [
      { type: 'debuff', value: 4, description: '灵魂撕裂', applyStatus: { type: 'fragile', value: 3, duration: 2 } },
      { type: 'attack', value: 16, description: '最终审判', applyStatus: { type: 'weak', value: 3, duration: 2 } },
      { type: 'summon', value: 2, description: '召唤石像兵' },
    ],
  },
  boss_flame_lord: {
    intents: [
      { type: 'attack', value: 10, description: '烈焰鞭', applyStatus: { type: 'burn', value: 3, duration: 2 } },
      { type: 'buff', value: 6, description: '地狱之火', applyStatus: { type: 'empower', value: 20, duration: 1 }, target: 'enemy' },
      { type: 'attack', value: 16, description: '流星火山', applyStatus: { type: 'burn', value: 4, duration: 2 } },
    ],
    phaseIntents: [
      { type: 'attack', value: 18, description: '焚天灭地', applyStatus: { type: 'burn', value: 5, duration: 3 } },
      { type: 'debuff', value: 5, description: '灼热之息', applyStatus: { type: 'weak', value: 2, duration: 2 } },
      { type: 'attack', value: 20, description: '末日烈焰', applyStatus: { type: 'burn', value: 6, duration: 2 } },
    ],
  },
  boss_frost_dragon: {
    intents: [
      { type: 'attack', value: 12, description: '龙息', applyStatus: { type: 'weak', value: 2, duration: 2 } },
      { type: 'buff', value: 6, description: '冰鳞护甲' },
      { type: 'attack', value: 15, description: '尾扫', applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
    ],
    phaseIntents: [
      { type: 'attack', value: 18, description: '极寒风暴', applyStatus: { type: 'weak', value: 4, duration: 2 } },
      { type: 'debuff', value: 4, description: '深度冻结', applyStatus: { type: 'paralyze', value: 1, duration: 1 } },
      { type: 'attack', value: 22, description: '龙息·极', applyStatus: { type: 'weak', value: 5, duration: 2 } },
    ],
  },
  boss_chaos_lord: {
    intents: [
      { type: 'attack', value: 14, description: '混沌之触', applyStatus: { type: 'poison', value: 3, duration: 2 } },
      { type: 'buff', value: 8, description: '虚空之力', applyStatus: { type: 'empower', value: 25, duration: 1 }, target: 'enemy' },
      { type: 'attack', value: 18, description: '法则崩坏', applyStatus: { type: 'fragile', value: 3, duration: 2 } },
      { type: 'debuff', value: 5, description: '精神侵蚀', applyStatus: { type: 'weak', value: 3, duration: 2 } },
    ],
    phaseIntents: [
      { type: 'attack', value: 22, description: '混沌降临', applyStatus: { type: 'burn', value: 4, duration: 2 } },
      { type: 'attack', value: 25, description: '虚空湮灭', applyStatus: { type: 'fragile', value: 4, duration: 2 } },
      { type: 'buff', value: 10, description: '混沌再生', applyStatus: { type: 'regen', value: 5, duration: 2 }, target: 'enemy' },
      { type: 'summon', value: 3, description: '召唤暗影', applyStatus: { type: 'weak', value: 2, duration: 2 } },
    ],
  },
};

for (const enemy of enemies) {
  const patch = enemyPatch[enemy.id];
  if (!patch) continue;
  Object.assign(enemy, patch);
}

fs.writeFileSync(skillsPath, `${JSON.stringify(skills, null, 2)}\n`);
fs.writeFileSync(enemiesPath, `${JSON.stringify(enemies, null, 2)}\n`);
console.log('patched skills and enemies');
