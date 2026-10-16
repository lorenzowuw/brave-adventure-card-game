#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', 'src', 'data');

const skills = JSON.parse(readFileSync(path.join(dataDir, 'skills.json'), 'utf-8'));
const characters = JSON.parse(readFileSync(path.join(dataDir, 'characters.json'), 'utf-8'));
const enemies = JSON.parse(readFileSync(path.join(dataDir, 'enemies.json'), 'utf-8'));

// Build lookup maps
const skillMap = {};
for (const s of skills) skillMap[s.id] = s;
const charMap = {};
for (const c of characters) charMap[c.id] = c;
const enemyMap = {};
for (const e of enemies) enemyMap[e.id] = e;

console.log("=".repeat(80));
console.log("AUDIT REPORT: 勇者大冒险 Game Data Balance");
console.log("=".repeat(80));

// ==========================================
// 1. upgradeTo chain integrity
// ==========================================
console.log("\n## 1. 升级链完整性检查");
console.log("-".repeat(40));
let brokenRefs = [];
for (const s of skills) {
  const upg = s.upgradeTo;
  if (upg) {
    if (!skillMap[upg]) {
      brokenRefs.push({ src: s.id, dst: upg });
    } else {
      const target = skillMap[upg];
      if (target.tier <= s.tier) {
        console.log(`  警告: ${s.id} (tier=${s.tier}) -> ${upg} (tier=${target.tier}) 等级未提升`);
      }
    }
  }
}
if (brokenRefs.length > 0) {
  for (const { src, dst } of brokenRefs) {
    console.log(`  [严重] 断裂引用: ${src} 指向不存在的ID: ${dst}`);
  }
} else {
  console.log("  所有 upgradeTo 引用均有效。");
}

// ==========================================
// 2. Cards that upgrade but lose stats
// ==========================================
console.log("\n## 2. 升级链数值衰减检查");
console.log("-".repeat(40));

function getAttackValue(eff) {
  const d = eff.damage || 0;
  const mult = eff.damageMultiplier || 1;
  return d * mult;
}
function getDefenseValue(eff) { return eff.armor || 0; }
function getHealValue(eff) { return eff.heal || 0; }

const downgradeIssues = [];
for (const s of skills) {
  const upg = s.upgradeTo;
  if (upg && skillMap[upg]) {
    const t = skillMap[upg];
    const sAtk = getAttackValue(s.effect);
    const tAtk = getAttackValue(t.effect);
    if (sAtk > tAtk && s.type === t.type && s.type === 'attack') {
      downgradeIssues.push({ src: s.id, sCost: s.cost, sVal: sAtk, dst: upg, tCost: t.cost, tVal: tAtk, stat: "攻击力" });
    }
  }
}

// Filter significant ones (cost same or higher, value drops > 20%)
const significant = downgradeIssues.filter(item => {
  if (item.tCost < item.sCost) return false;
  if (item.sVal > 0 && item.tVal > 0) {
    const ratio = item.tVal / item.sVal;
    return ratio < 0.8;
  }
  return false;
});

// Known intentional downgrades
const intentionallySkipped = ['ironwall_bash_1->ironwall_bash_2'];
const filtered = significant.filter(item => !intentionallySkipped.includes(`${item.src}->${item.dst}`));

if (filtered.length > 0) {
  for (const item of filtered) {
    console.log(`  [注意] ${item.src}(cost=${item.sCost},${item.stat}=${item.sVal}) -> ${item.dst}(cost=${item.tCost},${item.stat}=${item.tVal}) 数值下降`);
  }
} else {
  console.log("  未发现异常数值衰减（排除有意降低费用的升级链）。");
}

// ==========================================
// 3. Upgrade progression check
// ==========================================
console.log("\n## 3. 升级链每级提升检查");
console.log("-".repeat(40));

for (const charId of Object.keys(charMap)) {
  if (charId === 'developer') continue;
  const startCards = skills.filter(s => s.characterBind === charId && s.tier === 1 && s.rarity === 'white');
  for (const start of startCards) {
    const chain = [start];
    let curr = start;
    while (curr.upgradeTo && skillMap[curr.upgradeTo]) {
      curr = skillMap[curr.upgradeTo];
      chain.push(curr);
    }
    for (let i = 0; i < chain.length - 1; i++) {
      const prev = chain[i];
      const curr2 = chain[i + 1];
      const pEff = prev.effect;
      const cEff = curr2.effect;
      const allKeys = new Set([...Object.keys(pEff), ...Object.keys(cEff)]);
      let improved = false;
      for (const k of allKeys) {
        if (k === 'applyStatus' || k === 'damageMultiplier' || k === 'target') continue;
        const pv = typeof pEff[k] === 'number' ? pEff[k] : 0;
        const cv = typeof cEff[k] === 'number' ? cEff[k] : 0;
        if (cv > pv) improved = true;
      }
      if (!improved && curr2.cost === prev.cost && !pEff.damageMultiplier) {
        console.log(`  [注意] 升级链 ${prev.id} -> ${curr2.id} 可能无数值提升 (${prev.rarity}->${curr2.rarity}, cost: ${prev.cost}->${curr2.cost})`);
      }
    }
  }
}

// ==========================================
// 4. Same-rarity, same-cost comparison
// ==========================================
console.log("\n## 4. 同稀有度同费用数值对比");
console.log("-".repeat(40));

const groups = {};
for (const s of skills) {
  if (s.characterBind === 'developer') continue;
  const key = `${s.rarity}|${s.cost}|${s.type}`;
  if (!groups[key]) groups[key] = [];
  groups[key].push(s);
}

for (const [key, cards] of Object.entries(groups)) {
  if (cards.length < 2) continue;
  const [rarity, cost, stype] = key.split('|');
  const damages = cards.map(c => getAttackValue(c.effect));
  const armors = cards.map(c => getDefenseValue(c.effect));
  const heals = cards.map(c => getHealValue(c.effect));

  if (stype === 'attack' && damages.length >= 2) {
    const avg = damages.reduce((a, b) => a + b, 0) / damages.length;
    for (let i = 0; i < cards.length; i++) {
      if (damages[i] > 0 && avg > 0) {
        const ratio = damages[i] / avg;
        if (ratio > 1.5) {
          console.log(`  [注意] ${cards[i].id}(${cards[i].characterBind}): 伤害${damages[i]} 超出同组平均(${avg.toFixed(0)}) ${(ratio*100).toFixed(0)}%`);
        } else if (ratio < 0.7) {
          console.log(`  [注意] ${cards[i].id}(${cards[i].characterBind}): 伤害${damages[i]} 低于同组平均(${avg.toFixed(0)}) ${(ratio*100).toFixed(0)}%`);
        }
      }
    }
  }
  if (stype === 'defense' && armors.length >= 2) {
    const avg = armors.reduce((a, b) => a + b, 0) / armors.length;
    for (let i = 0; i < cards.length; i++) {
      if (armors[i] > 0 && avg > 0) {
        const ratio = armors[i] / avg;
        if (ratio > 1.5) {
          console.log(`  [注意] ${cards[i].id}(${cards[i].characterBind}): 护甲${armors[i]} 超出同组平均(${avg.toFixed(0)}) ${(ratio*100).toFixed(0)}%`);
        }
      }
    }
  }
  if (stype === 'heal' && heals.length >= 2) {
    const avg = heals.reduce((a, b) => a + b, 0) / heals.length;
    for (let i = 0; i < cards.length; i++) {
      if (heals[i] > 0 && avg > 0) {
        const ratio = heals[i] / avg;
        if (ratio > 1.5) {
          console.log(`  [注意] ${cards[i].id}(${cards[i].characterBind}): 治疗${heals[i]} 超出同组平均(${avg.toFixed(0)}) ${(ratio*100).toFixed(0)}%`);
        }
      }
    }
  }
}

// ==========================================
// 5. Status effect value/duration sanity
// ==========================================
console.log("\n## 5. Status Effect 数值合理性");
console.log("-".repeat(40));

const statusValues = {};
for (const s of skills) {
  const st = s.effect.applyStatus;
  if (st) {
    const arr = Array.isArray(st) ? st : [st];
    for (const sub of arr) {
      if (!statusValues[sub.type]) statusValues[sub.type] = [];
      statusValues[sub.type].push({ value: sub.value, duration: sub.duration || 1, id: s.id, rarity: s.rarity });
    }
  }
}

for (const [stype, vals] of Object.entries(statusValues)) {
  if (vals.length < 3) continue;
  const values = vals.map(v => v.value);
  const maxV = Math.max(...values);
  const minV = Math.min(...values);
  const avgV = values.reduce((a, b) => a + b, 0) / values.length;
  if (maxV > avgV * 3) {
    const extremes = vals.filter(v => v.value > avgV * 3);
    for (const v of extremes) {
      console.log(`  [注意] ${stype} 数值异常高: ${v.id}(${v.rarity}) value=${v.value}, 平均=${avgV.toFixed(1)}`);
    }
  }
  if (minV > 0 && avgV > 0 && maxV / minV > 5) {
    console.log(`  [信息] ${stype} 数值跨度大: min=${minV}, max=${maxV}, 平均=${avgV.toFixed(1)}`);
  }
}

// ==========================================
// 6. Enemies balance
// ==========================================
console.log("\n## 6. 敌人数据合理性");
console.log("-".repeat(40));

for (const e of enemies) {
  const attacks = e.intents.filter(i => i.type === 'attack');
  const maxAttack = attacks.length > 0 ? Math.max(...attacks.map(a => a.value)) : 0;
  const defends = e.intents.filter(i => i.type === 'defense');
  const maxDefense = defends.length > 0 ? Math.max(...defends.map(d => d.value)) : 0;

  if (e.tier === 'boss') {
    const playerHps = characters.filter(c => c.id !== 'developer').map(c => c.baseHp);
    const minPlayerHp = Math.min(...playerHps);
    const maxPlayerHp = Math.max(...playerHps);
    console.log(`  ${e.id}: HP=${e.hp}, 攻击max=${maxAttack}, 护甲max=${maxDefense}, 能量=${e.energy}`);

    // Check boss kill time
    const turnsToKill = e.hp / 10; // rough estimate: 10 dmg per turn
    if (turnsToKill > 10) {
      console.log(`    可能需要 ${turnsToKill.toFixed(1)} 回合击杀 (估算) - 可能过长`);
    }
  }

  // Check phase threshold
  const pt = e.phaseThreshold;
  if (pt != null) {
    const pi = e.phaseIntents || [];
    if (pi.length === 0) {
      console.log(`  [注意] ${e.id} 设置了 phaseThreshold=${pt} 但无 phaseIntents`);
    }
    if (pi.length > 0) {
      const piAttacks = pi.filter(i => i.type === 'attack');
      if (piAttacks.length > 0 && attacks.length > 0) {
        const piMax = Math.max(...piAttacks.map(a => a.value));
        if (piMax <= maxAttack) {
          console.log(`  [注意] ${e.id}: 阶段转换后攻击(${piMax})未高于阶段前(${maxAttack})`);
        }
      }
    }
  }
}

// ==========================================
// 7. damageMultiplier balance
// ==========================================
console.log("\n## 7. 连击与群伤平衡性");
console.log("-".repeat(40));

const multiHitCards = skills.filter(s => (s.effect.damageMultiplier || 1) > 1);
for (const s of multiHitCards) {
  const dmg = s.effect.damage;
  const mult = s.effect.damageMultiplier;
  const total = dmg * mult;
  const cost = s.cost;
  const rarity = s.rarity;
  const comparable = skills.filter(x =>
    x.rarity === rarity && x.cost === cost && x.type === 'attack' &&
    (x.effect.damageMultiplier || 1) === 1 && x.id !== s.id
  );
  if (comparable.length > 0) {
    const avgSingle = comparable.reduce((sum, x) => sum + getAttackValue(x.effect), 0) / comparable.length;
    const ratio = total / avgSingle;
    if (ratio > 1.3) {
      console.log(`  [注意] ${s.id}: 连击总伤${total} 高于同组平均${avgSingle.toFixed(0)}(+${((ratio-1)*100).toFixed(0)}%)`);
    } else if (ratio < 0.8) {
      console.log(`  [注意] ${s.id}: 连击总伤${total} 低于同组平均${avgSingle.toFixed(0)}(${(ratio*100).toFixed(0)}%)`);
    }
  }
}

// ==========================================
// 8. Effect vs Description consistency
// ==========================================
console.log("\n## 8. Effect与Description一致性");
console.log("-".repeat(40));

const statusCN = {
  'bleed': '流血', 'poison': '中毒', 'burn': '灼烧', 'weak': '虚弱',
  'fragile': '脆弱', 'paralyze': '麻痹', 'regen': '再生', 'empower': '强化'
};

for (const s of skills) {
  const eff = s.effect;
  const desc = s.description || '';
  const checks = [
    ['damage', '伤害'],
    ['armor', '护甲'],
    ['heal', '生命'],
    ['drawCards', '抽'],
    ['energyGain', '能量'],
    ['goldGain', '金币'],
    ['goldCost', '消耗'],
  ];
  for (const [key, cnTerm] of checks) {
    if (eff[key] != null && eff[key] > 0 && !desc.includes(cnTerm)) {
      console.log(`  [注意] ${s.id}: 有效果${key}=${eff[key]}但描述未提及"${cnTerm}"`);
    }
  }
  const st = eff.applyStatus;
  if (st) {
    const arr = Array.isArray(st) ? st : [st];
    for (const sub of arr) {
      const cn = statusCN[sub.type] || sub.type;
      if (!desc.includes(cn)) {
        console.log(`  [注意] ${s.id}: 施加状态${sub.type}但描述未提及`);
      }
    }
  }
}

// ==========================================
// 9. Economy card balance
// ==========================================
console.log("\n## 9. 经济卡数值模型");
console.log("-".repeat(40));

const economyCards = skills.filter(s =>
  s.type === 'economy' || s.effect.goldCost != null || s.effect.goldGain != null
);
for (const s of economyCards) {
  const gc = s.effect.goldCost || 0;
  const gg = s.effect.goldGain || 0;
  const net = gg - gc;
  const damage = s.effect.damage || 0;
  const armor = s.effect.armor || 0;
  const draw = s.effect.drawCards || 0;
  const energy = s.effect.energyGain || 0;

  if (gc > 0 && gg > 0) {
    const profitPct = (gg - gc) / gc * 100;
    if (profitPct < 20) {
      console.log(`  [注意] ${s.id}(${s.rarity}): 消费${gc}得${gg}, 利润率${profitPct.toFixed(0)}%, 偏低`);
    } else if (profitPct > 100) {
      console.log(`  [信息] ${s.id}(${s.rarity}): 消费${gc}得${gg}, 利润率${profitPct.toFixed(0)}%, 高收益`);
    }
  }
  if (gc > 0 && damage > 0) {
    const dmgPerGold = damage / gc;
    if (dmgPerGold < 0.8) {
      console.log(`  [注意] ${s.id}: 每金币伤害比${dmgPerGold.toFixed(2)}偏低`);
    }
  }
}

// ==========================================
// 10. Check for missing damageToAll (AOE)
// ==========================================
console.log("\n## 10. AOE(damageToAll) 检查");
console.log("-".repeat(40));
const aoeCards = skills.filter(s => s.effect.damageToAll != null);
if (aoeCards.length === 0) {
  console.log("  当前数据中未发现 AOE (damageToAll) 卡牌。如果游戏需要群伤机制，需要补充。");
} else {
  for (const s of aoeCards) {
    console.log(`  ${s.id}: 群伤 ${s.effect.damageToAll}`);
  }
}

// ==========================================
// 11. Check for enemies with no phase transition
// ==========================================
console.log("\n## 11. 敌人阶段转换检查");
console.log("-".repeat(40));
for (const e of enemies) {
  if (e.tier === 'boss' && !e.phaseThreshold) {
    console.log(`  [注意] Boss ${e.id} 没有 phaseThreshold 阶段转换`);
  }
}

// ==========================================
// 12. Check enemy HP progression
// ==========================================
console.log("\n## 12. 敌人HP进阶合理性");
console.log("-".repeat(40));
const byArea = {};
for (const e of enemies) {
  if (!byArea[e.area]) byArea[e.area] = [];
  byArea[e.area].push(e);
}
for (const [area, es] of Object.entries(byArea)) {
  console.log(`  区域: ${area}`);
  for (const e of es) {
    console.log(`    ${e.id} (${e.tier}): HP=${e.hp}, 能量=${e.energy}`);
  }
}

console.log("\n" + "=".repeat(80));
console.log("审计完成");
console.log("=".repeat(80));
