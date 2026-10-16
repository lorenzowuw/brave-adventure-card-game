import fs from 'node:fs';

const path = 'src/data/enemies.json';
const enemies = JSON.parse(fs.readFileSync(path, 'utf8'));
const hpMultiplier = {
  boss_tree_king: 1.18,
  boss_ruins_watcher: 1.16,
  boss_flame_lord: 1.15,
  boss_frost_dragon: 1.14,
  boss_chaos_lord: 1.12,
};

for (const enemy of enemies) {
  if (enemy.tier !== 'boss') continue;
  enemy.hp = Math.round(enemy.hp * (hpMultiplier[enemy.id] ?? 1.14));
  for (const intent of [...enemy.intents, ...(enemy.phaseIntents ?? [])]) {
    if (intent.type === 'attack') intent.value = Math.max(intent.value + 1, Math.round(intent.value * 1.08));
    if (intent.type === 'defense') intent.value = Math.max(intent.value + 1, Math.round(intent.value * 1.1));
    if (intent.type === 'buff') intent.value = Math.max(intent.value + 1, Math.round(intent.value * 1.08));
    if (intent.applyStatus?.value) intent.applyStatus.value += enemy.id === 'boss_chaos_lord' ? 1 : 0;
  }
}

fs.writeFileSync(path, `${JSON.stringify(enemies, null, 2)}\n`);
console.log('boss difficulty tuned');
