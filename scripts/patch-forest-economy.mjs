import fs from 'node:fs';

const path = 'src/data/enemies.json';
const enemies = JSON.parse(fs.readFileSync(path, 'utf8'));
const goldPatch = {
  forest_wolf: 7,
  forest_treant: 7,
  forest_shadow: 15,
  boss_tree_king: 34,
};
for (const enemy of enemies) {
  if (goldPatch[enemy.id]) enemy.rewards.gold = goldPatch[enemy.id];
}
fs.writeFileSync(path, `${JSON.stringify(enemies, null, 2)}\n`);
console.log('patched forest economy');
