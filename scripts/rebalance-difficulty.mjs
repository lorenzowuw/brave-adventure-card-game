/**
 * 回调难度 — 把上次的拔高幅度缩减到 2/3
 * 运行: node scripts/rebalance-difficulty.mjs
 */

import fs from 'fs';

// ========== 1. 读取原始数据 (git show HEAD~2 之前的版本) ==========
import { execSync } from 'child_process';

const origEnemiesJson = execSync('git show HEAD~2:src/data/enemies.json', { encoding: 'utf-8' });
const origEnemies = JSON.parse(origEnemiesJson);

const currentEnemies = JSON.parse(fs.readFileSync('src/data/enemies.json', 'utf-8'));

// 记录变更
let changes = [];

for (const cur of currentEnemies) {
  const orig = origEnemies.find(e => e.id === cur.id);
  if (!orig) continue;

  // HP: original + (current - original) * 2/3
  const targetHp = Math.max(1, Math.round(orig.hp + (cur.hp - orig.hp) * 2 / 3));

  // 记录旧值
  const oldHp = cur.hp;
  cur.hp = targetHp;

  // Intents: 同样按 2/3 缩回
  for (let i = 0; i < cur.intents.length; i++) {
    const curI = cur.intents[i];
    const origI = orig.intents[i];
    if (!origI) continue;

    if (curI.type === 'attack') {
      const origV = typeof origI.value === 'number' ? origI.value : 0;
      curI.value = Math.max(1, Math.round(origV + (curI.value - origV) * 2 / 3));
    } else if (curI.type === 'defense') {
      const origV = typeof origI.value === 'number' ? origI.value : 0;
      curI.value = Math.max(0, Math.round(origV + (curI.value - origV) * 2 / 3));
    } else if (curI.type === 'buff') {
      const origV = typeof origI.value === 'number' ? origI.value : 0;
      curI.value = Math.max(0, Math.round(origV + (curI.value - origV) * 2 / 3));
    } else if (curI.type === 'debuff') {
      const origV = typeof origI.value === 'number' ? origI.value : 0;
      curI.value = Math.max(0, Math.round(origV + (curI.value - origV) * 2 / 3));
    }
  }

  // phaseIntents
  if (cur.phaseIntents && orig.phaseIntents) {
    for (let i = 0; i < cur.phaseIntents.length; i++) {
      const curI = cur.phaseIntents[i];
      const origI = orig.phaseIntents[i];
      if (!origI) continue;

      if (curI.type === 'attack') {
        const origV = typeof origI.value === 'number' ? origI.value : 0;
        curI.value = Math.max(1, Math.round(origV + (curI.value - origV) * 2 / 3));
      } else if (curI.type === 'debuff') {
        const origV = typeof origI.value === 'number' ? origI.value : 0;
        curI.value = Math.max(0, Math.round(origV + (curI.value - origV) * 2 / 3));
      } else if (curI.type === 'buff') {
        const origV = typeof origI.value === 'number' ? origI.value : 0;
        curI.value = Math.max(0, Math.round(origV + (curI.value - origV) * 2 / 3));
      }
    }
  }

  if (oldHp !== cur.hp) {
    changes.push(`  ${cur.id}: HP ${oldHp}→${cur.hp}`);
  }
}

// 输出变更
console.log('=== 敌人数值回调 (2/3) ===');
for (const c of changes) console.log(c);

fs.writeFileSync('src/data/enemies.json', JSON.stringify(currentEnemies, null, 2), 'utf-8');
console.log('\n✅ enemies.json 已更新');

// ========== 2. 等级奖励回调 ==========
const constants = JSON.parse(fs.readFileSync('src/data/constants.json', 'utf-8'));

// 原始等级奖励 (从 git HEAD~2 获取)
const origConstants = JSON.parse(execSync('git show HEAD~2:src/data/constants.json', { encoding: 'utf-8' }));
const origBonuses = origConstants.levelBonuses;
const currentBonuses = constants.levelBonuses;

console.log('\n=== 等级奖励回调 ===');
for (let i = 1; i < currentBonuses.length; i++) {
  const origHp = origBonuses[i].hpBonus;
  const curHp = currentBonuses[i].hpBonus;
  const targetHp = Math.round(origHp + (curHp - origHp) * 2 / 3);
  console.log(`  等级${i+1}: HP奖励 ${curHp}→${targetHp}`);
  currentBonuses[i].hpBonus = targetHp;

  const origEn = origBonuses[i].energyBonus;
  const curEn = currentBonuses[i].energyBonus;
  const targetEn = Math.round(origEn + (curEn - origEn) * 2 / 3);
  currentBonuses[i].energyBonus = targetEn;
}

fs.writeFileSync('src/data/constants.json', JSON.stringify(constants, null, 2), 'utf-8');
console.log('\n✅ constants.json 已更新');

console.log('\n🎉 难度回调完成！已将增量缩减到原始增幅的 2/3');
