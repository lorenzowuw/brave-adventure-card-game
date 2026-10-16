import fs from 'node:fs';

const path = 'src/data/events.json';
const events = JSON.parse(fs.readFileSync(path, 'utf8'));

const patches = {
  forest_traveler: {
    help: {
      description: '消耗体力帮助旅人脱困，手牌上限 +1',
      effects: { hpChange: -3, cardReward: 'generic_shield_potion', handLimitChange: 1 },
      outcomeText: '旅人感激你的帮助，将家传的格挡技巧教给了你。你也学会了整理行囊，手牌上限提升。',
    },
  },
  ruins_shrine: {
    offer_gold: {
      description: '向祭坛献上10金币，每回合摸牌 +1',
      effects: { goldChange: -10, hpChange: 10, drawPerTurnChange: 1 },
      outcomeText: '祭坛闪耀光芒，你的伤口被治愈，思绪也变得更敏捷。',
    },
  },
  frost_pool: {
    drink: {
      description: '恢复生命值和能量，手牌上限 +1',
      effects: { hpChange: 15, energyChange: 2, handLimitChange: 1 },
      outcomeText: '冰凉的泉水涌入体内，你感到疲劳一扫而空，掌控力也更强了。',
    },
  },
  chaos_rift: {
    enter: {
      description: '冒险进入虚空：手牌上限 -1，但获得强力卡牌',
      effects: { hpChange: -10, cardReward: 'holylight_strike_2', handLimitChange: -1 },
      outcomeText: '你在虚空中经历了严峻的考验，带走了一张强大的卡牌，但混沌压缩了你的手牌上限。',
    },
  },
};

for (const event of events) {
  const eventPatch = patches[event.id];
  if (!eventPatch) continue;
  for (const choice of event.choices) {
    const patch = eventPatch[choice.id];
    if (patch) Object.assign(choice, patch);
  }
}

fs.writeFileSync(path, `${JSON.stringify(events, null, 2)}\n`);
console.log('patched hand events');
