#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('src/systems/BattleSystem.ts', 'utf-8');

if (content.includes('totalRawDamage +=')) {
  console.log('rawDamage tracking already added');
  process.exit(0);
}

// Find the marker and add tracking after it
const marker = 'totalEnemyDamage += enemyResult.damageToPlayer;';
const idx = content.indexOf(marker);
if (idx < 0) {
  console.log('ERROR: Cannot find marker');
  process.exit(1);
}

const afterLine = content.indexOf('\n', idx);
const rest = content.slice(afterLine);

const insert = `\n    // Track raw attack damage for Thorn Guardian reflect
    if (intent.type === 'attack') {
      const weakValue = getStatusValue(eAfterStatus.statusEffects, 'weak');
      totalRawDamage += Math.max(0, intent.value - weakValue);
    }`;

content = content.slice(0, afterLine) + insert + rest;
writeFileSync('src/systems/BattleSystem.ts', content, 'utf-8');
console.log('Added rawDamage tracking');
