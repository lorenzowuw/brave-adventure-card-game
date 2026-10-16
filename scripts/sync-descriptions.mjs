#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const skills = JSON.parse(readFileSync(resolve(__dirname, '../src/data/skills.json'), 'utf-8'));

const STATUS_ZH = {
  burn:'灼烧', poison:'中毒', bleed:'流血', fragile:'脆弱',
  weak:'虚弱', paralyze:'麻痹', empower:'强化', regen:'再生',
  armor:'护甲', agile:'敏捷', taunt:'嘲讽', stun:'眩晕',
};

function genZh(e) {
  const parts = [];
  if (e.goldCost) parts.push(`消耗${e.goldCost}金币`);
  if (e.damage) {
    let t = `造成${e.damage}点伤害`;
    if (e.damageMultiplier && e.damageMultiplier > 1) t += `，连击${e.damageMultiplier}次`;
    parts.push(t);
  }
  if (e.damageToAll) parts.push(`对所有敌人造成${e.damageToAll}点伤害`);
  if (e.armor) parts.push(`获得${e.armor}点护甲`);
  if (e.heal) parts.push(`恢复${e.heal}点生命`);
  if (e.applyStatus) {
    const s = e.applyStatus;
    const name = STATUS_ZH[s.type] || s.type;
    const target = s.target === 'player' ? '自身' : '';
    const suffix = s.duration ? `${s.duration}回合` : '';
    parts.push(`施加${name}${suffix}`);
  }
  if (e.drawCards) parts.push(`抽${e.drawCards}张牌`);
  if (e.energyGain) parts.push(`获得${e.energyGain}点能量`);
  if (e.goldGain) parts.push(`获得${e.goldGain}金币`);
  return parts.length > 0 ? parts.join('，') + '。' : '';
}

const STATUS_EN = {
  burn:'Burn', poison:'Poison', bleed:'Bleed', fragile:'Fragile',
  weak:'Weak', paralyze:'Paralyze', empower:'Empower', regen:'Regen',
  armor:'Armor', agile:'Agile', taunt:'Taunt', stun:'Stun',
};

function genEn(e) {
  const parts = [];
  if (e.goldCost) parts.push(`Spend ${e.goldCost} gold`);
  if (e.damage) {
    let t = `Deal ${e.damage} damage`;
    if (e.damageMultiplier && e.damageMultiplier > 1) t += ` x${e.damageMultiplier} hits`;
    parts.push(t);
  }
  if (e.damageToAll) parts.push(`Deal ${e.damageToAll} to all enemies`);
  if (e.armor) parts.push(`Gain ${e.armor} armor`);
  if (e.heal) parts.push(`Heal ${e.heal} HP`);
  if (e.applyStatus) {
    const s = e.applyStatus;
    const name = STATUS_EN[s.type] || s.type;
    const target = s.target === 'player' ? 'self' : 'enemy';
    parts.push(`Apply ${name} to ${target} for ${s.duration} turn${s.duration > 1 ? 's' : ''}`);
  }
  if (e.drawCards) parts.push(`Draw ${e.drawCards} card${e.drawCards > 1 ? 's' : ''}`);
  if (e.energyGain) parts.push(`Gain ${e.energyGain} energy`);
  if (e.goldGain) parts.push(`Gain ${e.goldGain} gold`);
  return parts.length > 0 ? parts.join(', ') + '.' : '';
}

let count = 0;
for (const card of skills) {
  const newZh = genZh(card.effect);
  const newEn = genEn(card.effect);
  if (newZh && newZh !== card.description) {
    card.description = newZh;
    count++;
  }
  if (newEn && newEn !== card.description_en) {
    card.description_en = newEn;
    count++;
  }
}

writeFileSync(resolve(__dirname, '../src/data/skills.json'), JSON.stringify(skills, null, 2), 'utf-8');
console.log(`Updated ${count} descriptions`);
