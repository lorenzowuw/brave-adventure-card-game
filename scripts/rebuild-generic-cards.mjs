/**
 * 重做通用卡体系：10条链 × 6稀有度 = 60张，全升级链
 * 运行: node scripts/rebuild-generic-cards.mjs
 */
import fs from 'fs';

const RARITIES = ['white', 'green', 'blue', 'purple', 'orange', 'red'];
const ZH_SUFFIX = ['', '·精进', '·卓越', '·史诗', '·传说', '·神话'];
const EN_SUFFIX = ['', ' Improved', ' Superior', ' Epic', ' Legendary', ' Mythic'];
const ID_SUFFIX = ['', '_green', '_blue', '_purple', '_orange', '_red'];

// 每条链：baseId（白卡id，起始牌保留原id）、基础名、英文名、type、cost、flavor、tags、
// stats[6] = 各稀有度 effect 片段（不含 applyStatus 的 target 等）
const CHAINS = [
  {
    baseId: 'generic_attack_1', zh: '基础打击', en: 'Basic Strike', type: 'attack', cost: 1,
    flavor: '最朴素，也最可靠。', flavor_en: 'The plainest, and the most reliable.', tags: [],
    stats: [{ damage: 6 }, { damage: 8 }, { damage: 12 }, { damage: 15 }, { damage: 20 }, { damage: 26 }],
    desc: e => [`造成${e.damage}点伤害。`, `Deal ${e.damage} damage.`],
  },
  {
    baseId: 'generic_block', zh: '基础格挡', en: 'Basic Block', type: 'defense', cost: 1,
    flavor: '挡住下一次危险。', flavor_en: 'Block the next danger.', tags: [],
    stats: [{ armor: 7 }, { armor: 9 }, { armor: 12 }, { armor: 15 }, { armor: 21 }, { armor: 28 }],
    desc: e => [`获得${e.armor}点护甲。`, `Gain ${e.armor} armor.`],
  },
  {
    baseId: 'generic_light_attack', zh: '轻巧打击', en: 'Light Strike', type: 'attack', cost: 0,
    flavor: '快比重更重要。', flavor_en: 'Speed over weight.', tags: [],
    stats: [{ damage: 3 }, { damage: 4 }, { damage: 6 }, { damage: 8 }, { damage: 11 }, { damage: 15 }],
    desc: e => [`造成${e.damage}点伤害。`, `Deal ${e.damage} damage.`],
  },
  {
    baseId: 'generic_magic_bolt', zh: '魔力飞弹', en: 'Magic Bolt', type: 'attack', cost: 1,
    flavor: '一束稳定的魔力。', flavor_en: 'A steady bolt of mana.', tags: [],
    stats: [
      { damage: 4, drawCards: 1 }, { damage: 6, drawCards: 1 }, { damage: 9, drawCards: 1 },
      { damage: 12, drawCards: 1 }, { damage: 16, drawCards: 1 }, { damage: 21, drawCards: 1 },
    ],
    desc: e => [`造成${e.damage}点伤害，抽${e.drawCards}张牌。`, `Deal ${e.damage} damage, Draw ${e.drawCards} card.`],
  },
  {
    baseId: 'generic_magic_shield', zh: '魔力护盾', en: 'Magic Shield', type: 'defense', cost: 1,
    flavor: '薄而稳定的屏障。', flavor_en: 'A thin but steady barrier.', tags: [],
    stats: [
      { armor: 5, drawCards: 1 }, { armor: 7, drawCards: 1 }, { armor: 10, drawCards: 1 },
      { armor: 13, drawCards: 1 }, { armor: 17, drawCards: 1 }, { armor: 22, drawCards: 1 },
    ],
    desc: e => [`获得${e.armor}点护甲，抽${e.drawCards}张牌。`, `Gain ${e.armor} armor, Draw ${e.drawCards} card.`],
  },
  {
    baseId: 'basic_meditate', idPrefix: 'basic_meditate', zh: '冥想', en: 'Meditate', type: 'buff', cost: 0,
    flavor: '静心凝神，重蓄力量。', flavor_en: 'Calm the mind, gather strength.', tags: [],
    stats: [
      { energyGain: 2 }, { energyGain: 2, drawCards: 1 }, { energyGain: 2, drawCards: 2 },
      { energyGain: 3, drawCards: 2 }, { energyGain: 3, drawCards: 3 }, { energyGain: 4, drawCards: 4 },
    ],
    desc: e => {
      const zh = [], en = [];
      if (e.drawCards) { zh.push(`抽${e.drawCards}张牌`); en.push(`Draw ${e.drawCards} cards`); }
      zh.push(`获得${e.energyGain}点能量`); en.push(`Gain ${e.energyGain} energy`);
      return [zh.join('，') + '。', en.join(', ') + '.'];
    },
  },
  {
    baseId: 'generic_empower_potion', zh: '强能药剂', en: 'Empower Potion', type: 'buff', cost: 1,
    flavor: '力量在血脉中奔涌。', flavor_en: 'Power surges through your veins.', tags: [],
    stats: [
      { energyGain: 1, emp: 1 }, { energyGain: 2, emp: 2 }, { energyGain: 2, emp: 3 },
      { energyGain: 3, emp: 4 }, { energyGain: 3, emp: 5 }, { energyGain: 4, emp: 6 },
    ],
    build: (s, i) => ({
      energyGain: s.energyGain,
      applyStatus: { type: 'empower', value: s.emp, duration: i >= 4 ? 2 : 1, target: 'player' },
    }),
    desc: e => [
      `获得${e.energyGain}点能量，施加强化${e.applyStatus.duration}回合。`,
      `Gain ${e.energyGain} energy, Apply Empower for ${e.applyStatus.duration} turn(s).`,
    ],
  },
  {
    baseId: 'generic_heal_potion', zh: '治疗药剂', en: 'Healing Potion', type: 'heal', cost: 1,
    flavor: '一口下去，伤口愈合。', flavor_en: 'One sip mends the wounds.', tags: [],
    stats: [{ heal: 3 }, { heal: 4 }, { heal: 6 }, { heal: 8 }, { heal: 11 }, { heal: 18 }],
    desc: e => [`恢复${e.heal}点生命。`, `Heal ${e.heal} HP.`],
  },
  {
    baseId: 'generic_max_hp_up', zh: '生命之泉', en: 'Fountain of Life', type: 'heal', cost: 2,
    flavor: '甘泉护体，攻守兼备。', flavor_en: 'Sweet spring guards body and soul.', tags: [],
    stats: [
      { armor: 5, heal: 3 }, { armor: 7, heal: 4 }, { armor: 9, heal: 6 },
      { armor: 12, heal: 8 }, { armor: 16, heal: 11 }, { armor: 22, heal: 15 },
    ],
    desc: e => [`获得${e.armor}点护甲，恢复${e.heal}点生命。`, `Gain ${e.armor} armor, Heal ${e.heal} HP.`],
  },
  {
    baseId: 'generic_weaken_potion', zh: '弱化药剂', en: 'Weakening Potion', type: 'debuff', cost: 1,
    flavor: '让敌人的防线出现裂痕。', flavor_en: 'Crack the enemy\u2019s defenses.', tags: [],
    stats: [
      { frg: 1, dur: 2 }, { frg: 2, dur: 2 }, { frg: 2, dur: 3 },
      { frg: 3, dur: 3 }, { frg: 4, dur: 3 }, { frg: 5, dur: 4 },
    ],
    build: s => ({ applyStatus: { type: 'fragile', value: s.frg, duration: s.dur, target: 'enemy' } }),
    desc: e => [
      `对敌人施加脆弱${e.applyStatus.value}层，持续${e.applyStatus.duration}回合。`,
      `Apply ${e.applyStatus.value} Fragile to enemy for ${e.applyStatus.duration} turns.`,
    ],
  },
];

function chainId(chain, i) {
  if (i === 0) return chain.baseId;
  // 起始牌保留原 baseId，升级形态用 baseId + 稀有度后缀
  return chain.baseId + ID_SUFFIX[i];
}

const cards = [];
for (const chain of CHAINS) {
  for (let i = 0; i < 6; i++) {
    const s = chain.stats[i];
    const effect = chain.build ? chain.build(s, i) : { ...s };
    const [desc, desc_en] = chain.desc(effect);
    const id = chainId(chain, i);
    const next = i < 5 ? chainId(chain, i + 1) : null;
    cards.push({
      id,
      name: chain.zh + ZH_SUFFIX[i],
      tier: i + 1,
      rarity: RARITIES[i],
      cost: chain.cost,
      type: chain.type,
      effect,
      description: desc,
      upgradeTo: next,
      characterBind: 'generic',
      flavorText: chain.flavor,
      tags: chain.tags,
      name_en: chain.en + EN_SUFFIX[i],
      description_en: desc_en,
      flavorText_en: chain.flavor_en,
    });
  }
}

// 替换 skills.json 中所有 generic 卡
const path = './src/data/skills.json';
const all = JSON.parse(fs.readFileSync(path, 'utf8'));
const nonGeneric = all.filter(c => c.characterBind !== 'generic');
const result = [...nonGeneric, ...cards];
fs.writeFileSync(path, JSON.stringify(result, null, 2) + '\n', 'utf8');

console.log(`移除旧generic: ${all.length - nonGeneric.length}张`);
console.log(`新增generic: ${cards.length}张`);
console.log(`总卡数: ${all.length} -> ${result.length}`);
