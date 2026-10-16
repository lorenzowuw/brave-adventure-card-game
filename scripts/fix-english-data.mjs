#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, '../src/data');

// ====== Events ======
const events = JSON.parse(readFileSync(`${DATA}/events.json`, 'utf-8'));
const eventEN = {
  forest_traveler: { title_en: 'Stranded Traveler', description_en: 'A wounded traveler lies by the roadside, seeking help.' },
  forest_wolf_pack: { title_en: 'Wolf Pack Ambush', description_en: 'Howling echoes through the trees as a pack of wolves encircles you.' },
  forest_ancient_tree: { title_en: 'Ancient Tree Whisper', description_en: 'An ancient tree seems to emanate a mysterious energy.' },
  ruins_shrine: { title_en: 'Ancient Shrine', description_en: 'A mysterious shrine stands quietly in the ruins.' },
  ruins_trap_chest: { title_en: 'Trapped Chest', description_en: 'An ornate chest sits in the center of the chamber, clearly booby-trapped.' },
  ruins_broken_library: { title_en: 'Broken Library', description_en: 'Ancient tomes lie scattered across the floor of this collapsed library.' },
  flame_trader: { title_en: 'Mysterious Merchant', description_en: 'A hooded figure tends a stall amidst the flames, offering exotic wares.' },
  flame_lava_forge: { title_en: 'Lava Forge', description_en: 'A massive forge powered by flowing lava stands before you.' },
  flame_imp_bet: { title_en: 'Imp Gambler', description_en: 'A mischievous imp challenges you to a game of chance.' },
  frost_pool: { title_en: 'Crystal Spring', description_en: 'A pool of crystal-clear water shimmers with an otherworldly light.' },
  frost_mirror_lake: { title_en: 'Mirror Lake', description_en: 'The frozen lake surface is so smooth it reflects like a mirror.' },
  frost_sleeping_spirit: { title_en: 'Sleeping Frost Spirit', description_en: 'A frost spirit slumbers within a block of ice.' },
  chaos_rift: { title_en: 'Void Rift', description_en: 'A tear in reality itself, crackling with chaotic energy.' },
  chaos_whispering_idol: { title_en: 'Whispering Idol', description_en: 'An idol whispers temptations, promising power at a price.' },
  chaos_last_camp: { title_en: 'Last Campfire', description_en: 'A dying campfire offers a moment of respite before the final battle.' },
  universal_altar: { title_en: 'Skill Upgrade Altar', description_en: 'An altar pulsating with mystical energy, offering card upgrades.' },
  wandering_cardmaster: { title_en: 'Wandering Card Master', description_en: 'A mysterious card master offers to trade cards with you.' },
};

for (const ev of events) {
  const en = eventEN[ev.id];
  if (en) {
    if (en.title_en) ev.title_en = en.title_en;
    if (en.description_en) ev.description_en = en.description_en;
  }
}

writeFileSync(`${DATA}/events.json`, JSON.stringify(events, null, 2), 'utf-8');
console.log(`Events: ${events.length} fixed`);

// ====== Blessings ======
const blessings = JSON.parse(readFileSync(`${DATA}/blessings.json`, 'utf-8'));
const blessingEN = {
  bless_first_strike: { name_en: 'First Strike', description_en: 'Deal 5 damage to the first enemy at the start of each battle.' },
  bless_wealth: { name_en: 'Prosperity', description_en: 'Start each battle with 10 extra gold.' },
  bless_resurgence: { name_en: 'Resurgence', description_en: 'When your HP drops to 0, restore 30% max HP once per run.' },
  bless_agile: { name_en: 'Quick Mind', description_en: 'Draw 1 extra card at the start of each turn.' },
  bless_energy: { name_en: 'Energy Surge', description_en: 'Start each battle with 1 extra energy.' },
  bless_tough: { name_en: 'Indomitable', description_en: 'Gain 5 max HP.' },
  bless_shield: { name_en: 'Initial Shield', description_en: 'Start each battle with 8 armor.' },
  bless_luck: { name_en: 'Lucky Charm', description_en: 'Card rewards are one rarity tier higher.' },
};
for (const b of blessings) {
  const en = blessingEN[b.id];
  if (en) { b.name_en = en.name_en; b.description_en = en.description_en; }
}
writeFileSync(`${DATA}/blessings.json`, JSON.stringify(blessings, null, 2), 'utf-8');
console.log(`Blessings: ${blessings.length} fixed`);

// ====== Combos ======
const combos = JSON.parse(readFileSync(`${DATA}/combos.json`, 'utf-8'));
if (combos.length > 0) {
  combos[0].name_en = 'Triple Strike';
  combos[0].description_en = 'Triggered by 3 consecutive Attack cards. The third Attack deals 50% bonus damage.';
  writeFileSync(`${DATA}/combos.json`, JSON.stringify(combos, null, 2), 'utf-8');
}
console.log(`Combos: ${combos.length} fixed`);

console.log('\nAll data English fields fixed!');
