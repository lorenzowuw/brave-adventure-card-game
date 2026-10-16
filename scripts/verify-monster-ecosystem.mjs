import fs from 'node:fs';

const enemies = JSON.parse(fs.readFileSync('src/data/enemies.json', 'utf8'));
const skills = JSON.parse(fs.readFileSync('src/data/skills.json', 'utf8'));
const skillTags = new Set(skills.flatMap(skill => skill.tags ?? []));
const missing = [];
const unreachableWeaknesses = [];

for (const enemy of enemies) {
  if (!enemy.traits?.length) missing.push(`${enemy.id}: missing traits`);
  if (!enemy.weaknesses?.length) missing.push(`${enemy.id}: missing weaknesses`);
  if (!enemy.traitHints?.length) missing.push(`${enemy.id}: missing traitHints`);
  for (const weakness of enemy.weaknesses ?? []) {
    if (!skillTags.has(weakness)) unreachableWeaknesses.push(`${enemy.id}: weakness ${weakness} has no matching skill tag`);
  }
}

if (missing.length || unreachableWeaknesses.length) {
  for (const item of [...missing, ...unreachableWeaknesses]) console.error(item);
  process.exit(1);
}

console.log(`Monster ecosystem verified: ${enemies.length} enemies, ${skillTags.size} skill tags.`);
