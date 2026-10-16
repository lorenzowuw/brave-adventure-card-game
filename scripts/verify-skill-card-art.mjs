import fs from 'node:fs';
import path from 'node:path';

const skills = JSON.parse(fs.readFileSync('src/data/skills.json', 'utf8'));
const missing = skills
  .map(skill => `${skill.id}.svg`)
  .filter(fileName => !fs.existsSync(path.join('public/assets/skill_icons', fileName)));

if (missing.length > 0) {
  console.error(`Missing ${missing.length} skill art files:`);
  for (const fileName of missing) console.error(`- ${fileName}`);
  process.exit(1);
}

console.log(`Verified ${skills.length} skill art files.`);
