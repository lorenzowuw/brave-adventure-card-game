#!/usr/bin/env node
/**
 * 将此前放大100倍的战斗数值缩回原量级。
 * 影响：卡牌 damage/heal/armor/damageToAll、角色 baseHp、敌人 hp。
 * 不影响金币、能量、抽牌、状态层数/回合数。
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../src/data');

function scaleDown(value) {
  return Math.max(1, Math.round(value / 100));
}

const skillsPath = resolve(DATA_DIR, 'skills.json');
const skills = JSON.parse(readFileSync(skillsPath, 'utf-8'));
for (const card of skills) {
  const effect = card.effect ?? {};
  if (effect.damage) effect.damage = scaleDown(effect.damage);
  if (effect.heal) effect.heal = scaleDown(effect.heal);
  if (effect.armor) effect.armor = scaleDown(effect.armor);
  if (effect.damageToAll) effect.damageToAll = scaleDown(effect.damageToAll);
}
writeFileSync(skillsPath, JSON.stringify(skills, null, 2), 'utf-8');

const charactersPath = resolve(DATA_DIR, 'characters.json');
const characters = JSON.parse(readFileSync(charactersPath, 'utf-8'));
for (const character of characters) {
  if (character.baseHp) character.baseHp = scaleDown(character.baseHp);
}
writeFileSync(charactersPath, JSON.stringify(characters, null, 2), 'utf-8');

const enemiesPath = resolve(DATA_DIR, 'enemies.json');
const enemies = JSON.parse(readFileSync(enemiesPath, 'utf-8'));
for (const enemy of enemies) {
  if (enemy.hp) enemy.hp = scaleDown(enemy.hp);
}
writeFileSync(enemiesPath, JSON.stringify(enemies, null, 2), 'utf-8');

console.log(`Scaled down ${skills.length} cards, ${characters.length} characters, ${enemies.length} enemies.`);
