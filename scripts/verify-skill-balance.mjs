import fs from 'node:fs';

const skills = JSON.parse(fs.readFileSync('src/data/skills.json', 'utf8'));
const rarityRank = { white: 1, green: 2, blue: 3, purple: 4, orange: 5, red: 6 };

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function score(card) {
  const effect = card.effect ?? {};
  const status = effect.applyStatus;
  const statusScore = status
    ? (status.value ?? 0) * (status.duration ?? 1) * ({
      burn: 1.2,
      poison: 1.15,
      bleed: 1.25,
      fragile: 2.2,
      weak: 2,
      paralyze: 5,
      empower: 0.35,
      regen: 0.85,
    }[status.type] ?? 1)
    : 0;
  const targetMultiplier = status?.target === 'player' ? 0.85 : 1;
  const raw =
    (effect.damage ?? 0) * (effect.damageMultiplier ?? 1) +
    (effect.armor ?? 0) * 0.75 +
    (effect.heal ?? 0) * 0.85 +
    (effect.drawCards ?? 0) * 5 +
    (effect.energyGain ?? 0) * 4 +
    (effect.goldGain ?? 0) * 1.1 -
    (effect.goldCost ?? 0) * 0.45 +
    statusScore * targetMultiplier;
  return raw / Math.max(1, card.cost || 1);
}

function isGeneratedUpgrade(skill) {
  return /_(green|blue|purple|orange|red)(_|$)/.test(skill.id);
}

const exactGroups = new Map();
for (const skill of skills.filter(skill => skill.rarity !== 'red' && !isGeneratedUpgrade(skill))) {
  const key = `${skill.cost}|${skill.type}|${stable(skill.effect)}`;
  exactGroups.set(key, [...(exactGroups.get(key) ?? []), skill]);
}

const exactIssues = [...exactGroups.values()].filter(group => new Set(group.map(card => card.rarity)).size > 1);
const upgradeIssues = [];
const byId = new Map(skills.map(skill => [skill.id, skill]));
for (const skill of skills.filter(skill => skill.upgradeTo)) {
  const next = byId.get(skill.upgradeTo);
  if (!next) {
    upgradeIssues.push(`${skill.id} -> missing ${skill.upgradeTo}`);
    continue;
  }
  if (rarityRank[next.rarity] < rarityRank[skill.rarity]) {
    upgradeIssues.push(`${skill.id} -> ${next.id} rarity down`);
  }
  if (score(next) + 0.25 < score(skill)) {
    upgradeIssues.push(`${skill.id} (${score(skill).toFixed(2)}) -> ${next.id} (${score(next).toFixed(2)}) score down`);
  }
}

if (exactIssues.length || upgradeIssues.length) {
  if (exactIssues.length) {
    console.error('Exact cross-rarity duplicate effects:');
    for (const group of exactIssues) {
      console.error(`- ${group.map(card => `${card.id}:${card.rarity}`).join(', ')}`);
    }
  }
  if (upgradeIssues.length) {
    console.error('Upgrade issues:');
    for (const issue of upgradeIssues) console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Skill balance verified: ${skills.length} cards.`);
