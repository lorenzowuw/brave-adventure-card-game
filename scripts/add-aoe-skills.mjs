import fs from 'node:fs';

const path = 'src/data/skills.json';
const skills = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = new Map(skills.map(s => [s.id, s]));

function addSkill(skill) {
  if (!byId.has(skill.id)) {
    skills.push(skill);
    byId.set(skill.id, skill);
  }
}

const aoeSkills = [
  {
    id: 'ironwall_sweep', name: '盾刃横扫', tier: 1, rarity: 'green', cost: 2, type: 'attack',
    effect: { damage: 5, damageToAll: 3, armor: 4 }, description: '造成5点伤害，群体造成3点伤害，获得4点护甲。',
    upgradeTo: null, characterBind: 'ironwall', flavorText: '盾面横推，兽群退散。', tags: ['armor_break', 'aoe']
  },
  {
    id: 'lifesage_spore_burst', name: '孢子爆发', tier: 1, rarity: 'green', cost: 2, type: 'attack',
    effect: { damageToAll: 5, applyStatus: { type: 'weak', value: 1, duration: 2 } }, description: '群体造成5点伤害，施加虚弱2回合。',
    upgradeTo: null, characterBind: 'lifesage', flavorText: '自然扩散，从不只命中一个目标。', tags: ['nature', 'aoe']
  },
  {
    id: 'taichimonk_qi_wave', name: '气浪震荡', tier: 1, rarity: 'green', cost: 2, type: 'attack',
    effect: { damage: 4, damageToAll: 4, armor: 3 }, description: '造成4点伤害，群体造成4点伤害，获得3点护甲。',
    upgradeTo: null, characterBind: 'taichimonk', flavorText: '一掌推出，余波成环。', tags: ['martial', 'aoe']
  },
  {
    id: 'rangermerchant_scattershot', name: '散射悬赏', tier: 1, rarity: 'green', cost: 2, type: 'attack',
    effect: { damageToAll: 4, goldGain: 3 }, description: '群体造成4点伤害，获得3金币。',
    upgradeTo: null, characterBind: 'rangermerchant', flavorText: '每个目标都有价码。', tags: ['coin', 'aoe']
  },
  {
    id: 'holylight_radiance', name: '圣光冲击', tier: 1, rarity: 'green', cost: 2, type: 'attack',
    effect: { damageToAll: 6, heal: 3 }, description: '群体造成6点伤害，恢复3点生命。',
    upgradeTo: null, characterBind: 'holylight', flavorText: '光辉扫过阴影。', tags: ['holy', 'aoe']
  },
  {
    id: 'elementmage_flame_ring', name: '烈焰环', tier: 1, rarity: 'green', cost: 2, type: 'attack',
    effect: { damageToAll: 7, applyStatus: { type: 'burn', value: 1, duration: 2 } }, description: '群体造成7点伤害，施加灼烧2回合。',
    upgradeTo: null, characterBind: 'elementmage', flavorText: '火焰从中心向外扩散。', tags: ['fire', 'aoe']
  },
  {
    id: 'frostpriest_ice_field', name: '冰霜领域', tier: 1, rarity: 'green', cost: 2, type: 'attack',
    effect: { damageToAll: 5, applyStatus: { type: 'weak', value: 1, duration: 2 } }, description: '群体造成5点伤害，施加虚弱2回合。',
    upgradeTo: null, characterBind: 'frostpriest', flavorText: '寒意覆盖整个战场。', tags: ['ice', 'aoe']
  },
  {
    id: 'thornguardian_thorn_bloom', name: '荆棘绽放', tier: 1, rarity: 'green', cost: 2, type: 'attack',
    effect: { damageToAll: 5, armor: 5 }, description: '群体造成5点伤害，获得5点护甲。',
    upgradeTo: null, characterBind: 'thornguardian', flavorText: '荆棘开花，群敌皆伤。', tags: ['nature', 'aoe']
  }
];

for (const skill of aoeSkills) addSkill(skill);

fs.writeFileSync(path, `${JSON.stringify(skills, null, 2)}\n`);
console.log('added aoe skills');
