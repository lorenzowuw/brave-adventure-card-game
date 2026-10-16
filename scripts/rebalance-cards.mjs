#!/usr/bin/env node
/**
 * 卡牌数值平衡调整
 * 目标：同品质同费用卡牌伤害/护甲/治疗差异缩小到合理范围
 * 原则：纯伤害卡数值最高，附带效果的卡适当降低
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const skills = JSON.parse(readFileSync(resolve(__dirname, '../src/data/skills.json'), 'utf-8'));

// ====== 标准伤害表（纯攻击卡，无副作用） ======
const BASE_DMG = {
  white:  { 0: 3, 1: 6, 2: 9, 3: 13 },
  green:  { 0: 4, 1: 8, 2: 13, 3: 18 },
  blue:   { 0: 5, 1: 11, 2: 17, 3: 23 },
  purple: { 0: 7, 1: 14, 2: 22, 3: 30 },
  orange: { 0: 10, 1: 19, 2: 30, 3: 40 },
  red:    { 0: 14, 1: 26, 2: 40, 3: 54 },
};

// 标准护甲值（纯防御卡）
const BASE_ARMOR = {
  white:  { 0: 3, 1: 7, 2: 10, 3: 14 },
  green:  { 0: 4, 1: 9, 2: 14, 3: 19 },
  blue:   { 0: 6, 1: 12, 2: 18, 3: 25 },
  purple: { 0: 8, 1: 15, 2: 24, 3: 32 },
  orange: { 0: 11, 1: 21, 2: 32, 3: 44 },
  red:    { 0: 15, 1: 28, 2: 44, 3: 58 },
};

// 标准治疗值
const BASE_HEAL = {
  white:  { 0: 2, 1: 5, 2: 8, 3: 11 },
  green:  { 0: 3, 1: 6, 2: 10, 3: 14 },
  blue:   { 0: 4, 1: 8, 2: 13, 3: 18 },
  purple: { 0: 6, 1: 11, 2: 18, 3: 24 },
  orange: { 0: 8, 1: 15, 2: 24, 3: 32 },
  red:    { 0: 11, 1: 20, 2: 32, 3: 42 },
};

// ====== 副作用系数 ======
// 根据附带效果降低伤害/护甲/治疗
const EFFECT_PENALTY = {
  // 附加状态：越强的状态扣减越多
  bleed: 0.75,     // 流血：-25%
  poison: 0.70,    // 中毒：-30%
  burn: 0.70,      // 灼烧：-30%
  weak: 0.80,      // 虚弱：-20%
  fragile: 0.80,   // 脆弱：-20%
  paralyze: 0.70,  // 麻痹：-30%
  stun: 0.65,      // 眩晕：-35%
  empower: 0.80,   // 强化：-20%
  regen: 0.80,     // 再生：-20%
  taunt: 0.80,     // 嘲讽：-20%
  // 抽牌/能量：强力辅助效果，大幅降低
  drawCards: 0.65,
  energyGain: 0.60,
  // 同时有护甲和治疗
  armorAndHeal: 0.70,
  // 同时有伤害和护甲
  damageAndArmor: 0.75,
  // 金币消耗/获得
  goldCost: 0.70,
  goldGain: 0.75,
};

function getDamageMultiplier(effect) {
  let mult = 1.0;
  const status = effect.applyStatus;
  if (status) {
    const penalty = EFFECT_PENALTY[status.type];
    if (penalty) mult *= penalty;
  }
  if (effect.drawCards) mult *= EFFECT_PENALTY.drawCards;
  if (effect.energyGain) mult *= EFFECT_PENALTY.energyGain;
  if (effect.goldCost) mult *= EFFECT_PENALTY.goldCost;
  if (effect.goldGain) mult *= EFFECT_PENALTY.goldGain;
  if (effect.armor && effect.damage) mult *= EFFECT_PENALTY.damageAndArmor;
  if (effect.armor && effect.heal) mult *= EFFECT_PENALTY.armorAndHeal;
  return mult;
}

function getArmorMultiplier(effect) {
  let mult = 1.0;
  const status = effect.applyStatus;
  if (status) {
    const penalty = EFFECT_PENALTY[status.type];
    if (penalty) mult *= penalty;
  }
  if (effect.drawCards) mult *= EFFECT_PENALTY.drawCards;
  if (effect.energyGain) mult *= EFFECT_PENALTY.energyGain;
  if (effect.goldCost) mult *= EFFECT_PENALTY.goldCost;
  return mult;
}

function getHealMultiplier(effect) {
  let mult = 1.0;
  const status = effect.applyStatus;
  if (status) {
    const penalty = EFFECT_PENALTY[status.type];
    if (penalty) mult *= penalty;
  }
  if (effect.drawCards) mult *= EFFECT_PENALTY.drawCards;
  if (effect.energyGain) mult *= EFFECT_PENALTY.energyGain;
  if (effect.armor) mult *= EFFECT_PENALTY.armorAndHeal;
  return mult;
}

function roundTo(n, step = 1) {
  return Math.round(n / step) * step;
}

let changes = 0;
let skipLog = new Set(['dev_god_slash', 'dev_dome']);

for (const card of skills) {
  if (skipLog.has(card.id)) continue;
  const e = card.effect;
  if (!e) continue;
  const cost = card.cost ?? 1;
  const rarity = card.rarity;
  const baseDmg = BASE_DMG[rarity]?.[cost] ?? null;

  // === 调整伤害 ===
  if (e.damage && baseDmg !== null) {
    const mult = getDamageMultiplier(e);
    let newDmg = roundTo(baseDmg * mult);
    if (e.damageMultiplier && e.damageMultiplier > 1) {
      // 连击卡：总伤害分配到多段
      const totalNew = newDmg;
      newDmg = Math.max(1, Math.round(totalNew / e.damageMultiplier));
    }
    newDmg = Math.max(1, newDmg);
    if (Math.abs(e.damage - newDmg) >= 2) {
      changes++;
    }
    e.damage = newDmg;
  }

  // === 调整护甲 ===
  if (e.armor && !e.damage) {
    const baseArm = BASE_ARMOR[rarity]?.[cost] ?? null;
    if (baseArm !== null) {
      const mult = getArmorMultiplier(e);
      let newArmor = roundTo(baseArm * mult);
      newArmor = Math.max(1, newArmor);
      if (Math.abs(e.armor - newArmor) >= 2) changes++;
      e.armor = newArmor;
    }
  }

  // === 调整治疗 ===
  if (e.heal && !e.damage) {
    const baseHeal = BASE_HEAL[rarity]?.[cost] ?? null;
    if (baseHeal !== null) {
      const mult = getHealMultiplier(e);
      let newHeal = roundTo(baseHeal * mult);
      newHeal = Math.max(1, newHeal);
      if (Math.abs(e.heal - newHeal) >= 2) changes++;
      e.heal = newHeal;
    }
  }
}

writeFileSync(resolve(__dirname, '../src/data/skills.json'), JSON.stringify(skills, null, 2), 'utf-8');
console.log(`Done! ${changes} cards adjusted.`);

// Verify results
const byRarity = {};
for (const s of skills) {
  const dmg = s.effect?.damage ?? 0;
  if (dmg > 0 && !skipLog.has(s.id)) {
    if (!byRarity[s.rarity]) byRarity[s.rarity] = [];
    byRarity[s.rarity].push({ id: s.id, dmg, cost: s.cost });
  }
}
console.log('\n=== After Rebalance ===');
for (const [r, cards] of Object.entries(byRarity).sort()) {
  const totals = cards.map(c => c.dmg);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const avg = Math.round(totals.reduce((a,b)=>a+b,0) / totals.length);
  console.log(`${r} (${cards.length} cards): ${min} ~ ${max}  avg:${avg}  range:${((max-min)/avg*100).toFixed(0)}%`);
}
