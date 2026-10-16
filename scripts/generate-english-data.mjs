#!/usr/bin/env node
/**
 * 为所有游戏数据文件生成英文翻译
 * 读取原始 JSON 文件，为每条记录添加 name_en / description_en / label_en 等字段
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ====== 状态效果英译 ======
const STATUS_EN = {
  burn: 'Burn', poison: 'Poison', bleed: 'Bleed', fragile: 'Fragile',
  weak: 'Weak', paralyze: 'Paralyze', empower: 'Empower', regen: 'Regen',
  armor: 'Armor', agile: 'Agile', taunt: 'Taunt', stun: 'Stun',
};

// ====== 卡牌类型英译 ======
const TYPE_EN = {
  attack: 'Attack', defense: 'Defense', heal: 'Heal', buff: 'Buff',
  debuff: 'Debuff', economy: 'Economy', special: 'Special',
};

// ====== 角色ID→英文名映射 ======
const CHAR_NAMES = {
  ironwall: 'Ironwall', shadowblade: 'Shadowblade', lifesage: 'Lifesage',
  taichimonk: 'Taichimonk', rangermerchant: 'Ranger Merchant',
  holylight: 'Holy Light', wealthmerchant: 'Wealth Merchant',
  undeadpriest: 'Undead Priest', armorbreaker: 'Armor Breaker',
  elementmage: 'Element Mage', omnisage: 'Omnisage',
  combatmaster: 'Combat Master', frostpriest: 'Frost Priest',
  thornguardian: 'Thorn Guardian', generic: 'Generic', developer: 'Developer',
};

// ====== 工具函数 ======

/** 将中文描述转换为英文（基于 effect 数据） */
function generateEnDescription(card) {
  const e = card.effect || {};
  const parts = [];

  if (e.damage) {
    const totalDmg = e.damage * (e.damageMultiplier ?? 1);
    if (e.damageMultiplier && e.damageMultiplier > 1) {
      parts.push(`Deal ${e.damage} damage x${e.damageMultiplier}`);
    } else {
      parts.push(`Deal ${totalDmg} damage`);
    }
  }
  if (e.damageToAll) {
    parts.push(`Deal ${e.damageToAll} to all enemies`);
  }
  if (e.armor) {
    parts.push(`Gain ${e.armor} armor`);
  }
  if (e.heal) {
    parts.push(`Heal ${e.heal} HP`);
  }
  if (e.drawCards) {
    parts.push(`Draw ${e.drawCards} card${e.drawCards > 1 ? 's' : ''}`);
  }
  if (e.energyGain) {
    parts.push(`Gain ${e.energyGain} energy`);
  }
  if (e.goldGain) {
    parts.push(`Gain ${e.goldGain} gold`);
  }
  if (e.goldCost) {
    parts.push(`Spend ${e.goldCost} gold`);
  }
  if (e.applyStatus) {
    const s = e.applyStatus;
    const name = STATUS_EN[s.type] || s.type;
    const target = s.target === 'player' ? 'self' : 'enemy';
    parts.push(`Apply ${name} to ${target} for ${s.duration} turn${s.duration > 1 ? 's' : ''}`);
  }

  const raw = parts.join(', ');
  return raw ? raw + '.' : card.description;
}

/** 生成英文卡牌名：保留原名含义或用ID生成 */
function generateEnName(card) {
  return card.name || card.id;
}

function generateEnFlavor(card) {
  return card.flavorText || '';
}

// ====== 处理 skills.json ======
function translateSkills() {
  const fp = resolve(__dirname, '../src/data/skills.json');
  const skills = JSON.parse(readFileSync(fp, 'utf-8'));
  let count = 0;

  for (const card of skills) {
    if (!card.name_en) {
      card.name_en = generateEnName(card);
      count++;
    }
    if (!card.description_en) {
      card.description_en = generateEnDescription(card);
      count++;
    }
    if (!card.flavorText_en) {
      card.flavorText_en = generateEnFlavor(card);
      count++;
    }
  }

  writeFileSync(fp, JSON.stringify(skills, null, 2), 'utf-8');
  console.log(`skills.json: ${skills.length} cards updated`);
}

// ====== 处理 characters.json ======
function translateCharacters() {
  const fp = resolve(__dirname, '../src/data/characters.json');
  const chars = JSON.parse(readFileSync(fp, 'utf-8'));

  for (const ch of chars) {
    if (!ch.name_en) {
      ch.name_en = CHAR_NAMES[ch.id] || ch.name;
    }
    if (!ch.title_en) {
      ch.title_en = ch.title
        .replace('铁壁', 'Iron').replace('守卫', 'Guard')
        .replace('影刃', 'Shadow').replace('刺客', 'Assassin')
        .replace('生命', 'Life').replace('贤者', 'Sage')
        .replace('太极', 'Tai Chi').replace('武僧', 'Monk')
        .replace('游侠', 'Ranger').replace('商人', 'Merchant')
        .replace('圣光', 'Holy Light').replace('战士', 'Warrior')
        .replace('财富', 'Wealth')
        .replace('亡灵', 'Undead').replace('祭司', 'Priest')
        .replace('破甲', 'Armor Break')
        .replace('元素', 'Element').replace('法师', 'Mage')
        .replace('全能', 'Omni')
        .replace('格斗', 'Combat').replace('大师', 'Master')
        .replace('冰霜', 'Frost')
        .replace('荆棘', 'Thorn');
    }
    if (!ch.description_en) {
      ch.description_en = ch.description
        .replace(/坦克/g, 'tank').replace(/输出/g, 'damage dealer')
        .replace(/治疗/g, 'healer').replace(/辅助/g, 'supporter');
    }
    if (!ch.passiveName_en) {
      ch.passiveName_en = ch.passiveName;
    }
    if (!ch.passiveDescription_en) {
      ch.passiveDescription_en = ch.passiveDescription;
    }
  }

  writeFileSync(fp, JSON.stringify(chars, null, 2), 'utf-8');
  console.log(`characters.json: ${chars.length} characters updated`);
}

// ====== 处理 enemies.json ======
function translateEnemies() {
  const fp = resolve(__dirname, '../src/data/enemies.json');
  const enemies = JSON.parse(readFileSync(fp, 'utf-8'));

  for (const e of enemies) {
    if (!e.name_en) {
      e.name_en = e.name
        .replace('森林', 'Forest ').replace('狼', 'Wolf')
        .replace('树精', 'Treant').replace('暗影', 'Shadow ')
        .replace('树王', 'Tree King').replace('石像', 'Golem')
        .replace('魔像', 'Golem').replace('废墟', 'Ruins ')
        .replace('守卫', 'Guardian').replace('烈焰', 'Flame ')
        .replace('之灵', ' Spirit').replace('领主', ' Lord')
        .replace('小鬼', 'Imp').replace('冰霜', 'Frost ')
        .replace('巨龙', 'Dragon').replace('幽灵', 'Wraith')
        .replace('混沌', 'Chaos ').replace('邪神', 'Evil God');
    }
    if (!e.description_en) {
      e.description_en = e.description;
    }
    if (e.traitHints && !e.traitHints_en) {
      e.traitHints_en = e.traitHints.map(h => h);
    }
    // 翻译 traitHints
    if (e.traitHints_en) {
      e.traitHints_en = e.traitHints_en.map(h => (
        h
          .replace('弱', 'Weakness: ').replace('抗', 'Resistant: ')
          .replace('建议使用', 'Use ')
          .replace('攻击', 'attacks').replace('技能', 'skills')
      ));
    }
    // intents
    if (e.intents) {
      for (const intent of e.intents) {
        if (!intent.description_en) {
          intent.description_en = intent.description
            .replace('攻击', 'Attack').replace('防御', 'Defense')
            .replace('蓄力', 'Charge').replace('回复', 'Heal')
            .replace('召唤', 'Summon').replace('强化', 'Buff');
        }
      }
    }
    if (e.phaseIntents) {
      for (const intent of e.phaseIntents) {
        if (!intent.description_en) {
          intent.description_en = intent.description
            .replace('攻击', 'Attack').replace('防御', 'Defense')
            .replace('蓄力', 'Charge').replace('回复', 'Heal')
            .replace('召唤', 'Summon').replace('强化', 'Buff');
        }
      }
    }
  }

  writeFileSync(fp, JSON.stringify(enemies, null, 2), 'utf-8');
  console.log(`enemies.json: ${enemies.length} enemies updated`);
}

// ====== 处理 events.json ======
function translateEvents() {
  const fp = resolve(__dirname, '../src/data/events.json');
  const events = JSON.parse(readFileSync(fp, 'utf-8'));

  for (const ev of events) {
    if (!ev.title_en) {
      ev.title_en = ev.title;
    }
    if (!ev.description_en) {
      ev.description_en = ev.description;
    }
    if (ev.choices) {
      for (const ch of ev.choices) {
        if (!ch.label_en) ch.label_en = ch.label;
        if (!ch.description_en) ch.description_en = ch.description;
        if (!ch.outcomeText_en) ch.outcomeText_en = ch.outcomeText;
      }
    }
  }

  writeFileSync(fp, JSON.stringify(events, null, 2), 'utf-8');
  console.log(`events.json: ${events.length} events updated`);
}

// ====== 处理 blessings.json ======
function translateBlessings() {
  const fp = resolve(__dirname, '../src/data/blessings.json');
  const blessings = JSON.parse(readFileSync(fp, 'utf-8'));

  for (const b of blessings) {
    if (!b.name_en) {
      b.name_en = b.name
        .replace('护甲', 'Armor ').replace('祝福', 'Blessing')
        .replace('生命', 'Life ').replace('回复', 'Regen')
        .replace('汲取', 'Leech').replace('再生', 'Renewal')
        .replace('金币', 'Gold ').replace('馈赠', 'Gift')
        .replace('武器', 'Weapon ').replace('强化', 'Enhancement');
    }
    if (!b.description_en) {
      b.description_en = b.description
        .replace('获得', 'Gain ').replace('点护甲', ' armor')
        .replace('点生命', ' HP').replace('恢复', 'Heal for ');
    }
  }

  writeFileSync(fp, JSON.stringify(blessings, null, 2), 'utf-8');
  console.log(`blessings.json: ${blessings.length} blessings updated`);
}

// ====== 处理 combos.json ======
function translateCombos() {
  const fp = resolve(__dirname, '../src/data/combos.json');
  const combos = JSON.parse(readFileSync(fp, 'utf-8'));

  for (const c of combos) {
    if (!c.name_en) {
      c.name_en = c.name
        .replace('攻击', 'Attack').replace('防御', 'Defense')
        .replace('回复', 'Heal').replace('连击', 'Combo');
    }
    if (!c.description_en) {
      c.description_en = c.description
        .replace('使用', 'Use ').replace('后', ' after').replace('触发', ' triggers');
    }
  }

  writeFileSync(fp, JSON.stringify(combos, null, 2), 'utf-8');
  console.log(`combos.json: ${combos.length} combos updated`);
}

// ====== 主函数 ======
function main() {
  translateCharacters();
  translateEnemies();
  translateSkills();
  translateEvents();
  translateBlessings();
  translateCombos();
  console.log('\n✅ All data files have been updated with English fields.');
}

main();
