import fs from 'node:fs';

// 定向补全 12 条升级链到红色（红=神话）。
// 原则：不改动任何现有卡的 effect，仅追加缺失高稀有度形态，并把各链当前终端卡 upgradeTo(null) 指向新链首。
const PATH = 'src/data/skills.json';
const skills = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const byId = new Map(skills.map((c) => [c.id, c]));

const CN_SUFFIX = { green: '·精进', blue: '·卓越', purple: '·史诗', orange: '·传说', red: '·神话' };
const EN_SUFFIX = { green: ' Improved', blue: ' Superior', purple: ' Epic', orange: ' Legendary', red: ' Mythic' };

// 描述生成（贴合现有 skills.json 文案格式）
function statusCN(st) {
  if (st.type === 'poison') return `施加${st.value}层中毒，持续${st.duration}回合`;
  if (st.type === 'bleed') return `施加${st.value}层流血，持续${st.duration}回合`;
  if (st.type === 'weak') return `施加虚弱${st.duration}回合`;
  if (st.type === 'burn') return `施加灼烧${st.duration}回合`;
  throw new Error('未知状态类型 ' + st.type);
}
function statusEN(st) {
  if (st.type === 'poison') return `apply ${st.value} Poison for ${st.duration} turns`;
  if (st.type === 'bleed') return `apply ${st.value} Bleed for ${st.duration} turns`;
  if (st.type === 'weak') return `Apply Weak to enemy for ${st.duration} turns`;
  if (st.type === 'burn') return `Apply Burn to enemy for ${st.duration} turns`;
  throw new Error('未知状态类型 ' + st.type);
}
function describeCN(e, healVerb) {
  const parts = [];
  if (e.damage) parts.push(`造成${e.damage}点伤害`);
  if (e.damageToAll) parts.push(`对所有敌人造成${e.damageToAll}点伤害`);
  if (e.armor) parts.push(`获得${e.armor}点护甲`);
  if (e.heal) parts.push(`${healVerb}${e.heal}点生命`);
  if (e.applyStatus) parts.push(statusCN(e.applyStatus));
  if (e.executeThreshold) parts.push(`若目标生命低于${Math.round(e.executeThreshold * 100)}%则直接斩杀`);
  return parts.join('，') + '。';
}
function describeEN(e) {
  const head = [];
  if (e.damage) head.push(`Deal ${e.damage} damage`);
  if (e.damageToAll) head.push(`Deal ${e.damageToAll} to all enemies`);
  if (e.armor) head.push(`Gain ${e.armor} armor`);
  if (e.heal) head.push(`Heal ${e.heal} HP`);
  if (e.applyStatus) head.push(statusEN(e.applyStatus));
  let out = head.join(', ');
  if (e.executeThreshold) out += `. Execute target below ${Math.round(e.executeThreshold * 100)}% HP`;
  return out + (e.executeThreshold ? '.' : '.');
}

// 12 条链定义：terminal = 当前终端卡 id；forms = 新增形态（按顺序）。
// nameCN/nameEN 缺省走 suffix 模式（基于终端名 + 稀有度后缀）；devourer 链显式命名。
const chains = [
  // A. 白卡单卡 -> 绿/蓝/紫/橙/红
  {
    terminal: 'undead_curse_1',
    style: 'suffix',
    ids: ['undead_curse_1_green', 'undead_curse_1_green_blue', 'undead_curse_1_green_blue_purple', 'undead_curse_1_green_blue_purple_orange', 'undead_curse_1_green_blue_purple_orange_red'],
    forms: [
      { rarity: 'green', effect: { damage: 4, applyStatus: { type: 'poison', value: 2, duration: 2 } } },
      { rarity: 'blue', effect: { damage: 6, applyStatus: { type: 'poison', value: 3, duration: 2 } } },
      { rarity: 'purple', effect: { damage: 8, applyStatus: { type: 'poison', value: 4, duration: 3 } } },
      { rarity: 'orange', effect: { damage: 11, applyStatus: { type: 'poison', value: 5, duration: 3 } } },
      { rarity: 'red', effect: { damage: 15, applyStatus: { type: 'poison', value: 6, duration: 3 } } },
    ],
  },
  {
    terminal: 'combatmaster_guard_1',
    style: 'suffix',
    ids: ['combatmaster_guard_1_green', 'combatmaster_guard_1_green_blue', 'combatmaster_guard_1_green_blue_purple', 'combatmaster_guard_1_green_blue_purple_orange', 'combatmaster_guard_1_green_blue_purple_orange_red'],
    forms: [
      { rarity: 'green', effect: { damage: 6, armor: 5 } },
      { rarity: 'blue', effect: { damage: 9, armor: 7 } },
      { rarity: 'purple', effect: { damage: 12, armor: 10 } },
      { rarity: 'orange', effect: { damage: 16, armor: 14 } },
      { rarity: 'red', effect: { damage: 21, armor: 19 } },
    ],
  },
  // B. 绿卡 AOE 单卡 -> 蓝/紫/橙/红
  {
    terminal: 'ironwall_sweep',
    style: 'suffix',
    ids: ['ironwall_sweep_blue', 'ironwall_sweep_blue_purple', 'ironwall_sweep_blue_purple_orange', 'ironwall_sweep_blue_purple_orange_red'],
    forms: [
      { rarity: 'blue', effect: { damage: 11, damageToAll: 5, armor: 6 } },
      { rarity: 'purple', effect: { damage: 14, damageToAll: 7, armor: 9 } },
      { rarity: 'orange', effect: { damage: 19, damageToAll: 10, armor: 13 } },
      { rarity: 'red', effect: { damage: 25, damageToAll: 13, armor: 17 } },
    ],
  },
  {
    terminal: 'taichimonk_qi_wave',
    style: 'suffix',
    ids: ['taichimonk_qi_wave_blue', 'taichimonk_qi_wave_blue_purple', 'taichimonk_qi_wave_blue_purple_orange', 'taichimonk_qi_wave_blue_purple_orange_red'],
    forms: [
      { rarity: 'blue', effect: { damage: 11, damageToAll: 6, armor: 5 } },
      { rarity: 'purple', effect: { damage: 14, damageToAll: 8, armor: 7 } },
      { rarity: 'orange', effect: { damage: 19, damageToAll: 11, armor: 10 } },
      { rarity: 'red', effect: { damage: 25, damageToAll: 14, armor: 13 } },
    ],
  },
  {
    terminal: 'lifesage_spore_burst',
    style: 'suffix',
    ids: ['lifesage_spore_burst_blue', 'lifesage_spore_burst_blue_purple', 'lifesage_spore_burst_blue_purple_orange', 'lifesage_spore_burst_blue_purple_orange_red'],
    forms: [
      { rarity: 'blue', effect: { damageToAll: 7, applyStatus: { type: 'weak', value: 2, duration: 2 } } },
      { rarity: 'purple', effect: { damageToAll: 10, applyStatus: { type: 'weak', value: 2, duration: 3 } } },
      { rarity: 'orange', effect: { damageToAll: 13, applyStatus: { type: 'weak', value: 3, duration: 3 } } },
      { rarity: 'red', effect: { damageToAll: 17, applyStatus: { type: 'weak', value: 4, duration: 3 } } },
    ],
  },
  {
    terminal: 'frostpriest_ice_field',
    style: 'suffix',
    ids: ['frostpriest_ice_field_blue', 'frostpriest_ice_field_blue_purple', 'frostpriest_ice_field_blue_purple_orange', 'frostpriest_ice_field_blue_purple_orange_red'],
    forms: [
      { rarity: 'blue', effect: { damageToAll: 7, applyStatus: { type: 'weak', value: 2, duration: 2 } } },
      { rarity: 'purple', effect: { damageToAll: 10, applyStatus: { type: 'weak', value: 2, duration: 3 } } },
      { rarity: 'orange', effect: { damageToAll: 13, applyStatus: { type: 'weak', value: 3, duration: 3 } } },
      { rarity: 'red', effect: { damageToAll: 17, applyStatus: { type: 'weak', value: 4, duration: 3 } } },
    ],
  },
  {
    terminal: 'elementmage_flame_ring',
    style: 'suffix',
    ids: ['elementmage_flame_ring_blue', 'elementmage_flame_ring_blue_purple', 'elementmage_flame_ring_blue_purple_orange', 'elementmage_flame_ring_blue_purple_orange_red'],
    forms: [
      { rarity: 'blue', effect: { damageToAll: 10, applyStatus: { type: 'burn', value: 2, duration: 2 } } },
      { rarity: 'purple', effect: { damageToAll: 13, applyStatus: { type: 'burn', value: 3, duration: 2 } } },
      { rarity: 'orange', effect: { damageToAll: 17, applyStatus: { type: 'burn', value: 4, duration: 2 } } },
      { rarity: 'red', effect: { damageToAll: 22, applyStatus: { type: 'burn', value: 5, duration: 2 } } },
    ],
  },
  {
    terminal: 'holylight_radiance',
    style: 'suffix',
    ids: ['holylight_radiance_blue', 'holylight_radiance_blue_purple', 'holylight_radiance_blue_purple_orange', 'holylight_radiance_blue_purple_orange_red'],
    forms: [
      { rarity: 'blue', effect: { damageToAll: 9, heal: 11 } },
      { rarity: 'purple', effect: { damageToAll: 12, heal: 14 } },
      { rarity: 'orange', effect: { damageToAll: 16, heal: 18 } },
      { rarity: 'red', effect: { damageToAll: 21, heal: 24 } },
    ],
  },
  {
    terminal: 'thornguardian_thorn_bloom',
    style: 'suffix',
    ids: ['thornguardian_thorn_bloom_blue', 'thornguardian_thorn_bloom_blue_purple', 'thornguardian_thorn_bloom_blue_purple_orange', 'thornguardian_thorn_bloom_blue_purple_orange_red'],
    forms: [
      { rarity: 'blue', effect: { damageToAll: 7, armor: 18 } },
      { rarity: 'purple', effect: { damageToAll: 10, armor: 23 } },
      { rarity: 'orange', effect: { damageToAll: 13, armor: 30 } },
      { rarity: 'red', effect: { damageToAll: 17, armor: 38 } },
    ],
  },
  // C. 吞噬者链续补到红（显式命名，沿用各链现风格）
  {
    terminal: 'devourer_bite_3',
    style: 'explicit',
    ids: ['devourer_bite_4', 'devourer_bite_5', 'devourer_bite_6'],
    forms: [
      { rarity: 'purple', effect: { damage: 17, applyStatus: { type: 'bleed', value: 4, duration: 2 } }, nameCN: '裂魂噬咬', nameEN: 'Soulrend Bite' },
      { rarity: 'orange', effect: { damage: 22, applyStatus: { type: 'bleed', value: 5, duration: 2 } }, nameCN: '灭世獠牙', nameEN: 'Worldbane Fang' },
      { rarity: 'red', effect: { damage: 28, applyStatus: { type: 'bleed', value: 6, duration: 2 } }, nameCN: '万魂吞噬', nameEN: 'Myriad Soul Devour' },
    ],
  },
  {
    terminal: 'devourer_feast_green',
    style: 'explicit',
    ids: ['devourer_feast_green_blue', 'devourer_feast_green_blue_purple', 'devourer_feast_green_blue_purple_orange', 'devourer_feast_green_blue_purple_orange_red'],
    forms: [
      { rarity: 'blue', effect: { damage: 10, heal: 7 }, nameCN: '饕餮盛宴', nameEN: 'Gluttonous Feast' },
      { rarity: 'purple', effect: { damage: 13, heal: 9 }, nameCN: '无尽吞餐', nameEN: 'Endless Gorging' },
      { rarity: 'orange', effect: { damage: 18, heal: 12 }, nameCN: '噬界饕食', nameEN: 'World-Eating Banquet' },
      { rarity: 'red', effect: { damage: 24, heal: 16 }, nameCN: '万物归腹', nameEN: 'All Returns to the Maw' },
    ],
  },
  {
    terminal: 'devourer_maw_purple',
    style: 'explicit',
    ids: ['devourer_maw_purple_orange', 'devourer_maw_purple_orange_red'],
    forms: [
      { rarity: 'orange', effect: { damage: 16, executeThreshold: 0.6 }, nameCN: '深渊大口', nameEN: 'Abyssal Maw' },
      { rarity: 'red', effect: { damage: 21, executeThreshold: 0.65 }, nameCN: '终焉吞天', nameEN: 'Final Devourer' },
    ],
  },
];

function baseName(cn) {
  // 去除已有稀有度后缀（·精进 等），AOE/白卡链终端无后缀直接返回。
  const idx = cn.indexOf('·');
  return idx === -1 ? cn : cn.slice(0, idx);
}

const additions = [];
const newIds = new Set();

for (const chain of chains) {
  const terminal = byId.get(chain.terminal);
  if (!terminal) throw new Error('找不到终端卡 ' + chain.terminal);
  if (terminal.upgradeTo) throw new Error(`${chain.terminal} 已有 upgradeTo=${terminal.upgradeTo}，非 null 终端`);
  if (chain.ids.length !== chain.forms.length) throw new Error('ids/forms 数量不匹配 ' + chain.terminal);

  const healVerb = terminal.description && terminal.description.includes('恢复') ? '恢复' : '回复';
  const cnBase = baseName(terminal.name);
  const enBase = terminal.name_en.replace(/ (Improved|Superior|Epic|Legendary|Mythic)$/, '');

  // 把终端卡的 upgradeTo 指向新链首（这是唯一允许的现有卡改动）
  const updatedTerminal = { ...terminal, upgradeTo: chain.ids[0] };
  byId.set(terminal.id, updatedTerminal);

  let prevTier = terminal.tier;
  chain.forms.forEach((form, i) => {
    const id = chain.ids[i];
    if (byId.has(id) || newIds.has(id)) throw new Error('重复 id ' + id);
    const nameCN = chain.style === 'explicit' ? form.nameCN : cnBase + CN_SUFFIX[form.rarity];
    const nameEN = chain.style === 'explicit' ? form.nameEN : enBase + EN_SUFFIX[form.rarity];
    const card = {
      id,
      name: nameCN,
      tier: prevTier + 1,
      rarity: form.rarity,
      cost: terminal.cost,
      type: terminal.type,
      effect: form.effect,
      description: describeCN(form.effect, healVerb),
      upgradeTo: i < chain.forms.length - 1 ? chain.ids[i + 1] : null,
      characterBind: terminal.characterBind,
      flavorText: terminal.flavorText,
      tags: [...terminal.tags],
      name_en: nameEN,
      description_en: describeEN(form.effect),
      flavorText_en: terminal.flavorText_en,
    };
    additions.push(card);
    newIds.add(id);
    prevTier += 1;
  });
}

// 重建 skills：现有卡用 byId 中的（含终端 upgradeTo 更新），再追加新卡。
const rebuilt = skills.map((c) => byId.get(c.id)).concat(additions);

fs.writeFileSync(PATH, JSON.stringify(rebuilt, null, 2) + '\n', 'utf8');
console.log(`新增 ${additions.length} 张卡，更新 ${chains.length} 处 upgradeTo。`);
