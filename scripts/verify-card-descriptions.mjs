#!/usr/bin/env node
/**
 * 验证卡牌描述与实际效果值是否一致
 *
 * 检查规则：
 * 1. 描述中的伤害数值 === effect.damage
 * 2. 描述中的护甲数值 === effect.armor (× rarity multiplier)
 * 3. 描述中的治疗数值 === effect.heal (× rarity multiplier)
 * 4. 标签一致性（aoe 类卡牌应有 damageToAll 或 tags 包含 aoe）
 * 5. 费用与能量描述
 * 6. 抽牌和能量回复描述
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 期望描述中出现的数字映射
function extractExpectedValues(description, card) {
  const issues = [];
  const effect = card.effect || {};

  // 检查描述中是否包含伤害数值
  if (effect.damage) {
    const expected = effect.damage * (effect.damageMultiplier ?? 1);
    const regex = new RegExp(`${expected}`, 'g');
    if (!regex.test(description)) {
      // 尝试检查更宽松的匹配（比如伤害*连击数）
      let found = false;
      for (let mult = 1; mult <= (effect.damageMultiplier ?? 1); mult++) {
        const partialDmg = effect.damage * mult;
        if (description.includes(String(partialDmg))) {
          found = true;
          break;
        }
      }
      if (!found) {
        issues.push(`伤害值 ${expected} 未在描述 "${description}" 中找到`);
      }
    }
  }

  // 检查护甲（描述中使用基础值，稀有度倍率在运行时计算）
  if (effect.armor) {
    if (!description.includes(String(effect.armor))) {
      issues.push(`护甲值 ${effect.armor} 未在描述 "${description}" 中找到`);
    }
  }

  // 检查治疗（描述中使用基础值，稀有度倍率在运行时计算）
  if (effect.heal) {
    if (!description.includes(String(effect.heal))) {
      issues.push(`治疗值 ${effect.heal} 未在描述 "${description}" 中找到`);
    }
  }

  // 检查抽牌
  if (effect.drawCards) {
    if (!description.includes(String(effect.drawCards)) && !description.includes('抽')) {
      issues.push(`抽牌数 ${effect.drawCards} 未在描述 "${description}" 中找到`);
    }
  }

  // 检查能量回复
  if (effect.energyGain) {
    if (!description.includes(String(effect.energyGain))) {
      issues.push(`能量回复 ${effect.energyGain} 未在描述 "${description}" 中找到`);
    }
  }

  // 检查群伤
  if (effect.damageToAll) {
    if (!description.includes(String(effect.damageToAll)) && !description.includes('群') && !description.includes('所有')) {
      // Check if tags contain 'aoe'
      if (!card.tags?.includes('aoe')) {
        issues.push(`群伤值 ${effect.damageToAll} 未在描述 "${description}" 中找到，且 tags 不含 aoe`);
      }
    }
  }

  // 检查金币消耗/获得
  if (effect.goldCost) {
    if (!description.includes(String(effect.goldCost)) && !description.includes('金币')) {
      issues.push(`金币消耗 ${effect.goldCost} 未在描述 "${description}" 中找到`);
    }
  }
  if (effect.goldGain) {
    if (!description.includes(String(effect.goldGain)) && !description.includes('金币')) {
      issues.push(`金币获得 ${effect.goldGain} 未在描述 "${description}" 中找到`);
    }
  }

  // 检查标签一致性
  if (card.tags?.includes('aoe') && !effect.damageToAll && (!effect.damage || effect.damageMultiplier === 1)) {
    issues.push(`tags 包含 aoe 但 effect.damageToAll 未设置，且 damage 无多目标特征`);
  }

  // 检查状态效果描述（中英文均可）
  if (effect.applyStatus) {
    const status = effect.applyStatus;
    const statusNames = {
      burn: '灼烧', poison: '中毒', bleed: '流血', fragile: '脆弱',
      weak: '虚弱', paralyze: '麻痹', empower: '强化', regen: '再生',
      armor: '护甲', agile: '敏捷', taunt: '嘲讽', stun: '眩晕',
      freeze: '冻结',
    };
    const chineseName = statusNames[status.type] || status.type;
    // 描述中可能使用中文名或英文type名
    const found = description.includes(chineseName) || description.includes(status.type);
    if (!found) {
      issues.push(`状态效果 ${chineseName}(${status.type}) 未在描述 "${description}" 中找到`);
    }
  }

  return issues;
}

// 主函数
function main() {
  const skillsPath = resolve(__dirname, '../src/data/skills.json');
  const raw = readFileSync(skillsPath, 'utf-8');
  const skills = JSON.parse(raw);

  let totalIssues = 0;
  let cardsWithIssues = 0;

  for (const card of skills) {
    const issues = extractExpectedValues(card.description, card);
    if (issues.length > 0) {
      cardsWithIssues++;
      totalIssues += issues.length;
      console.log(`[${card.id}] ${card.name} (${card.rarity}):`);
      issues.forEach(issue => console.log(`  ❌ ${issue}`));
    }
  }

  const totalCards = skills.length;
  const cleanCards = totalCards - cardsWithIssues;

  console.log(`\n========== 验证报告 ==========`);
  console.log(`总卡牌数: ${totalCards}`);
  console.log(`描述一致: ${cleanCards} (${(cleanCards / totalCards * 100).toFixed(1)}%)`);
  console.log(`存在问题: ${cardsWithIssues} (${(cardsWithIssues / totalCards * 100).toFixed(1)}%)`);
  console.log(`问题总数: ${totalIssues}`);

  process.exit(totalIssues > 0 ? 1 : 0);
}

main();
