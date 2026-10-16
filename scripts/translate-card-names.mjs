#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const skills = JSON.parse(readFileSync(resolve(__dirname, '../src/data/skills.json'), 'utf-8'));

// Known Chinese->English name mappings
const KNOWN = {
  // Ironwall
  '铁壁': 'Iron', '守卫': 'Guard', '盾牌猛击': 'Shield Bash',
  '重盾猛击': 'Heavy Shield Bash', '壁垒粉碎': 'Wall Smash',
  '挑衅架势': 'Taunt Stance', '盾墙推进': 'Shield Wall Advance',
  '堡垒誓约': 'Fortress Oath', '惩戒反击': 'Retaliate',
  '重击': 'Heavy Strike', '横扫': 'Sweep',
  '坚毅壁垒': 'Iron Bulwark',
  // Shadowblade
  '暗影': 'Shadow', '刺客': 'Assassin', '影刃': 'Shadow Blade',
  '背刺': 'Backstab', '刺杀': 'Assassinate',
  '淬毒刃': 'Poison Blade', '烟幕步': 'Smoke Step',
  '夜幕乱舞': 'Night Flurry', '无声处决': 'Silent Execution',
  '暗影步': 'Shadow Step', '毒刃': 'Venom Blade',
  // Lifesage
  '生命': 'Life', '贤者': 'Sage', '治愈': 'Heal',
  '蓬勃回春': 'Vibrant Revival', '生命绽放': 'Life Bloom',
  '自然庇护': 'Nature\'s Ward', '远古种子': 'Ancient Seed',
  '净化微风': 'Cleansing Breeze', '荆棘藤蔓': 'Thorn Vine',
  '孢子爆发': 'Spore Burst', '生命汲取': 'Life Drain',
  '复苏': 'Revive',
  // Taichimonk
  '太极': 'Tai Chi', '武僧': 'Monk', '太极拳': 'Tai Chi Fist',
  '揽雀尾': 'Grasp the Sparrow\'s Tail',
  '太极归元掌': 'Tai Chi Return Palm',
  '吐纳循环': 'Breath Cycle', '气贯长虹': 'Qi Surge',
  '四象连环': 'Four Symbols Combo', '单鞭': 'Single Whip',
  '气功波': 'Qi Wave', '云手推掌': 'Cloud Hands Push',
  // Ranger Merchant
  '游侠': 'Ranger', '商人': 'Merchant', '游侠商人': 'Ranger Merchant',
  '精准射击': 'Precise Shot', '快速射击': 'Quick Shot',
  '标记猎物': 'Mark Prey', '绊线陷阱': 'Snare Trap',
  '猎人齐射': 'Hunter Volley', '悬赏契约': 'Bounty Contract',
  '捕兽夹陷阱': 'Bear Trap', '散射': 'Scattershot',
  '金币护卫': 'Gold Guard',
  // Holy Light
  '圣光': 'Holy Light', '战士': 'Warrior', '圣光战士': 'Holy Light Warrior',
  '圣光斩': 'Holy Light Slash', '圣光护盾': 'Holy Light Shield',
  '圣光审判': 'Holy Judgment', '圣光之怒': 'Holy Wrath',
  '圣光普照': 'Holy Radiance', '神圣打击': 'Divine Strike',
  // Wealth Merchant
  '财富': 'Wealth', '财富商人': 'Wealth Merchant',
  '财富护盾': 'Wealth Shield', '金币投掷': 'Coin Toss',
  '幸运硬币': 'Lucky Coin', '钱能通神': 'Money Talks',
  '聚宝': 'Treasure Gathering',
  // Undead Priest
  '亡灵': 'Undead', '祭司': 'Priest', '亡灵祭司': 'Undead Priest',
  '死亡缠绕': 'Death Coil', '生命汲取': 'Life Drain',
  '亡灵复苏': 'Undead Resurrect', '死亡诅咒': 'Death Curse',
  '灵魂吞噬': 'Soul Devour', '暗影箭': 'Shadow Bolt',
  // Armor Breaker
  '破甲': 'Armor Break', '破甲战士': 'Armor Breaker',
  '破甲一击': 'Armor Break Strike', '重武器猛击': 'Heavy Weapon Slam',
  '终极破甲': 'Ultimate Armor Break', '狂暴': 'Berserk',
  '真实伤害': 'True Damage', '破甲斩': 'Armor Break Slash',
  // Element Mage
  '元素': 'Element', '法师': 'Mage', '元素法师': 'Element Mage',
  '火球术': 'Fireball', '闪电链': 'Chain Lightning',
  '冰霜新星': 'Frost Nova', '大地护盾': 'Earth Shield',
  '熔岩爆裂': 'Lava Burst', '地狱烈焰': 'Hellfire',
  '元素融合': 'Element Fusion', '火焰之环': 'Flame Ring',
  // Omnisage
  '全能': 'Omni', '全能贤者': 'Omnisage',
  '万能药': 'Panacea', '万能护盾': 'Omni Shield',
  '智慧启迪': 'Wisdom Enlightenment', '知识宝库': 'Library of Knowledge',
  '平衡之道': 'Balance',
  // Combat Master
  '格斗': 'Combat', '大师': 'Master', '格斗大师': 'Combat Master',
  '上勾拳': 'Uppercut', '组合拳': 'Combo Punch',
  '终结连击': 'Finishing Combo', '极限突破': 'Limit Break',
  '斗气爆发': 'Fighting Spirit Burst',
  // Frost Priest
  '冰霜': 'Frost', '祭司': 'Priest', '冰霜祭司': 'Frost Priest',
  '冰霜之触': 'Frost Touch', '寒冰治疗': 'Frost Heal',
  '冰结界': 'Ice Barrier', '极寒之触': 'Extreme Freeze',
  '冰霜之怒': 'Frost Fury', '暴风雪': 'Blizzard',
  '寒冰屏障': 'Ice Block', '冰霜之地': 'Frost Field',
  // Thorn Guardian
  '荆棘': 'Thorn', '荆棘守卫': 'Thorn Guardian',
  '荆棘甲壳': 'Thorn Carapace', '以血换甲': 'Blood for Armor',
  '棘刺吸血': 'Thorn Leech', '棘铠': 'Thorn Armor',
  '反刺': 'Counter Thorn', '荆棘绽放': 'Thorn Bloom',
  // Generic
  '基础攻击': 'Basic Attack', '基础防御': 'Basic Block',
  '冥想': 'Meditate', '轻型攻击': 'Light Attack',
  '魔法弹': 'Magic Bolt', '魔法护盾': 'Magic Shield',
  '生命之泉': 'Fountain of Life', '能量药剂': 'Energy Potion',
  '护甲药剂': 'Armor Potion', '智慧卷轴': 'Scroll of Wisdom',
  '抽牌药剂': 'Draw Potion',
  // Developer
  '开发者': 'Developer', '神之斩击': 'God Slash',
  '绝对屏障': 'Absolute Barrier',
  // Upgraded names (with rarity suffixes)
  '精进': 'Improved', '卓越': 'Superior',
  '史诗': 'Epic', '传说': 'Legendary', '神话': 'Mythic',
  // Skill types / common words
  '攻击': ' Attack', '防御': ' Defense',
  '回复': ' Heal', '增益': ' Buff',
  '·': ' ',
};

// Sort by length descending to match longer strings first
const sortedKeys = Object.keys(KNOWN).sort((a, b) => b.length - a.length);

function translateName(chinese) {
  let result = chinese;
  for (const key of sortedKeys) {
    if (result.includes(key)) {
      result = result.replace(key, KNOWN[key]);
    }
  }
  return result;
}

let count = 0;
for (const card of skills) {
  if (/[\u4e00-\u9fff]/.test(card.name_en || card.name)) {
    const translated = translateName(card.name);
    card.name_en = translated;
    count++;
  }
}

writeFileSync(resolve(__dirname, '../src/data/skills.json'), JSON.stringify(skills, null, 2), 'utf-8');
console.log(`Translated ${count} card names`);
