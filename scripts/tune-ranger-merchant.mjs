import fs from 'node:fs';

const path = 'src/data/skills.json';
const skills = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = new Map(skills.map(skill => [skill.id, skill]));

const patches = {
  rangermerchant_bounty_1: {
    effect: { damage: 3, goldGain: 3 },
    description: '造成3点伤害，获得3金币。',
    tags: ['coin', 'physical'],
  },
  rangermerchant_bounty_2: {
    effect: { damage: 8, goldGain: 6 },
    description: '造成8点伤害，获得6金币。',
    tags: ['coin', 'physical'],
  },
  rangermerchant_bounty_3: {
    effect: { damage: 18, goldGain: 12, applyStatus: { type: 'fragile', value: 2, duration: 2 } },
    description: '造成18点伤害，获得12金币，施加脆弱2回合。',
    tags: ['coin', 'physical'],
  },
  rangermerchant_hire: {
    effect: { goldCost: 5, damage: 13 },
    description: '消耗5金币，造成13点伤害。',
  },
  rangermerchant_guard: {
    effect: { goldCost: 3, armor: 10 },
    description: '消耗3金币，获得10点护甲。',
  },
  rangermerchant_trap: {
    effect: { damage: 10, applyStatus: { type: 'bleed', value: 4, duration: 3 } },
    description: '造成10点伤害，施加流血3回合。',
    tags: ['bleed', 'trap'],
  },
  rangermerchant_black_market: {
    effect: { goldCost: 8, drawCards: 3, energyGain: 1 },
    description: '消耗8金币，抽3张牌，获得1点能量。',
  },
  rangermerchant_scattershot: {
    effect: { damageToAll: 6, goldGain: 5 },
    description: '群体造成6点伤害，获得5金币。',
    tags: ['coin', 'aoe', 'physical'],
  },
};

for (const [id, patch] of Object.entries(patches)) {
  const skill = byId.get(id);
  if (skill) Object.assign(skill, patch);
}

const additions = [
  {
    id: 'rangermerchant_mark_prey',
    name: '标记猎物',
    tier: 1,
    rarity: 'white',
    cost: 0,
    type: 'debuff',
    effect: { applyStatus: { type: 'fragile', value: 2, duration: 2 }, goldGain: 2 },
    description: '施加脆弱2回合，获得2金币。',
    upgradeTo: null,
    characterBind: 'rangermerchant',
    flavorText: '先标价，再收割。',
    tags: ['coin', 'hunter'],
  },
  {
    id: 'rangermerchant_snare_line',
    name: '绊索陷阱',
    tier: 1,
    rarity: 'green',
    cost: 1,
    type: 'debuff',
    effect: { damage: 4, applyStatus: { type: 'paralyze', value: 1, duration: 1 }, goldGain: 3 },
    description: '造成4点伤害，施加麻痹1回合，获得3金币。',
    upgradeTo: null,
    characterBind: 'rangermerchant',
    flavorText: '野路子也是战术。',
    tags: ['coin', 'trap'],
  },
  {
    id: 'rangermerchant_hunter_volley',
    name: '猎手齐射',
    tier: 1,
    rarity: 'blue',
    cost: 2,
    type: 'attack',
    effect: { damage: 8, damageToAll: 5, goldGain: 6 },
    description: '造成8点伤害，群体造成5点伤害，获得6金币。',
    upgradeTo: null,
    characterBind: 'rangermerchant',
    flavorText: '一支箭给目标，余箭给兽群。',
    tags: ['coin', 'aoe', 'physical'],
  },
  {
    id: 'rangermerchant_bounty_contract',
    name: '赏金契约',
    tier: 1,
    rarity: 'purple',
    cost: 1,
    type: 'economy',
    effect: { goldCost: 6, drawCards: 2, applyStatus: { type: 'empower', value: 25, duration: 1, target: 'player' } },
    description: '消耗6金币，抽2张牌，自身强化1回合。',
    upgradeTo: null,
    characterBind: 'rangermerchant',
    flavorText: '签了契约，箭就会更准。',
    tags: ['coin', 'hunter'],
  },
];

for (const skill of additions) {
  if (!byId.has(skill.id)) skills.push(skill);
}

fs.writeFileSync(path, `${JSON.stringify(skills, null, 2)}\n`);
console.log('ranger merchant tuned');
