// ============================================================
// 《勇者大冒险》- 冒险流程管理器
// 遵循 game-vibe patterns.md 场景架构模式
// 所有数值引用配置，不硬编码
// ============================================================

import type {
  CharacterConfig,
  SkillCard,
  SkillEffect,
  CombatState,
  RunState,
  PlayerProgress,
  MapConfig,
  MapNode,
  Blessing,
  GameEvent,
  GlobalUnlocks,
  RunHistoryEntry,
  CharacterClass,
  AreaId,
  EnemyConfig,
  EnemyInstance,
  EnemyTurnStep,
  RarityColor,
} from '../types/game';
import { AREA_NAMES } from '../types/game';
import constantsData from '../data/constants.json';
import charactersData from '../data/characters.json';
import skillsData from '../data/skills.json';
import mapsData from '../data/maps.json';
import enemiesData from '../data/enemies.json';
import eventsData from '../data/events.json';
import blessingsData from '../data/blessings.json';
import combosData from '../data/combos.json';
import {
  createEnemyInstance,
  executeBattleAction,
  endTurn,
  applyBlessings,
  addStatus,
  PARALYZE_CARD_FAIL_CHANCE,
  removeStatusStacks,
} from './BattleSystem';
import { eventBus } from './EventBus';

// —— 类型断言 ——
const constants = constantsData as typeof constantsData;
const characters = charactersData as CharacterConfig[];
const allSkills = skillsData as SkillCard[];
const maps = mapsData as MapConfig[];
const allEnemies = enemiesData as EnemyConfig[];
const allEvents = eventsData as GameEvent[];
const allBlessings = blessingsData as Blessing[];
const allCombos = combosData as Array<{
  id: string;
  name: string;
  description: string;
  requiredTypes: string[];
}>;
const LIFESAGE_PASSIVE_HEAL = 3;
const NODE_LABELS: Record<MapNode['type'], string> = {
  battle: '怪物出没',
  elite: '强敌镇守',
  boss: 'Boss',
  shop: '游商营地',
  event: '神秘事件',
  rest: '安全营地',
  reward: '宝藏洞穴',
  skill_altar: '古老祭坛',
  burn_altar: '焚卡炉',
};
const EARLY_NODE_TYPES: MapNode['type'][] = ['battle', 'battle', 'battle', 'event', 'shop', 'rest'];
const MID_NODE_TYPES: MapNode['type'][] = ['battle', 'battle', 'battle', 'elite', 'event', 'shop', 'reward', 'skill_altar', 'skill_altar'];
const LATE_NODE_TYPES: MapNode['type'][] = ['battle', 'battle', 'elite', 'elite', 'reward', 'skill_altar', 'skill_altar', 'burn_altar', 'rest'];
const REPEATABLE_NODE_TYPES = new Set<MapNode['type']>(['battle', 'elite', 'event']);
const MONSTER_LAYER_ELITE_NODE_CHANCE = 0.18;
export const WEALTH_ACTIVE_MAX_GOLD_COST = 40;
export const WEALTH_ACTIVE_DAMAGE_MULTIPLIER = 2;
export const WEALTH_ACTIVE_ENERGY_COST = 1;

function shuffleCards<T>(cards: T[]): T[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = result[i];
    result[i] = result[j];
    result[j] = current;
  }
  return result;
}

function drawCards(
  hand: SkillCard[],
  deck: SkillCard[],
  discard: SkillCard[],
  count: number,
  handLimit = constants.maxHandSize,
  allowOverLimit = false,
): { hand: SkillCard[]; deck: SkillCard[]; discard: SkillCard[]; drawnIndexes: number[]; blockedByEmptyPiles: boolean } {
  let nextHand = [...hand];
  let drawnIndexes: number[] = [];
  let nextDeck = [...deck];
  let nextDiscard = [...discard];
  let blockedByEmptyPiles = false;

  for (let i = 0; i < count && (allowOverLimit || nextHand.length < handLimit); i++) {
    if (nextDeck.length === 0 && nextDiscard.length > 0) {
      nextDeck = shuffleCards(nextDiscard);
      nextDiscard = [];
    }

    const [drawn, ...remainingDeck] = nextDeck;
    if (!drawn) {
      blockedByEmptyPiles = true;
      break;
    }
    drawnIndexes = [...drawnIndexes, nextHand.length];
    nextHand = [...nextHand, drawn];
    nextDeck = remainingDeck;
  }

  return { hand: nextHand, deck: nextDeck, discard: nextDiscard, drawnIndexes, blockedByEmptyPiles };
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function getRandomEnemyIds(areaId: AreaId, tier: 'normal' | 'elite', forcePack = false): string[] {
  const pool = allEnemies.filter(enemy => enemy.area === areaId && enemy.tier === tier);
  const fallback = allEnemies.filter(enemy => enemy.tier === tier);
  const source = shuffleCards(pool.length > 0 ? pool : fallback);
  const maxPack = Math.min(3, source.length);
  const count = tier === 'elite'
    ? 1
    : forcePack
      ? randomInt(Math.min(2, maxPack), maxPack)
      : randomInt(1, Math.min(2, source.length));

  return source.slice(0, count).map(enemy => enemy.id);
}

/** 取某区域某档次的怪物 id 池（区域无怪时回退到全局同档次池） */
function getAreaTierPool(areaId: AreaId, tier: 'normal' | 'elite'): string[] {
  const pool = allEnemies.filter(enemy => enemy.area === areaId && enemy.tier === tier);
  const fallback = allEnemies.filter(enemy => enemy.tier === tier);
  return (pool.length > 0 ? pool : fallback).map(enemy => enemy.id);
}

/**
 * 让同层多个战斗/精英节点的"主怪"(enemies[0]，即实际开打的怪)尽量互不相同。
 * 战斗用 normal 池、精英用 elite 池，分别去重；池子不足时才允许重复。
 */
function dedupePrimaryEnemies(nodes: MapNode[], areaId: AreaId): MapNode[] {
  const usedByTier: Record<'normal' | 'elite', Set<string>> = {
    normal: new Set(),
    elite: new Set(),
  };
  return nodes.map(node => {
    if (node.type !== 'battle' && node.type !== 'elite') return node;
    const ids = node.enemies ?? [];
    if (ids.length === 0) return node;
    const tier: 'normal' | 'elite' = node.type === 'elite' ? 'elite' : 'normal';
    const used = usedByTier[tier];
    if (!used.has(ids[0])) {
      used.add(ids[0]);
      return node;
    }
    const replacement = shuffleCards(getAreaTierPool(areaId, tier)).find(id => !used.has(id));
    if (!replacement) {
      // 池子已耗尽，只能保留重复（如 ruins/flame/chaos 仅 1 种普通怪）
      used.add(ids[0]);
      return node;
    }
    used.add(replacement);
    // 把未用过的怪换到首位，保持原节点的怪数量（pack 标签语义不变）
    const swapIndex = ids.indexOf(replacement);
    const nextIds = [...ids];
    if (swapIndex > 0) {
      [nextIds[0], nextIds[swapIndex]] = [nextIds[swapIndex], nextIds[0]];
    } else {
      nextIds[0] = replacement;
    }
    return { ...node, enemies: nextIds };
  });
}

function getNodeTypePool(layerIndex: number, totalLayers: number): MapNode['type'][] {
  if (layerIndex === 0) return EARLY_NODE_TYPES;
  if (layerIndex >= totalLayers - 1) return LATE_NODE_TYPES;
  return MID_NODE_TYPES;
}

function getCombatEnemies(combat: CombatState): EnemyInstance[] {
  return [combat.enemy, ...(combat.extraEnemies ?? [])];
}

function getDefeatedEnemies(combat: CombatState): EnemyInstance[] {
  const defeated = [...(combat.defeatedEnemies ?? []), ...getCombatEnemies(combat).filter(enemy => enemy.currentHp <= 0)];
  return Array.from(new Map(defeated.map(enemy => [enemy.instanceId, enemy])).values());
}

function normalizeCombatEnemies(combat: CombatState): CombatState {
  const allEnemies = getCombatEnemies(combat);
  const alive = allEnemies.filter(enemy => enemy.currentHp > 0);
  const defeated = allEnemies.filter(enemy => enemy.currentHp <= 0);
  const defeatedEnemies = Array.from(new Map([...(combat.defeatedEnemies ?? []), ...defeated].map(enemy => [enemy.instanceId, enemy])).values());

  return {
    ...combat,
    enemy: alive[0] ?? defeated[0] ?? combat.enemy,
    extraEnemies: alive.slice(1),
    defeatedEnemies,
    currentEnemyIndex: alive.length > 0 ? combat.currentEnemyIndex % alive.length : 0,
  };
}

function getCombatReward(
  defeatedEnemies: EnemyInstance[],
  state: RunState,
  goldGained = 0,
  goldSpent = 0,
): { expGain: number; baseGold: number; finalGoldGain: number; rewardRarity: RarityColor } {
  const expGain = defeatedEnemies.reduce((sum, enemy) => sum + enemy.rewards.exp, 0);
  const baseGold = defeatedEnemies.reduce((sum, enemy) => sum + enemy.rewards.gold, 0);
  const passiveGoldBonus = state.character.id === 'wealthmerchant' ? Math.round(baseGold * 0.75) : 0;
  const scaledGold = Math.round((baseGold + passiveGoldBonus) * (1 + state.risk / 200));
  const rewardRarity = defeatedEnemies.reduce<RarityColor>((rarity, enemy) => (
    RARITY_ORDER.indexOf(enemy.rewards.cardRarity) > RARITY_ORDER.indexOf(rarity)
      ? enemy.rewards.cardRarity
      : rarity
  ), defeatedEnemies[0]?.rewards.cardRarity ?? 'white');

  return {
    expGain,
    baseGold,
    finalGoldGain: Math.max(0, scaledGold + goldGained - goldSpent),
    rewardRarity,
  };
}

function isFinalBossDefeated(state: RunState, defeatedEnemies: EnemyInstance[]): boolean {
  return defeatedEnemies.some(enemy => enemy.tier === 'boss') && getNextArea(state.currentArea) === null;
}

function createCombatVictoryState(
  state: RunState,
  combatAfterEnd: CombatState,
  defeatedEnemies: EnemyInstance[],
  reward: { expGain: number; finalGoldGain: number; rewardRarity: RarityColor },
  message: string,
  extra?: Partial<RunState>,
): RunState {
  const nextProgress = applyLevelProgress({
    ...state.progress,
    exp: state.progress.exp + reward.expGain,
  });
  const isFinalBoss = isFinalBossDefeated(state, defeatedEnemies);
  const expGainEvent = reward.expGain > 0 && !isFinalBoss && state.progress.level < LEVEL_BONUSES.length
    ? {
      fromExp: state.progress.exp,
      toExp: nextProgress.exp,
      fromLevel: state.progress.level,
      toLevel: nextProgress.level,
      playOnMap: false,
    }
    : undefined;
  const nextMaxHp = getMaxHp(state.character, nextProgress);
  const levelUpHeal = getLevelUpHeal(state.progress, nextProgress, nextMaxHp);
  const blessingHeal = getBlessingEffectTotal(state, 'postCombatHeal');
  const nextHp = Math.min(nextMaxHp, combatAfterEnd.playerHp + levelUpHeal + blessingHeal);
  const discoveredEnemies = Array.from(new Set([...state.discoveredEnemies, ...defeatedEnemies.map(enemy => enemy.id)]));

  return {
    ...state,
    ...extra,
    progress: nextProgress,
    combat: null,
    chosenBlessings: state.chosenBlessings.filter((blessing) => blessing.duration !== 'battle'),
    gold: Math.max(0, state.gold + reward.finalGoldGain + getBlessingEffectTotal(state, 'goldGain')),
    deck: [...combatAfterEnd.deck, ...combatAfterEnd.hand, ...combatAfterEnd.discard, ...(combatAfterEnd.playerInPlay ?? [])],
    currentHp: nextHp,
    currentMaxHp: nextMaxHp,
    rewardChoices: isFinalBoss ? [] : getCardRewards(
      getAreaRewardRange(state.currentArea, getRewardSource(defeatedEnemies)),
      state.character.id,
      3 + getBlessingEffectTotal(state, 'rewardChoiceBonus'),
    ),
    lastExpGain: expGainEvent,
    undeadKillCount: state.character.id === 'undeadpriest' ? (state.undeadKillCount ?? 0) + defeatedEnemies.length : (state.undeadKillCount ?? 0),
    discoveredEnemies,
    phase: isFinalBoss ? 'victory' : 'reward',
    rewardAfter: undefined,
    message: levelUpHeal > 0 ? `${message} 升级恢复 ${levelUpHeal} 生命。` : message,
  };
}

function createRandomNode(areaId: AreaId, layerIndex: number, nodeIndex: number, totalLayers: number, forcedType?: MapNode['type']): MapNode {
  const type = forcedType ?? shuffleCards(getNodeTypePool(layerIndex, totalLayers))[0];
  const id = `${areaId}_${layerIndex + 1}_${nodeIndex + 1}_${type}_${Math.random().toString(36).slice(2, 6)}`;
  const baseNode = {
    type,
    id,
    label: NODE_LABELS[type],
  };

  if (type === 'battle') {
    const forcePack = layerIndex > 0 && Math.random() < (layerIndex >= totalLayers - 2 ? 0.55 : 0.35);
    const enemies = getRandomEnemyIds(areaId, 'normal', forcePack);
    return { ...baseNode, label: enemies.length > 1 ? '兽群出没' : baseNode.label, enemies };
  }
  if (type === 'elite') {
    return { ...baseNode, enemies: getRandomEnemyIds(areaId, 'elite') };
  }

  return baseNode;
}

function getRandomLayerTypes(layerIndex: number, totalLayers: number, nodeCount: number): MapNode['type'][] {
  const pool = shuffleCards(getNodeTypePool(layerIndex, totalLayers));
  const selected: MapNode['type'][] = [];
  const usedUniqueTypes = new Set<MapNode['type']>();

  for (const type of pool) {
    if (selected.length >= nodeCount) break;
    if (!REPEATABLE_NODE_TYPES.has(type) && usedUniqueTypes.has(type)) continue;

    selected.push(type);
    if (!REPEATABLE_NODE_TYPES.has(type)) usedUniqueTypes.add(type);
  }

  if (selected.length >= nodeCount) return selected;

  const repeatablePool = pool.filter(type => REPEATABLE_NODE_TYPES.has(type));
  const fallbackTypes: MapNode['type'][] = repeatablePool.length > 0 ? repeatablePool : ['battle'];
  const remainingCount = nodeCount - selected.length;
  const repeatedTypes = Array.from({ length: remainingCount }, (_, index) => fallbackTypes[index % fallbackTypes.length]);

  return [...selected, ...repeatedTypes];
}

function getForcedBattleLayerIndex(totalLayers: number): number {
  const candidates = Array.from({ length: Math.max(1, totalLayers - 2) }, (_, index) => index + 1);
  const center = (totalLayers - 1) / 2;
  const weightedCandidates = candidates.flatMap(layerIndex => {
    const weight = Math.max(1, Math.round(totalLayers - Math.abs(layerIndex - center) * 2));
    return Array.from({ length: weight }, () => layerIndex);
  });

  return weightedCandidates[randomInt(0, weightedCandidates.length - 1)];
}

function getMonsterLayerType(): MapNode['type'] {
  return Math.random() < MONSTER_LAYER_ELITE_NODE_CHANCE ? 'elite' : 'battle';
}

function createRandomLayer(areaId: AreaId, layerIndex: number, totalLayers: number, forcedBattleLayerIndex: number) {
  const nodeCount = randomInt(2, 4);
  const nodeTypes = layerIndex === forcedBattleLayerIndex
    ? Array.from({ length: nodeCount }, (): MapNode['type'] => getMonsterLayerType())
    : getRandomLayerTypes(layerIndex, totalLayers, nodeCount);
  const nodes = nodeTypes.map((type, nodeIndex) => createRandomNode(areaId, layerIndex, nodeIndex, totalLayers, type));
  const hasFight = nodes.some(node => node.type === 'battle' || node.type === 'elite');
  const nextNodes = hasFight ? nodes : [
    createRandomNode(areaId, layerIndex, 0, totalLayers, layerIndex >= totalLayers - 2 ? 'elite' : 'battle'),
    ...nodes.slice(1),
  ];

  const hasPack = nextNodes.some(node => (node.enemies?.length ?? 0) >= 2);
  const packedNodes = hasPack || totalLayers < 4
    ? nextNodes
    : nextNodes.map((node, index) => {
        if (index !== 0 || node.type !== 'battle') return node;
        const enemies = getRandomEnemyIds(areaId, 'normal', true);
        return { ...node, label: '兽群出没', enemies };
      });

  const dedupedNodes = dedupePrimaryEnemies(packedNodes, areaId);
  // 必打怪层全是战斗/精英节点：去重后若仍有主怪重复（怪池耗尽所致），删掉重复节点，保留至少 1 个。
  const finalNodes = layerIndex === forcedBattleLayerIndex
    ? dropDuplicateMonsterNodes(dedupedNodes)
    : dedupedNodes;

  return { nodes: shuffleCards(finalNodes) };
}

/** 删除主怪(enemies[0])与同层先前节点重复的战斗/精英节点，至少保留 1 个节点。 */
function dropDuplicateMonsterNodes(nodes: MapNode[]): MapNode[] {
  const seenPrimary = new Set<string>();
  const kept: MapNode[] = [];
  for (const node of nodes) {
    const primary = node.enemies?.[0];
    if (primary && (node.type === 'battle' || node.type === 'elite')) {
      if (seenPrimary.has(primary)) continue;
      seenPrimary.add(primary);
    }
    kept.push(node);
  }
  return kept.length > 0 ? kept : [nodes[0]];
}

const GROWTH_NODE_TYPES: MapNode['type'][] = ['reward', 'skill_altar', 'burn_altar'];

function getRandomNonForcedLayerIndex(start: number, end: number, forcedBattleLayerIndex: number): number {
  const candidates = Array.from({ length: end - start + 1 }, (_, index) => start + index)
    .filter(layerIndex => layerIndex !== forcedBattleLayerIndex);
  const pool = candidates.length > 0 ? candidates : [start];
  return pool[randomInt(0, pool.length - 1)];
}

function ensureGrowthNode(layer: { nodes: MapNode[] }, areaId: AreaId, layerIndex: number, totalLayers: number): { nodes: MapNode[] } {
  const hasGrowth = layer.nodes.some(n => GROWTH_NODE_TYPES.includes(n.type));
  if (hasGrowth) return layer;

  const replaceable = layer.nodes.findIndex(n => n.type !== 'battle' && n.type !== 'elite' && n.type !== 'boss');
  if (replaceable < 0) {
    // 全是战斗节点，追加一个成长节点
    const growthType = shuffleCards(GROWTH_NODE_TYPES)[0];
    const extraNode = createRandomNode(areaId, layerIndex, layer.nodes.length, totalLayers, growthType);
    return { nodes: [...layer.nodes, extraNode] };
  }

  const growthType = shuffleCards(GROWTH_NODE_TYPES)[0];
  const replacement = createRandomNode(areaId, layerIndex, replaceable, totalLayers, growthType);
  return {
    nodes: layer.nodes.map((n, i) => (i === replaceable ? replacement : n)),
  };
}

function createRandomMap(areaId: AreaId): MapConfig {
  const baseMap = getMapForArea(areaId);
  const layerCount = randomInt(5, Math.max(5, Math.min(7, baseMap.layers.length + 3)));
  const forcedBattleLayerIndex = getForcedBattleLayerIndex(layerCount);
  let layers = Array.from({ length: layerCount }, (_, layerIndex) => createRandomLayer(areaId, layerIndex, layerCount, forcedBattleLayerIndex));

  // 森林保底：前半段和后半段各至少一个成长节点
  if (areaId === 'forest') {
    const mid = Math.ceil(layerCount / 2);
    const firstHalfGrowth = layers.slice(0, mid).some(l => l.nodes.some(n => GROWTH_NODE_TYPES.includes(n.type)));
    const secondHalfGrowth = layers.slice(mid).some(l => l.nodes.some(n => GROWTH_NODE_TYPES.includes(n.type)));

    if (!firstHalfGrowth) {
      const target = getRandomNonForcedLayerIndex(0, mid - 1, forcedBattleLayerIndex);
      layers = layers.map((l, i) => (i === target ? ensureGrowthNode(l, areaId, i, layerCount) : l));
    }
    if (!secondHalfGrowth) {
      const target = getRandomNonForcedLayerIndex(mid, layerCount - 1, forcedBattleLayerIndex);
      layers = layers.map((l, i) => (i === target ? ensureGrowthNode(l, areaId, i, layerCount) : l));
    }
  }

  return { ...baseMap, layers };
}

function getRunMap(state: RunState): MapConfig {
  return state.currentMap ?? getMapForArea(state.currentArea);
}

function getMaxHp(character: CharacterConfig, progress: PlayerProgress): number {
  return Math.round(character.baseHp * progress.hpMultiplier) + (progress.bonusMaxHp ?? 0);
}

function getMaxEnergy(character: CharacterConfig, progress: PlayerProgress): number {
  return character.baseEnergy + progress.energyMultiplier - 1 + (progress.bonusMaxEnergy ?? 0);
}

export function getBlessingEffectTotal(state: RunState, key: keyof SkillEffect): number {
  return state.chosenBlessings.reduce((sum, blessing) => {
    const value = blessing.effect[key];
    return typeof value === 'number' ? sum + value : sum;
  }, 0);
}

function getRestHealPercent(state: RunState): number {
  return 40 + getBlessingEffectTotal(state, 'restHealPercentBonus');
}

export function getRestHealPreview(state: RunState): number {
  return Math.round(state.currentMaxHp * (getRestHealPercent(state) / 100));
}

function getLevelUpHeal(previous: PlayerProgress, next: PlayerProgress, maxHp: number): number {
  return next.level > previous.level ? Math.round(maxHp * 0.5) : 0;
}

function normalizeProgress(progress: PlayerProgress): PlayerProgress {
  return {
    ...progress,
    handLimit: progress.handLimit ?? progress.handSize ?? constants.baseHandSize,
    drawPerTurn: progress.drawPerTurn ?? constants.baseDrawPerTurn,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getGameLang(): 'zh' | 'en' | null {
  try {
    const value = window.localStorage.getItem('card-quest-lang');
    return value === 'en' || value === 'zh' ? value : null;
  } catch {
    return null;
  }
}

function msg(zh: string, en: string): string {
  return getGameLang() === 'en' ? en : zh;
}

const RARITY_ORDER = ['white', 'green', 'blue', 'purple', 'orange', 'red'];
export const GACHA_COSTS = [14, 21, 32] as const;
export const GACHA_RARITY_WEIGHTS: Record<RarityColor, number> = {
  white: 45,
  green: 32,
  blue: 16,
  purple: 5,
  orange: 1.5,
  red: 0.5,
};

export const GACHA_MACHINE_RARITY_WEIGHTS: Record<RarityColor, number> = {
  white: 22,
  green: 18,
  blue: 28,
  purple: 20,
  orange: 8,
  red: 4,
};

const UPGRADE_COST_BY_RARITY: Record<SkillCard['rarity'], number> = {
  white: 6,
  green: 9,
  blue: 16,
  purple: 35,
  orange: 60,
  red: 90,
};

export function getUpgradeCost(card: Pick<SkillCard, 'rarity'>): number {
  return UPGRADE_COST_BY_RARITY[card.rarity];
}

function getAreaPowerIndex(areaId: AreaId): number {
  return Math.max(0, ALL_AREAS.indexOf(areaId));
}

type RewardSource = 'normal' | 'elite' | 'reward' | 'boss';

type RewardRange = { min: RarityColor; max: RarityColor };

const AREA_REWARD_RARITY_TABLE: Record<AreaId, Record<RewardSource, RewardRange>> = {
  forest: {
    normal: { min: 'white', max: 'green' },
    elite: { min: 'green', max: 'blue' },
    reward: { min: 'white', max: 'blue' },
    boss: { min: 'green', max: 'purple' },
  },
  ruins: {
    normal: { min: 'green', max: 'blue' },
    elite: { min: 'blue', max: 'purple' },
    reward: { min: 'green', max: 'blue' },
    boss: { min: 'blue', max: 'purple' },
  },
  flame: {
    normal: { min: 'green', max: 'purple' },
    elite: { min: 'blue', max: 'purple' },
    reward: { min: 'green', max: 'purple' },
    boss: { min: 'purple', max: 'orange' },
  },
  frost: {
    normal: { min: 'blue', max: 'purple' },
    elite: { min: 'purple', max: 'orange' },
    reward: { min: 'blue', max: 'purple' },
    boss: { min: 'purple', max: 'orange' },
  },
  chaos: {
    normal: { min: 'blue', max: 'orange' },
    elite: { min: 'purple', max: 'red' },
    reward: { min: 'blue', max: 'orange' },
    boss: { min: 'orange', max: 'red' },
  },
};

export function getAreaRewardRange(areaId: AreaId, source: RewardSource): RewardRange {
  return AREA_REWARD_RARITY_TABLE[areaId]?.[source] ?? AREA_REWARD_RARITY_TABLE.forest.normal;
}

function getRewardSource(defeatedEnemies: EnemyInstance[]): RewardSource {
  if (defeatedEnemies.some(enemy => enemy.tier === 'boss')) return 'boss';
  if (defeatedEnemies.some(enemy => enemy.tier === 'elite')) return 'elite';
  return 'normal';
}

function isGenericSkill(skill: SkillCard): boolean {
  return skill.id.startsWith('generic_') || skill.id.startsWith('basic_');
}

function getRandomEventCard(state: RunState, pool: 'class' | 'generic' | 'any', rarity?: RarityColor): SkillCard | null {
  const targetRarity = (rarity ?? RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, getAreaPowerIndex(state.currentArea) + 1)]) as RarityColor;
  const candidates = allSkills.filter((skill) => {
    if (skill.rarity !== targetRarity) return false;
    if (pool === 'class') return skill.characterBind === state.character.id && !isGenericSkill(skill);
    if (pool === 'generic') return isGenericSkill(skill);
    return skill.characterBind === state.character.id || isGenericSkill(skill);
  });

  return shuffleCards(candidates)[0] ?? null;
}

// 奖励卡分类权重：先按权重决定抽哪一类，再从该类内随机取卡
const REWARD_CATEGORY_WEIGHTS: { key: 'class' | 'generic' | 'other'; weight: number }[] = [
  { key: 'class', weight: 70 },
  { key: 'generic', weight: 25 },
  { key: 'other', weight: 5 },
];

export function getGachaCost(drawCount: number, areaDepth = 0, risk = 0): number {
  const base = GACHA_COSTS[drawCount] ?? GACHA_COSTS[GACHA_COSTS.length - 1];
  return Math.round(base * (1 + areaDepth * 0.15) * (1 + risk / 200));
}

function getGachaMachineRandomSkill(candidates: SkillCard[], minRarityIndex = 0): SkillCard | null {
  const eligible = candidates.filter((skill) => RARITY_ORDER.indexOf(skill.rarity) >= minRarityIndex);
  const source = eligible.length > 0 ? eligible : candidates;
  const weighted = source.map((skill) => ({
    skill,
    weight: GACHA_MACHINE_RARITY_WEIGHTS[skill.rarity] ?? 1,
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.skill;
  }

  return weighted[0]?.skill ?? null;
}

function getGachaCandidates(state: RunState): SkillCard[] {
  const { minIndex, maxIndex } = getGachaRarityRange(state.currentArea);

  return allSkills.filter((skill) => {
    const rarityIndex = RARITY_ORDER.indexOf(skill.rarity);
    if (rarityIndex < minIndex || rarityIndex > maxIndex) return false;
    return isGenericSkill(skill) || skill.characterBind === state.character.id;
  });
}

export function getGachaRarityRange(areaId: AreaId): { minIndex: number; maxIndex: number } {
  const areaIndex = getAreaPowerIndex(areaId);
  return {
    minIndex: Math.max(0, areaIndex - 1),
    maxIndex: Math.min(RARITY_ORDER.length - 1, areaIndex + 2),
  };
}

export function getRewardRarityWeights(maxRarity: string, minRarity = 'white'): Array<{ rarity: RarityColor; weight: number }> {
  const targetIndex = RARITY_ORDER.indexOf(maxRarity);
  const floorIndex = RARITY_ORDER.indexOf(minRarity);
  const maxIndex = targetIndex >= 0 ? targetIndex : 0;
  const minIndex = floorIndex >= 0 ? Math.min(floorIndex, maxIndex) : 0;
  return RARITY_ORDER.slice(minIndex, maxIndex + 1).map((rarity) => ({
    rarity: rarity as RarityColor,
    weight: GACHA_RARITY_WEIGHTS[rarity as RarityColor] ?? 1,
  }));
}

function pickWeightedRewardRarity(range: RewardRange, availableRarities?: Set<string>): RarityColor {
  const weighted = getRewardRarityWeights(range.max, range.min)
    .filter((item) => !availableRarities || availableRarities.has(item.rarity));
  const source = weighted.length > 0 ? weighted : getRewardRarityWeights(range.max, range.min);
  const totalWeight = source.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of source) {
    roll -= item.weight;
    if (roll <= 0) return item.rarity;
  }
  return source[0]?.rarity ?? 'white';
}

function getCardRewards(range: RewardRange, characterId: CharacterClass, count = 3): SkillCard[] {
  const categoryOf = (skill: SkillCard): 'class' | 'generic' | 'other' => {
    if (isGenericSkill(skill)) return 'generic';
    return skill.characterBind === characterId ? 'class' : 'other';
  };

  const minRarityIndex = Math.max(0, RARITY_ORDER.indexOf(range.min));
  const maxRarityIndex = Math.max(minRarityIndex, RARITY_ORDER.indexOf(range.max));
  const candidates = allSkills.filter((skill) => {
    const index = RARITY_ORDER.indexOf(skill.rarity);
    return index >= minRarityIndex && index <= maxRarityIndex;
  });
  const result: SkillCard[] = [];
  const usedIds = new Set<string>();
  while (result.length < count) {
    const availableRarities = new Set(candidates
      .filter(skill => !usedIds.has(skill.id))
      .map(skill => skill.rarity));
    if (availableRarities.size === 0) break;
    const targetRarity = pickWeightedRewardRarity(range, availableRarities);
    const buckets: Record<'class' | 'generic' | 'other', SkillCard[]> = {
      class: [],
      generic: [],
      other: [],
    };

    for (const skill of candidates) {
      if (skill.rarity !== targetRarity || usedIds.has(skill.id)) continue;
      buckets[categoryOf(skill)].push(skill);
    }
    buckets.class = shuffleCards(buckets.class);
    buckets.generic = shuffleCards(buckets.generic);
    buckets.other = shuffleCards(buckets.other);

    const available = REWARD_CATEGORY_WEIGHTS.filter((cat) => buckets[cat.key].length > 0);
    if (available.length === 0) break;
    const totalWeight = available.reduce((sum, cat) => sum + cat.weight, 0);
    let roll = Math.random() * totalWeight;
    let picked = available[0];
    for (const cat of available) {
      roll -= cat.weight;
      if (roll <= 0) { picked = cat; break; }
    }
    const card = buckets[picked.key][0];
    if (card) {
      usedIds.add(card.id);
      result.push(card);
    }
  }

  return result;
}

function getTriggeredComboId(playedTypes: string[]): string | null {
  const combo = allCombos.find((item) => {
    const recentTypes = playedTypes.slice(-item.requiredTypes.length);
    return recentTypes.length === item.requiredTypes.length &&
      recentTypes.every((type, index) => type === item.requiredTypes[index]);
  });

  return combo?.id ?? null;
}

function getTriggeredComboName(comboId: string | null): string {
  return allCombos.find((item) => item.id === comboId)?.name ?? '';
}

function getPassiveDamageBonus(state: RunState, card: SkillCard): number {
  if (state.character.id === 'shadowblade' && card.type === 'attack') {
    const isFirstAttackThisTurn = !(state.combat?.playedCardTypesThisTurn ?? []).includes('attack');
    return isFirstAttackThisTurn ? 50 : 0;
  }
  if (state.character.id === 'holylight' && state.combat && state.combat.playerHp / state.combat.playerMaxHp < 0.4 && card.type === 'attack') return 100;
  if (state.character.id === 'combatmaster') return 0;
  if (state.character.id === 'developer') return 100;
  return 0;
}

function applyLevelProgress(progress: PlayerProgress): PlayerProgress {
  const { level } = getLevelProgress(progress.exp);
  const bonus = getLevelBonus(level);

  const normalized = normalizeProgress(progress);
  return {
    level,
    exp: progress.exp,
    skillSlots: bonus.unlocksSlot ? Math.max(progress.skillSlots, 2) : progress.skillSlots,
    passiveSlots: bonus.passiveSlot ? Math.max(progress.passiveSlots, 1) : progress.passiveSlots,
    hpMultiplier: 1 + bonus.hpBonus / 100,
    energyMultiplier: 1 + bonus.energyBonus,
    handSize: normalized.handSize,
    handLimit: normalized.handLimit,
    drawPerTurn: normalized.drawPerTurn,
    bonusMaxHp: progress.bonusMaxHp ?? 0,
    bonusMaxEnergy: progress.bonusMaxEnergy ?? 0,
  };
}

const ALL_AREAS: AreaId[] = ['forest', 'ruins', 'flame', 'frost', 'chaos'];

function getNextArea(current: AreaId): AreaId | null {
  const idx = ALL_AREAS.indexOf(current);
  return idx < ALL_AREAS.length - 1 ? ALL_AREAS[idx + 1] : null;
}

// —— 数据查询 ——

export function getCharacter(id: CharacterClass): CharacterConfig {
  return characters.find((c) => c.id === id) ?? characters[0];
}

/** 每个角色对应的通用攻击/防御牌 */
const STARTER_SIGNATURES: Partial<Record<CharacterClass, string[]>> = {
  shadowblade: ['shadowblade_phantom_1', 'shadowblade_smoke'],
  frostpriest: ['frostpriest_freeze_1', 'frostpriest_prayer_1'],
  combatmaster: ['combatmaster_jab_1', 'combatmaster_combo_1'],
  undeadpriest: ['undead_sacrifice_1', 'undead_contract_1'],
  taichimonk: ['taichimonk_leverage_1', 'taichimonk_cloud_1'],
  holylight: ['holylight_strike_1', 'holylight_shield'],
};

const STARTER_GENERICS: Record<CharacterClass, { attack: string; defense: string | null }> = {
  ironwall:      { attack: 'generic_attack_1',     defense: 'generic_block' },
  shadowblade:   { attack: 'generic_light_attack',  defense: null },
  lifesage:      { attack: 'generic_magic_bolt',    defense: 'generic_magic_shield' },
  taichimonk:    { attack: 'generic_attack_1',     defense: 'generic_block' },
  holylight:     { attack: 'generic_light_attack',  defense: 'generic_block' },
  wealthmerchant:{ attack: 'generic_light_attack',  defense: 'generic_block' },
  undeadpriest:  { attack: 'generic_magic_bolt',    defense: 'generic_magic_shield' },
  armorbreaker:  { attack: 'generic_attack_1',     defense: 'generic_block' },
  elementmage:   { attack: 'element_fireball',      defense: 'element_ice_shield' },
  omnisage:      { attack: 'generic_magic_bolt',    defense: 'generic_magic_shield' },
  combatmaster:  { attack: 'generic_light_attack',  defense: 'generic_block' },
  frostpriest:   { attack: 'generic_magic_bolt',    defense: 'generic_magic_shield' },
  thornguardian: { attack: 'generic_attack_1',     defense: 'generic_block' },
  devourer:      { attack: 'generic_light_attack',  defense: 'generic_block' },
  generic:       { attack: 'generic_attack_1',     defense: 'generic_block' },
  developer:    { attack: 'dev_god_slash',          defense: 'dev_dome' },
};

export function getStarterSkills(characterId: CharacterClass): SkillCard[] {
  const cfg = STARTER_GENERICS[characterId];
  const genericIds = new Set([...Object.values(STARTER_GENERICS).flatMap(c => [c.attack, c.defense].filter(Boolean)), 'basic_meditate']);
  const classCards = allSkills.filter(
    (s) => s.characterBind === characterId && s.tier === 1 && !genericIds.has(s.id) && (s.rarity === 'white' || s.rarity === 'green'),
  );
  const attackCards = allSkills.filter((s) => s.id === cfg.attack);
  const defenseCards = cfg.defense ? allSkills.filter((s) => s.id === cfg.defense) : [];
  const meditate = allSkills.filter((s) => s.id === 'basic_meditate');
  const signatureCards = (STARTER_SIGNATURES[characterId] ?? [])
    .map((id) => allSkills.find((skill) => skill.id === id))
    .filter((skill): skill is SkillCard => Boolean(skill));
  const classCardsWithoutSignatures = classCards.filter((card) => !signatureCards.some((signature) => signature.id === card.id));

  if (signatureCards.length > 0) {
    const starterDefense = defenseCards.length > 0 ? defenseCards : allSkills.filter((s) => s.id === 'generic_block');
    return [...meditate, ...signatureCards, ...classCardsWithoutSignatures, ...attackCards, ...starterDefense];
  }
  if (defenseCards.length > 0) {
    return [...meditate, ...classCards, ...attackCards, ...attackCards, ...defenseCards, ...defenseCards];
  }
  const fallbackDefenseCards = allSkills.filter((s) => s.id === 'generic_block');
  return [...meditate, ...classCards, ...attackCards, ...attackCards, ...fallbackDefenseCards, ...fallbackDefenseCards];
}

export function getMapForArea(areaId: AreaId): MapConfig {
  return maps.find((m) => m.areaId === areaId) ?? maps[0];
}

export function getEnemyById(id: string): any {
  return allEnemies.find((e) => e.id === id) ?? allEnemies[0];
}

export function getEventsForArea(areaId: AreaId): GameEvent[] {
  return allEvents.filter((e) => e.areaId === areaId || e.scope === 'generic');
}

/** 按当前层深计算某等级事件相对 normal(=1) 的权重 */
function getEventTierWeight(tier: GameEvent['tier'], depth: number): number {
  // advanced（橙卡/永久强化）：浅层趋近 0，中后段逐渐放大，末层约为 normal 的 5 倍
  if (tier === 'advanced') return depth * depth * 5;
  // elite（红卡）：约第三层(depth≈0.28)起步，线性平缓上升，整体保持较低概率
  if (tier === 'elite') return Math.max(0, depth - 0.28) * 1.1;
  return 1;
}

/**
 * 按当前层深加权抽取事件：高级事件越靠近区域末层概率越高，浅层几乎抽不到；
 * elite（红卡）事件起步更晚、整体概率更低；normal 事件权重恒定。
 */
function pickWeightedEvent(events: GameEvent[], state: RunState): GameEvent | null {
  if (events.length === 0) return null;
  const totalLayers = getRunMap(state).layers.length;
  const depth = totalLayers > 1 ? clamp(state.mapPosition.layer / (totalLayers - 1), 0, 1) : 0;
  const weighted = events.map((event) => ({
    event,
    weight: (event.weight ?? 1) * getEventTierWeight(event.tier, depth),
  }));
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight <= 0) {
    const normalEvents = events.filter((e) => (e.tier ?? 'normal') === 'normal');
    const pool = normalEvents.length > 0 ? normalEvents : events;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  let roll = Math.random() * totalWeight;
  for (const { event, weight } of weighted) {
    roll -= weight;
    if (roll < 0) return event;
  }
  return weighted[weighted.length - 1].event;
}

export function getRandomBlessings(count: number, state?: RunState): Blessing[] {
  const ownedRunIds = new Set((state?.chosenBlessings ?? [])
    .filter((blessing) => blessing.duration === 'run')
    .map((blessing) => blessing.id));
  const pool = allBlessings.filter((blessing) => !ownedRunIds.has(blessing.id));
  return shuffleCards(pool).slice(0, count);
}

// —— 等级系统 ——

const LEVEL_BONUSES = constants.levelBonuses;

export function getLevelProgress(exp: number): { level: number; expForNext: number; isMaxLevel: boolean } {
  const maxLevel = LEVEL_BONUSES.length;
  for (let i = maxLevel - 1; i >= 0; i--) {
    if (exp >= constants.levelExpCurve[i]) {
      const level = i + 1;
      return {
        level,
        expForNext: constants.levelExpCurve[i + 1] ?? constants.levelExpCurve[i],
        isMaxLevel: level >= maxLevel,
      };
    }
  }
  return { level: 1, expForNext: constants.levelExpCurve[1], isMaxLevel: false };
}

export function getLevelBonus(level: number) {
  const index = Math.min(level - 1, LEVEL_BONUSES.length - 1);
  return LEVEL_BONUSES[index];
}

// —— 初始状态 ——

export function createTrainingRun(characterId: CharacterClass): RunState {
  const character = getCharacter(characterId);
  const dummyConfig = allEnemies.find(e => e.id === 'training_dummy');
  const dummy = dummyConfig ? createEnemyInstance(dummyConfig) : createEnemyInstance({
    id: 'training_dummy', name: '训练木人桩', tier: 'normal' as const, area: 'forest' as const,
    hp: 999, energy: 3, description: '训练用木人桩。', deck: [{ id: 'dummy_punch', name: '木桩一击', cost: 1, type: 'attack' as const, effect: { damage: 1 }, description: '', name_en: 'Dummy Punch', description_en: '' }],
    rewards: { exp: 0, gold: 0, cardRarity: 'white' as const }, weaknesses: [], resistances: [],
  });

  // 全套卡组：所有本角色卡 + 所有通用卡
  const classCards = allSkills.filter(s => s.characterBind === characterId && !s.id.startsWith('generic_') && !s.id.startsWith('basic_'));
  const genericCards = allSkills.filter(s => s.id.startsWith('generic_') || s.id.startsWith('basic_'));
  const fullDeck = shuffleCards([...classCards, ...genericCards]).map(s => ({ ...s }));

  // 训练场使用角色满级最终数值，方便测试成型build的强度
  const maxLevel = LEVEL_BONUSES.length;
  const finalBonus = getLevelBonus(maxLevel);
  const progress = {
    level: maxLevel,
    exp: 0,
    skillSlots: 2,
    passiveSlots: 1,
    hpMultiplier: 1 + finalBonus.hpBonus / 100,
    energyMultiplier: 1 + finalBonus.energyBonus,
    handSize: constants.baseHandSize,
    handLimit: constants.baseHandSize,
    drawPerTurn: constants.baseDrawPerTurn,
    bonusMaxHp: 0,
    bonusMaxEnergy: 0,
  };
  const maxHp = getMaxHp(character, progress);
  const maxEnergy = getMaxEnergy(character, progress);
  const initialDraw = drawCards([], fullDeck, [], progress.handLimit, progress.handLimit);

  const combat: CombatState = {
    playerHp: maxHp, playerMaxHp: maxHp,
    playerEnergy: maxEnergy, playerMaxEnergy: maxEnergy,
    playerArmor: 0, enemy: dummy, extraEnemies: [], defeatedEnemies: [], currentEnemyIndex: 0,
    hand: initialDraw.hand, deck: initialDraw.deck, discard: initialDraw.discard, exhausted: [],
    playerInPlay: [], newlyDrawnIndexes: initialDraw.drawnIndexes,
    blessings: [], turnNumber: 0, playedCardTypesThisTurn: [],
    playerStatusEffects: [], handLimit: progress.handLimit, drawPerTurn: progress.drawPerTurn,
    consecutiveAttacks: 0,
  };

  return {
    character, progress, combat, gold: 9999, deck: fullDeck,
    currentHp: maxHp, currentMaxHp: maxHp, risk: 0, undeadKillCount: 0, cardsPlayedCount: 0,
    discoveredCards: [], discoveredEnemies: [], discoveredEnemyCards: [],
    discoveredCombos: [], mapPosition: { layer: 0, nodeIndex: -1 }, path: [],
    currentArea: 'forest' as AreaId, currentMap: { layers: [], boss: { id: 'dummy', type: 'battle', name: '桩' } } as any,
    chosenBlessings: [], rewardChoices: [], upgradeChoices: [], activeEvent: null, shopItems: [],
    gachaDrawn: 0, pendingBlessings: [], phase: 'combat' as const, isTraining: true, message: msg('训练场：自由搭配卡组，熟悉角色机制。', 'Training Yard: Experiment with deck combos.'),
  };
}

export function createInitialRunState(characterId: CharacterClass, startArea?: AreaId): RunState {
  const character = getCharacter(characterId);
  const starterSkills = getStarterSkills(characterId);
  const initialArea = startArea ?? 'forest';
  const currentMap = createRandomMap(initialArea);

  const starterDeck = starterSkills.map((skill) => ({
    ...skill,
    id: skill.id,
    name: skill.name,
    tier: skill.tier,
    rarity: skill.rarity as any,
    cost: skill.cost,
    type: skill.type as any,
    effect: { ...skill.effect },
    description: skill.description,
    upgradeTo: skill.upgradeTo,
    characterBind: skill.characterBind,
    flavorText: skill.flavorText,
  }));

  const progress = {
    level: 1,
    exp: 0,
    skillSlots: 1,
    passiveSlots: 0,
    hpMultiplier: 1.0,
    energyMultiplier: 1.0,
    handSize: constants.baseHandSize,
    handLimit: constants.baseHandSize,
    drawPerTurn: constants.baseDrawPerTurn,
    bonusMaxHp: 0,
    bonusMaxEnergy: 0,
  };
  const currentMaxHp = getMaxHp(character, progress);

  return {
    character,
    progress,
    combat: null,
    gold: constants.startingGold,
    deck: starterDeck,
    currentHp: currentMaxHp,
    currentMaxHp,
    risk: 0,
    cardsPlayedCount: 0,
    discoveredCards: starterDeck.map((card) => card.id),
    discoveredEnemies: [],
    discoveredEnemyCards: [],
    discoveredCombos: [],
    mapPosition: { layer: 0, nodeIndex: -1 },
    path: [],
    currentArea: initialArea,
    currentMap,
    chosenBlessings: [],
    undeadKillCount: 0,
    rewardChoices: [],
    upgradeChoices: [],
    activeEvent: null,
    shopItems: [],
    gachaDrawn: 0,
    pendingBlessings: [],
    phase: 'exploration',
    message: msg('冒险开始！选择你的第一个目标。', 'Adventure begins! Choose your first destination.'),
  };
}

// —— 地图导航 ——

export function getCurrentNode(state: RunState): MapNode | null {
  const map = getRunMap(state);
  const { layer, nodeIndex } = state.mapPosition;

  if (layer < map.layers.length) {
    const layerNodes = map.layers[layer].nodes;
    return nodeIndex >= 0 && nodeIndex < layerNodes.length
      ? layerNodes[nodeIndex]
      : null;
  }

  // 最后一层 -> Boss
  if (layer === map.layers.length) {
    return map.boss;
  }

  return null;
}

export function getAvailableNodes(state: RunState): MapNode[] {
  const map = getRunMap(state);
  const { layer } = state.mapPosition;

  if (layer >= map.layers.length) {
    return layer === map.layers.length ? [map.boss] : [];
  }

  return map.layers[layer].nodes;
}

export function enterNode(state: RunState, nodeId: string): RunState {
  const map = getRunMap(state);
  const { layer } = state.mapPosition;
  const layerNodes = layer < map.layers.length ? map.layers[layer].nodes : [];

  const node = layer < map.layers.length
    ? layerNodes.find(item => item.id === nodeId) ?? null
    : nodeId === map.boss.id
      ? map.boss
      : null;
  const nodeIndex = layer < map.layers.length
    ? Math.max(0, layerNodes.findIndex(item => item.id === nodeId))
    : 0;

  if (!node) {
    return { ...state, message: msg('无效的节点。', 'Invalid node.') };
  }

  eventBus.emit('node:enter', { node: node.id, layer });

  const riskDelta = node.type === 'elite' ? 20 : node.type === 'battle' || node.type === 'boss' ? 10 : node.type === 'rest' ? -15 : node.type === 'shop' ? -10 : 0;
  let newState: RunState = {
    ...state,
    risk: Math.max(0, Math.min(100, state.risk + riskDelta)),
    mapPosition: { layer, nodeIndex },
    path: [...state.path, node.id],
  };

  switch (node.type) {
    case 'battle':
    case 'elite':
    case 'boss': {
      const enemyIds = node.enemies ?? [];
      // 每场只生成一只怪（保留多怪代码不触发）：只实例化首个敌人。
      const enemies = enemyIds.slice(0, 1).map((id) => {
        const config = getEnemyById(id);
        return config ? createEnemyInstance(config) : null;
      }).filter(Boolean) as EnemyInstance[];

      if (enemies.length > 0) {
        const progress = normalizeProgress(state.progress);
        const firstEnemy = {
          ...enemies[0],
          hp: Math.round(enemies[0].hp * (1 + newState.risk / 200)),
          currentHp: Math.round(enemies[0].hp * (1 + newState.risk / 200)),
        };
        const extraEnemyInstances: EnemyInstance[] = [];
        const shuffledDeck = shuffleCards(state.deck);
        const initialDrawCount = progress.handLimit + getBlessingEffectTotal(state, 'drawCards');
        const initialDraw = drawCards([], shuffledDeck, [], initialDrawCount, progress.handLimit, true);
        const baseCombat: CombatState = {
          playerHp: state.currentHp,
          playerMaxHp: state.currentMaxHp,
          playerEnergy: getMaxEnergy(state.character, progress),
          playerMaxEnergy: getMaxEnergy(state.character, progress),
          playerArmor: 0,
          enemy: firstEnemy,
          extraEnemies: extraEnemyInstances,
          defeatedEnemies: [],
          currentEnemyIndex: 0,
          hand: initialDraw.hand,
          deck: initialDraw.deck,
          discard: initialDraw.discard,
          exhausted: [],
          playerInPlay: [],
          newlyDrawnIndexes: initialDraw.drawnIndexes,
          blessings: state.chosenBlessings,
          turnNumber: 0,
          playedCardTypesThisTurn: [],
          playerStatusEffects: [],
          handLimit: progress.handLimit,
          drawPerTurn: progress.drawPerTurn,
          radianceStacks: 0,
          ragePoints: 0,
          playerRetaliateBonus: 0,
          lastEnemyAction: undefined,
        };
        // 全能贤者被动：开局获得1层回响
        if (state.character.id === 'omnisage') {
          baseCombat.playerStatusEffects = [{ type: 'echo', value: 1, remainingTurns: 1 }];
        }
        const combat = applyBlessings(state.chosenBlessings, baseCombat);

        newState = {
          ...newState,
          progress,
          combat,
          phase: 'combat',
          rewardChoices: [],
          bossRetryHp: (node.type === 'boss' || node.type === 'elite') ? state.currentHp : state.bossRetryHp,
          message: newState.risk >= 80
            ? msg(`危机事件！高风险强化了 ${firstEnemy.name}！`, `Crisis! High risk empowered ${firstEnemy.name_en ?? firstEnemy.name}!`)
            : msg(`遭遇了 ${firstEnemy.name}！`, `Encountered ${firstEnemy.name_en ?? firstEnemy.name}!`),
        };
      }
      break;
    }

    case 'shop':
      newState = {
        ...newState,
        phase: 'shop',
        gachaDrawn: 0,
        message: msg('欢迎光临！看看有什么需要的吗？', 'Welcome! Take a look around.'),
      };
      break;

    case 'event': {
      const areaEvents = getEventsForArea(state.currentArea);
      const randomEvent = pickWeightedEvent(areaEvents, state);
      if (randomEvent) {
        newState = {
          ...newState,
          activeEvent: randomEvent,
          phase: 'event',
          message: msg(randomEvent.description, randomEvent.description_en ?? randomEvent.description),
        };
      }
      break;
    }

    case 'rest':
      newState = {
        ...newState,
        phase: 'rest',
        message: msg('你找到一个安全的地方休息。', 'You found a safe place to rest.'),
      };
      break;

    case 'reward': {
      newState = {
        ...newState,
        phase: 'reward',
        rewardChoices: getCardRewards(getAreaRewardRange(newState.currentArea, 'reward'), state.character.id),
        message: msg('你发现了一些有价值的技能卡！', 'You found some valuable skill cards!'),
      };
      break;
    }

    case 'skill_altar':
      newState = {
        ...newState,
        phase: 'upgrade',
        upgradeChoices: pickUpgradeChoices(newState.deck),
        message: msg('一座散发着神秘能量的祭坛出现在你面前。', 'An altar radiating mysterious energy appears before you.'),
      };
      break;

    case 'burn_altar':
      newState = {
        ...newState,
        phase: 'burn',
        message: msg('焚卡炉：焚毁一张卡牌，从牌组中移除。', 'Card Forge: burn a card to remove it from your deck.'),
      };
      break;
  }

  return newState;
}

export function confirmLayerTransition(state: RunState): RunState {
  if (state.phase !== 'layer_transition') return state;
  return {
    ...state,
    phase: 'exploration',
    lastExpGain: state.lastExpGain ? { ...state.lastExpGain, playOnMap: true } : undefined,
    message: msg('你继续前行，前方有多条路可以选择。', 'You press onward. Several paths lie ahead.'),
  };
}

export function advanceToNextLayer(state: RunState): RunState {
  const map = getRunMap(state);
  const nextLayer = state.mapPosition.layer + 1;

  if (nextLayer > map.layers.length) {
    // 通关当前区域
    eventBus.emit('area:complete', { areaId: state.currentArea });
    const nextArea = getNextArea(state.currentArea);
    if (nextArea) {
      const areaName = nextArea === 'ruins' ? '古城遗迹' : nextArea === 'flame' ? '烈焰之地' : nextArea === 'frost' ? '冰封神殿' : '混沌深渊';
      const areaNameEn = nextArea === 'ruins' ? 'Ancient Ruins' : nextArea === 'flame' ? 'Flame Lands' : nextArea === 'frost' ? 'Frozen Temple' : 'Chaos Abyss';
      const currentAreaName = state.currentArea === 'forest' ? '迷雾森林' : state.currentArea === 'ruins' ? '古城遗迹' : state.currentArea === 'flame' ? '烈焰之地' : state.currentArea === 'frost' ? '冰封神殿' : '混沌深渊';
      const currentAreaNameEn = state.currentArea === 'forest' ? 'Misty Forest' : state.currentArea === 'ruins' ? 'Ancient Ruins' : state.currentArea === 'flame' ? 'Flame Lands' : state.currentArea === 'frost' ? 'Frozen Temple' : 'Chaos Abyss';
      return {
        ...state,
        currentArea: nextArea,
        currentMap: createRandomMap(nextArea),
        mapPosition: { layer: 0, nodeIndex: -1 },
        phase: 'exploration',
        lastExpGain: state.lastExpGain ? { ...state.lastExpGain, playOnMap: true } : undefined,
        message: msg(`你穿越了 ${currentAreaName}，来到了 ${areaName}！`, `You crossed ${currentAreaNameEn} and arrived at ${areaNameEn}!`),
      };
    }
    return {
      ...state,
      phase: 'victory',
      message: msg('你成功通过了所有区域，成为了真正的勇者！', 'You cleared every area and became a true hero!'),
    };
  }

  return {
    ...state,
    mapPosition: { layer: nextLayer, nodeIndex: -1 },
    phase: 'exploration',
    message: msg('你继续前行，前方有多条路可以选择。', 'You press onward. Several paths lie ahead.'),
  };
}

// —— 战斗流程 ——

export function playSkillCard(state: RunState, handIndex: number, targetId?: string): RunState {
  const gameLang: 'zh' | 'en' | null = (() => { try { const v = window.localStorage.getItem('card-quest-lang'); return v === 'en' || v === 'zh' ? v : null; } catch { return null; } })();
  const msg = (zh: string, en: string) => gameLang === 'en' ? en : zh;

  if (state.phase !== 'combat' || !state.combat) {
    return { ...state, message: msg('现在不能出牌。', 'Cannot play cards now.') };
  }

  const card = state.combat.hand[handIndex];
  if (!card) {
    return { ...state, message: msg('这张卡不在手牌中。', 'Card not in hand.') };
  }

  if (card.cost > state.combat.playerEnergy) {
    return { ...state, message: msg('能量不足！', 'Not enough energy!') };
  }

  // 麻痹：有层数时每次出牌固定概率失效，出牌后始终消耗1层
  const paralyzeStacks = (state.combat.playerStatusEffects ?? [])
    .filter(s => s.type === 'paralyze')
    .reduce((sum, s) => sum + s.value, 0);
  const fizzled = paralyzeStacks > 0 && Math.random() * 100 < PARALYZE_CARD_FAIL_CHANCE;
  // 每次出牌重置 fxEvents，避免上一手的特效残留；fizzle 时再写入玩家侧麻痹特效
  let combat = { ...state.combat, fxEvents: [] };
  if (paralyzeStacks > 0) {
    const playerStatusesAfter = removeStatusStacks(combat.playerStatusEffects ?? [], 'paralyze', 1);
    if (fizzled) {
      const handAfterFizzle = combat.hand.filter((_, idx) => idx !== handIndex);
      return {
        ...state,
        cardsPlayedCount: state.cardsPlayedCount + 1,
        discoveredCards: Array.from(new Set([...state.discoveredCards, card.id])),
        combat: {
          ...combat,
          playerEnergy: combat.playerEnergy - card.cost,
          playerStatusEffects: playerStatusesAfter,
          hand: handAfterFizzle,
          discard: [...combat.discard, card],
          newlyDrawnIndexes: [],
          fxEvents: [{
            id: `p-${combat.turnNumber}-${state.cardsPlayedCount}-paralyze`,
            target: 'player' as const,
            type: 'paralyze' as const,
            phase: 'triggered' as const,
          }],
        },
        message: msg(`${card.name} 被麻痹，本次出牌没有生效！`, `${card.name_en ?? card.name} is paralyzed and had no effect!`),
      };
    }
    combat = { ...combat, playerStatusEffects: playerStatusesAfter };
  }

  const action = {
    card,
    targetId: targetId ?? combat.enemy.instanceId,
    handIndex,
    blessingActive: combat.blessings.length > 0,
    goldAvailable: state.gold,
    passiveDamageBonus: getPassiveDamageBonus(state, card),
    characterId: state.character.id,
    lang: gameLang ?? 'zh',
  };

  const { result, newState: combatAfterAction } = executeBattleAction(action, combat);
  if (combatAfterAction === combat) {
    return { ...state, message: result.messages.join(' ') };
  }

  // bonusDrawCards 已包含卡牌自身 drawCards 效果（回响触发时按整张卡重放次数累加），不再单独叠加 cardPlayed.effect.drawCards
  const drawEffect = result.bonusDrawCards;
  const drawResult = drawEffect > 0
    ? drawCards(
        combatAfterAction.hand,
        combatAfterAction.deck,
        combatAfterAction.discard,
        drawEffect,
        normalizeProgress(state.progress).handLimit,
        true,
      )
    : null;
  const drawNoCardsMessage = msg('没有可抽的牌。', 'No cards left to draw.');
  let combatAfterDraw = drawResult
    ? {
        ...combatAfterAction,
        hand: drawResult.hand,
        deck: drawResult.deck,
        discard: drawResult.discard,
        newlyDrawnIndexes: drawResult.drawnIndexes,
        drawEventId: drawResult.drawnIndexes.length > 0 ? (combatAfterAction.drawEventId ?? 0) + 1 : combatAfterAction.drawEventId,
      }
    : {
        ...combatAfterAction,
        newlyDrawnIndexes: [],
      };
  const playedTypes = [...combatAfterDraw.playedCardTypesThisTurn];
  const comboId = getTriggeredComboId(playedTypes);
  const comboMessage = comboId ? ` 触发共鸣：${getTriggeredComboName(comboId)}！` : '';
  // —— 被动技能 ——
  let passiveMessages: string[] = [];

  if (result.enemyDefeated) {
    const defeatedEnemies = getDefeatedEnemies(combatAfterDraw);
    const reward = getCombatReward(defeatedEnemies, state, result.goldGained, result.goldSpent);
    const message = msg(
      `胜利！获得 ${reward.expGain} 经验和 ${reward.finalGoldGain} 金币。`,
      `Victory! Gained ${reward.expGain} EXP and ${reward.finalGoldGain} gold.`,
    ) + comboMessage;
    // 吞噬永久加血上限：先写入 progress.bonusMaxHp，使胜利结算重算时保留
    const stateWithDevour = result.devourMaxHpGain > 0
      ? { ...state, progress: { ...state.progress, bonusMaxHp: (state.progress.bonusMaxHp ?? 0) + result.devourMaxHpGain } }
      : state;
    const postCombatState = createCombatVictoryState(
      stateWithDevour,
      combatAfterDraw,
      defeatedEnemies,
      reward,
      message,
      {
        cardsPlayedCount: state.cardsPlayedCount + 1,
        discoveredCards: Array.from(new Set([...state.discoveredCards, card.id])),
        discoveredCombos: comboId ? Array.from(new Set([...state.discoveredCombos, comboId])) : state.discoveredCombos,
      },
    );

    if (state.combat.enemy.tier === 'boss') {
      recordBossKill(state);
      if (postCombatState.phase === 'victory') return postCombatState;
      return {
        ...postCombatState,
        rewardAfter: 'layer_transition',
        message: msg(
          `你击败了 ${state.combat.enemy.name}！获得 ${reward.expGain} 经验和 ${reward.finalGoldGain} 金币，选择一张奖励卡。`,
          `You defeated ${state.combat.enemy.name_en ?? state.combat.enemy.name}! Gained ${reward.expGain} EXP and ${reward.finalGoldGain} gold. Choose a reward card.`,
        ),
      };
    }

    return postCombatState;
  }

  const devourProgress = result.devourMaxHpGain > 0
    ? { ...state.progress, bonusMaxHp: (state.progress.bonusMaxHp ?? 0) + result.devourMaxHpGain }
    : state.progress;

  return {
    ...state,
    progress: devourProgress,
    combat: combatAfterDraw,
    currentMaxHp: state.currentMaxHp + result.devourMaxHpGain,
    currentHp: Math.min(state.currentMaxHp + result.devourMaxHpGain, combatAfterDraw.playerHp),
    gold: Math.max(0, state.gold + result.goldGained - result.goldSpent),
    cardsPlayedCount: state.cardsPlayedCount + 1,
    discoveredCards: Array.from(new Set([...state.discoveredCards, card.id])),
    discoveredCombos: comboId ? Array.from(new Set([...state.discoveredCombos, comboId])) : state.discoveredCombos,
    message: `${result.messages.join(' ')}${comboMessage}${drawResult?.blockedByEmptyPiles && drawResult.drawnIndexes.length === 0 ? ` ${drawNoCardsMessage}` : ''}`,
  };
}

export function endCombatTurn(state: RunState): { run: RunState; enemySteps: EnemyTurnStep[] } {
  if (state.phase !== 'combat' || !state.combat) {
    return { run: state, enemySteps: [] };
  }

  const gameLang: 'zh' | 'en' | null = (() => { try { const v = window.localStorage.getItem('card-quest-lang'); return v === 'en' || v === 'zh' ? v : null; } catch { return null; } })();
  const msg = (zh: string, en: string) => gameLang === 'en' ? en : zh;
  const { state: _combatAfterEnd, rawDamage, statusDamage, messages, enemySteps, freezeSkips } = endTurn(state.combat, gameLang ?? 'zh', state.character.id);

  // 出牌结算逻辑包进闭包，返回最终 RunState；enemySteps 单独透传给 UI 回放
  const run: RunState = (() => {
  let combatAfterEnd = _combatAfterEnd;

  // 全能贤者被动：博学多才 — 每回合开始获得1层回响
  if (state.character.id === 'omnisage') {
    combatAfterEnd = {
      ...combatAfterEnd,
      playerStatusEffects: addStatus(combatAfterEnd.playerStatusEffects, { type: 'echo', value: 1, duration: 1, target: 'player' }),
    };
  }

  const finishCombatIfWon = (combat: CombatState, defeatMessage: string): RunState | null => {
    const aliveEnemies = getCombatEnemies(combat).filter(enemy => enemy.currentHp > 0);
    if (aliveEnemies.length > 0) return null;

    const defeatedEnemies = getDefeatedEnemies(combat);
    if (combat.playerHp <= 0) {
      if (defeatedEnemies.some(enemy => enemy.tier === 'boss')) recordBossKill(state);
      return {
        ...state,
        combat: null,
        currentHp: 0,
        defeatedEnemyTier: defeatedEnemies.some(e => e.tier === 'boss') ? 'boss' : defeatedEnemies[0]?.tier,
        phase: 'defeat',
        message: msg('你与敌人同归于尽…冒险到此结束。', 'You and the enemy fell together... The adventure ends.'),
      };
    }

    const reward = getCombatReward(defeatedEnemies, state);
    const postCombatState = createCombatVictoryState(
      state,
      combat,
      defeatedEnemies,
      reward,
      msg(
        `${defeatMessage} 获得 ${reward.expGain} 经验和 ${reward.finalGoldGain} 金币。`,
        `${defeatMessage} Gained ${reward.expGain} EXP and ${reward.finalGoldGain} gold.`,
      ),
    );

    if (state.combat?.enemy.tier !== 'boss') return postCombatState;

    recordBossKill(state);
    if (postCombatState.phase === 'victory') return postCombatState;

    return {
      ...postCombatState,
      rewardAfter: 'layer_transition',
      message: msg(
        `${defeatMessage} 获得 ${reward.expGain} 经验和 ${reward.finalGoldGain} 金币，选择一张奖励卡。`,
        `${defeatMessage} Gained ${reward.expGain} EXP and ${reward.finalGoldGain} gold. Choose a reward card.`,
      ),
    };
  };

  const statusVictory = finishCombatIfWon(combatAfterEnd, msg(
    `持续伤害击败了 ${state.combat.enemy.name}！`,
    `${state.combat.enemy.name_en ?? state.combat.enemy.name} defeated by status damage!`,
  ));
  if (statusVictory) return statusVictory;

  const retainArmorPercent = combatAfterEnd
    ? Math.max(
      state.character.id === 'ironwall' ? 25 : 0,
      ...combatAfterEnd.playerStatusEffects
        .filter(status => status.type === 'armor')
        .map(status => status.value),
    )
    : 0;
  if (combatAfterEnd) {
    combatAfterEnd = {
      ...combatAfterEnd,
      playerArmor: retainArmorPercent > 0 ? Math.ceil(combatAfterEnd.playerArmor * (retainArmorPercent / 100)) : 0,
      playerStatusEffects: combatAfterEnd.playerStatusEffects.filter(status => status.type !== 'armor'),
    };
  }

  // 荆棘反刺（thornguardian）：受到伤害时反弹，基础30% + retaliateBoost 强化加成
  if (state.character.id === 'thornguardian' && rawDamage > 0 && combatAfterEnd) {
    const bonus = (combatAfterEnd.playerRetaliateBonus ?? 0) / 100;
    const reflectRatio = 0.3 + bonus;
    const reflectDmg = Math.max(1, Math.round(rawDamage * reflectRatio));
    const newEnemy = {
      ...combatAfterEnd.enemy,
      currentHp: Math.max(0, combatAfterEnd.enemy.currentHp - reflectDmg),
    };
    combatAfterEnd = normalizeCombatEnemies({ ...combatAfterEnd, enemy: newEnemy });
    messages.push(msg(`荆棘反刺反弹 ${reflectDmg} 点伤害。`, `Thorn Guard reflects ${reflectDmg} damage.`));
  }

  const passiveVictory = finishCombatIfWon(combatAfterEnd, msg(
    `${state.combat.enemy.name} 被反击击败！`,
    `${state.combat.enemy.name_en ?? state.combat.enemy.name} defeated by counter damage!`,
  ));
  if (passiveVictory) return passiveVictory;

  const nextState: RunState = {
    ...state,
    combat: combatAfterEnd,
    message: messages.join(' '),
  };

  if (combatAfterEnd.playerHp <= 0) {
    return {
      ...nextState,
      phase: 'defeat',
      combat: null,
      defeatedEnemyTier: state.combat.enemy.tier,
      message: msg('你被击败了…冒险到此结束。', 'You were defeated... The adventure ends.'),
    };
  }

  // 回合重置：未使用手牌保留到下一回合，只把本回合打出的牌并入弃牌堆。
  combatAfterEnd = {
    ...combatAfterEnd,
    hand: [...combatAfterEnd.hand],
    discard: [...combatAfterEnd.discard, ...combatAfterEnd.playerInPlay],
    playerInPlay: [],
    playedCardTypesThisTurn: [],
  };

  // 太极武僧守拙：每回合开始获得5点护甲
  if (state.character.id === 'taichimonk') {
    combatAfterEnd = { ...combatAfterEnd, playerArmor: combatAfterEnd.playerArmor + 5 };
    messages.push(msg('守拙：获得5点护甲。', 'Guard: gain 5 armor.'));
  }

  const progress = normalizeProgress(state.progress);
  const naturalDrawCount = Math.max(0, progress.handLimit - combatAfterEnd.hand.length);
  // 冰霜祭司寒冰共鸣：冻结敌人行动时抽牌
  const frostFreezeDrawCount = state.character.id === 'frostpriest' ? freezeSkips : 0;
  const drawn = drawCards(
    combatAfterEnd.hand,
    combatAfterEnd.deck,
    combatAfterEnd.discard,
    naturalDrawCount + frostFreezeDrawCount,
    progress.handLimit,
    frostFreezeDrawCount > 0,
  );

  const noCardsDrawnMessage = msg('没有可抽的牌。', 'No cards left to draw.');
  const stateWithDraw: RunState = {
    ...nextState,
    progress,
    combat: {
      ...combatAfterEnd,
      deck: drawn.deck,
      hand: drawn.hand,
      discard: drawn.discard,
      newlyDrawnIndexes: drawn.drawnIndexes,
      drawEventId: drawn.drawnIndexes.length > 0 ? (combatAfterEnd.drawEventId ?? 0) + 1 : combatAfterEnd.drawEventId,
    },
    currentHp: combatAfterEnd.playerHp,
    message: `${nextState.message}${drawn.blockedByEmptyPiles && drawn.drawnIndexes.length === 0 ? ` ${noCardsDrawnMessage}` : ''}`,
  };

  const stateWithLifeSagePassive = state.character.id === 'lifesage' && stateWithDraw.combat
    ? {
        ...stateWithDraw,
        currentHp: Math.min(stateWithDraw.currentMaxHp, stateWithDraw.currentHp + LIFESAGE_PASSIVE_HEAL),
        combat: {
          ...stateWithDraw.combat,
          playerHp: Math.min(stateWithDraw.combat.playerMaxHp, stateWithDraw.combat.playerHp + LIFESAGE_PASSIVE_HEAL),
        },
        message: `${stateWithDraw.message} ${msg(`自然回春恢复${LIFESAGE_PASSIVE_HEAL}点生命。`, `Life Sage restores ${LIFESAGE_PASSIVE_HEAL} HP.`)}`,
      }
    : stateWithDraw;

  if (state.character.id === 'frostpriest' && freezeSkips > 0) {
    return {
      ...stateWithLifeSagePassive,
      message: `${stateWithLifeSagePassive.message} ${msg(`寒冰共鸣：冻结敌人行动，抽${freezeSkips}张牌。`, `Frost Resonance: frozen enemy skipped action, draw ${freezeSkips} card(s).`)}`,
    };
  }

  return stateWithLifeSagePassive;
  })();

  // 怪打出的每张牌即刻解锁怪物图鉴：从本回合出牌帧收集卡牌 id 合并入 run。
  const playedEnemyCardIds = enemySteps
    .map(step => step.reveal?.card?.id)
    .filter((id): id is string => Boolean(id));
  const runWithEnemyCards: RunState = playedEnemyCardIds.length > 0
    ? {
        ...run,
        discoveredEnemyCards: Array.from(new Set([
          ...(run.discoveredEnemyCards ?? []),
          ...playedEnemyCardIds,
        ])),
      }
    : run;

  return { run: runWithEnemyCards, enemySteps };
}

// —— 休息 ——

export function restHeal(state: RunState): RunState {
  if (state.phase !== 'rest') {
    return state;
  }

  const gameLang: 'zh' | 'en' | null = (() => { try { const v = window.localStorage.getItem('card-quest-lang'); return v === 'en' || v === 'zh' ? v : null; } catch { return null; } })();
  const msg = (zh: string, en: string) => gameLang === 'en' ? en : zh;
  const healAmount = getRestHealPreview(state);
  const currentHp = Math.min(state.currentMaxHp, state.currentHp + healAmount);

  return {
    ...state,
    currentHp,
    message: msg(`休息完毕，回复了 ${healAmount} 点生命。选择一个祝福。`, `Rested, restored ${healAmount} HP. Choose a blessing.`),
  };
}

export function chooseBlessing(state: RunState, blessingId: string): RunState {
  if (state.phase !== 'rest') {
    return state;
  }

  const gameLang: 'zh' | 'en' | null = (() => { try { const v = window.localStorage.getItem('card-quest-lang'); return v === 'en' || v === 'zh' ? v : null; } catch { return null; } })();
  const msg = (zh: string, en: string) => gameLang === 'en' ? en : zh;
  const blessing = allBlessings.find((b) => b.id === blessingId);
  if (!blessing) {
    return state;
  }

  const nextProgress = blessing.effect.maxHpGain
    ? { ...state.progress, bonusMaxHp: (state.progress.bonusMaxHp ?? 0) + blessing.effect.maxHpGain }
    : state.progress;
  const nextMaxHp = getMaxHp(state.character, nextProgress);
  const flatHeal = blessing.effect.heal ?? 0;
  const percentHeal = blessing.effect.healPercent ? Math.round(nextMaxHp * (blessing.effect.healPercent / 100)) : 0;
  const nextHp = Math.min(nextMaxHp, state.currentHp + flatHeal + percentHeal);
  const nextRisk = clamp(state.risk + (blessing.effect.riskChange ?? 0), 0, 100);
  const nextGold = state.gold + (blessing.effect.immediateGold ?? 0);

  return {
    ...state,
    progress: nextProgress,
    currentMaxHp: nextMaxHp,
    currentHp: nextHp,
    risk: nextRisk,
    gold: nextGold,
    chosenBlessings: [...state.chosenBlessings, blessing],
    message: msg(`获得了祝福：${blessing.name}`, `Obtained blessing: ${blessing.name_en ?? blessing.name}`),
  };
}

export function chooseRewardCard(state: RunState, cardId: string | null): RunState {
  if (state.phase !== 'reward') {
    return state;
  }

  const gameLang: 'zh' | 'en' | null = (() => { try { const v = window.localStorage.getItem('card-quest-lang'); return v === 'en' || v === 'zh' ? v : null; } catch { return null; } })();
  const msg = (zh: string, en: string) => gameLang === 'en' ? en : zh;
  const chosen = cardId ? state.rewardChoices.find((card) => card.id === cardId) : null;
  const next = advanceToNextLayer({
    ...state,
    deck: chosen ? [...state.deck, chosen] : state.deck,
    discoveredCards: chosen ? Array.from(new Set([...state.discoveredCards, chosen.id])) : state.discoveredCards,
    rewardChoices: [],
    rewardAfter: undefined,
    message: chosen ? msg(`获得卡牌：${chosen.name}`, `Obtained card: ${chosen.name_en ?? chosen.name}`) : msg('跳过了卡牌奖励。', 'Skipped the card reward.'),
  });

  if (state.rewardAfter === 'layer_transition' && next.phase !== 'victory') {
    return {
      ...next,
      phase: 'layer_transition',
      lastExpGain: next.lastExpGain ? { ...next.lastExpGain, playOnMap: true } : undefined,
      message: `${next.message} ${msg('准备进入下一区域。', 'Prepare to enter the next area.')}`,
    };
  }

  return next.lastExpGain ? { ...next, lastExpGain: { ...next.lastExpGain, playOnMap: true } } : next;
}

export function buyCard(state: RunState, card: SkillCard, price: number): RunState {
  const gameLang: 'zh' | 'en' | null = (() => { try { const v = window.localStorage.getItem('card-quest-lang'); return v === 'en' || v === 'zh' ? v : null; } catch { return null; } })();
  const msg = (zh: string, en: string) => gameLang === 'en' ? en : zh;
  const freeCardBlessing = state.chosenBlessings.find((blessing) => blessing.effect.nextShopCardFree);
  const finalPrice = freeCardBlessing ? 0 : price;
  if (state.phase !== 'shop' || state.gold < finalPrice) {
    return state;
  }

  return {
    ...state,
    gold: state.gold - finalPrice,
    deck: [...state.deck, card],
    chosenBlessings: freeCardBlessing
      ? state.chosenBlessings.filter((blessing) => blessing.id !== freeCardBlessing.id)
      : state.chosenBlessings,
    discoveredCards: Array.from(new Set([...state.discoveredCards, card.id])),
    message: freeCardBlessing
      ? msg(`使用赊账凭证，免费购买了 ${card.name}。`, `Used Credit Voucher and purchased ${card.name_en ?? card.name} for free.`)
      : msg(`购买了 ${card.name}。`, `Purchased ${card.name_en ?? card.name}.`),
  };
}

export function drawGachaCard(state: RunState): RunState {
  const drawCount = state.gachaDrawn ?? 0;
  const depth = ['forest', 'ruins', 'flame', 'frost', 'chaos'].indexOf(state.currentArea);
  const cost = getGachaCost(drawCount, depth, state.risk);
  if (state.phase !== 'shop' || drawCount >= GACHA_COSTS.length || state.gold < cost) {
    return state;
  }

  const minRarityIndex = drawCount === GACHA_COSTS.length - 1 ? RARITY_ORDER.indexOf('blue') : 0;
  const card = getGachaMachineRandomSkill(getGachaCandidates(state), minRarityIndex);
  if (!card) {
    return state;
  }

  return {
    ...state,
    gold: state.gold - cost,
    gachaDrawn: drawCount + 1,
    deck: [...state.deck, card],
    discoveredCards: Array.from(new Set([...state.discoveredCards, card.id])),
    message: msg(`神秘抽卡获得了 ${card.name}。`, `Mystery draw gained ${card.name_en ?? card.name}.`),
  };
}

export function useActiveSkill(state: RunState, targetId: string): RunState {
  if (state.phase !== 'combat' || !state.combat) {
    return { ...state, message: msg('现在不能使用技能。', 'Cannot use skill now.') };
  }
  const characterId = state.character.id;
  if (characterId === 'wealthmerchant') return useWealthMerchantSkill(state, targetId);
  return state;
}

function useWealthMerchantSkill(state: RunState, targetId: string): RunState {
  const combat = state.combat!;
  if (state.gold <= 0) {
    return { ...state, message: msg('金币不足，无法使用主动技能。', 'Not enough gold for active skill.') };
  }
  if (combat.playerEnergy < WEALTH_ACTIVE_ENERGY_COST) {
    return { ...state, message: msg('能量不足，无法使用主动技能。', 'Not enough energy for active skill.') };
  }

  const goldSpent = Math.min(state.gold, WEALTH_ACTIVE_MAX_GOLD_COST);
  const damage = goldSpent * WEALTH_ACTIVE_DAMAGE_MULTIPLIER;
  const enemies = [combat.enemy, ...(combat.extraEnemies ?? [])].map(e => ({ ...e, statusEffects: [...e.statusEffects] }));
  const isAlive = (e: typeof enemies[0]) => e.currentHp > 0;
  const requestedIdx = enemies.findIndex(e => e.instanceId === targetId && isAlive(e));
  const targetIdx = requestedIdx >= 0 ? requestedIdx : enemies.findIndex(isAlive);
  if (targetIdx < 0) return { ...state, message: msg('没有可选目标。', 'No valid target.') };

  const target = enemies[targetIdx];
  const updatedEnemies = enemies.map((enemy, index) => index === targetIdx
    ? { ...enemy, currentHp: Math.max(0, enemy.currentHp - damage) }
    : enemy);
  const allDead = updatedEnemies.every(e => e.currentHp <= 0);
  const newCombat: CombatState = {
    ...combat,
    enemy: updatedEnemies[0],
    extraEnemies: updatedEnemies.slice(1),
    playerEnergy: combat.playerEnergy - WEALTH_ACTIVE_ENERGY_COST,
    hand: [...combat.hand],
    deck: [...combat.deck],
    newlyDrawnIndexes: [],
  };

  if (allDead) {
    const nextState = { ...state, gold: state.gold - goldSpent };
    const defeatedTarget = updatedEnemies[targetIdx];
    const defeatedEnemies = [...(combat.defeatedEnemies ?? []), defeatedTarget];
    const reward = getCombatReward(defeatedEnemies, nextState);
    if (defeatedTarget.tier === 'boss') recordBossKill(nextState);
    return createCombatVictoryState(nextState, newCombat, defeatedEnemies, reward, msg(
      `挥金如雨！消耗 ${goldSpent} 金币击败了 ${target.name}！获得 ${reward.expGain} 经验和 ${reward.finalGoldGain} 金币。`,
      `Gold Storm! Spent ${goldSpent} gold to defeat ${target.name_en ?? target.name}! Gained ${reward.expGain} EXP and ${reward.finalGoldGain} gold.`,
    ), {
      cardsPlayedCount: state.cardsPlayedCount + 1,
      discoveredEnemies: Array.from(new Set([...state.discoveredEnemies, ...defeatedEnemies.map(enemy => enemy.id)])),
    });
  }

  return { ...state, gold: state.gold - goldSpent, combat: newCombat, message: msg(
    `挥金如雨！消耗了 ${goldSpent} 金币，对 ${target.name} 造成 ${damage} 点伤害！`,
    `Gold Storm! Spent ${goldSpent} gold, dealing ${damage} damage to ${target.name_en ?? target.name}!`,
  )};
}

export function deleteCard(state: RunState, cardId: string, cost: number): RunState {
  const gameLang: 'zh' | 'en' | null = (() => { try { const v = window.localStorage.getItem('card-quest-lang'); return v === 'en' || v === 'zh' ? v : null; } catch { return null; } })();
  const msg = (zh: string, en: string) => gameLang === 'en' ? en : zh;
  if (state.phase !== 'shop' || state.gold < cost || state.deck.length === 0) {
    return state;
  }

  const removeIndex = state.deck.findIndex((card) => card.id === cardId);
  if (removeIndex < 0) {
    return { ...state, message: msg('没有找到这张卡牌。', 'Card not found.') };
  }

  const removed = state.deck[removeIndex];
  const deck = state.deck.filter((_, index) => index !== removeIndex);

  return {
    ...state,
    gold: state.gold - cost,
    deck,
    message: msg(`删除了 ${removed.name}。`, `Removed ${removed.name_en ?? removed.name}.`),
  };
}

export function applyEventChoice(state: RunState, event: GameEvent, choiceId: string): RunState {
  const choice = event.choices.find((item) => item.id === choiceId);
  if (!choice) {
    return state;
  }

  const goldChange = choice.effects.goldChange ?? 0;
  if (goldChange < 0 && state.gold < Math.abs(goldChange)) {
    return { ...state, message: msg('金币不足，无法选择这个事件。', 'Not enough gold to choose this event.') };
  }

  const hpChange = choice.effects.hpChange ?? 0;
  if (hpChange < 0 && state.currentHp + hpChange <= 0) {
    return { ...state, message: msg('生命不足，无法选择这个事件。', 'Not enough HP to choose this event.') };
  }

  const configuredReward = choice.effects.cardReward
    ? allSkills.find((card) => card.id === choice.effects.cardReward)
    : null;
  const randomReward = choice.effects.cardRewardPool
    ? getRandomEventCard(state, choice.effects.cardRewardPool, choice.effects.cardRewardRarity)
    : null;
  if (choice.effects.cardRewardPool && !randomReward) {
    return { ...state, message: msg('没有合适的卡牌可获得。', 'No suitable card is available.') };
  }

  const basicCardIndexes = state.deck
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.rarity === 'white')
    .map(({ index }) => index);
  const removeIndex = choice.effects.removeRandomBasicCard && basicCardIndexes.length > 0
    ? shuffleCards(basicCardIndexes)[0]
    : -1;
  if (choice.effects.removeRandomBasicCard && removeIndex < 0) {
    return { ...state, message: msg('没有可移除的基础卡。', 'No basic card can be removed.') };
  }

  const deckAfterRemove = removeIndex >= 0
    ? state.deck.filter((_, index) => index !== removeIndex)
    : state.deck;
  const upgradableCards = deckAfterRemove.filter((card) => {
    if (!card.upgradeTo) return false;
    return choice.effects.upgradeBasicOnly ? card.rarity === 'white' : true;
  });
  const upgradeCandidate = choice.effects.upgradeRandomCard
    ? shuffleCards(upgradableCards)[0] ?? null
    : null;
  if (choice.effects.upgradeRandomCard && !upgradeCandidate) {
    return {
      ...state,
      message: choice.effects.upgradeBasicOnly ? msg('没有可升级的初始卡牌。', 'No starter cards can be upgraded.') : msg('没有可升级的卡牌。', 'No upgradable cards.'),
    };
  }

  const upgradeReward = upgradeCandidate?.upgradeTo
    ? allSkills.find((card) => card.id === upgradeCandidate.upgradeTo) ?? null
    : null;
  const cardReward = configuredReward ?? randomReward;
  const nextMaxHp = Math.max(1, state.currentMaxHp + (choice.effects.maxHpChange ?? 0));
  const currentHp = Math.max(0, Math.min(nextMaxHp, state.currentHp + hpChange));
  const progress = normalizeProgress(state.progress);
  const nextProgress = {
    ...progress,
    // maxHpChange/maxEnergyChange 需写入 bonusMaxHp/bonusMaxEnergy 才能在下次升级/胜利结算重算时保留
    bonusMaxHp: (progress.bonusMaxHp ?? 0) + (choice.effects.maxHpChange ?? 0),
    bonusMaxEnergy: (progress.bonusMaxEnergy ?? 0) + (choice.effects.maxEnergyChange ?? 0),
    handLimit: clamp(progress.handLimit + (choice.effects.handLimitChange ?? 0), 3, constants.maxHandSize),
    drawPerTurn: clamp(progress.drawPerTurn + (choice.effects.drawPerTurnChange ?? 0), 1, 5),
  };
  const gold = Math.max(0, state.gold + goldChange);
  const risk = clamp(state.risk + (choice.effects.riskChange ?? 0), 0, 100);
  const upgradeIndex = upgradeReward
    ? deckAfterRemove.findIndex((card) => card.id === upgradeCandidate?.id)
    : -1;
  const deckAfterUpgrade = upgradeReward && upgradeIndex >= 0
    ? deckAfterRemove.map((card, index) => index === upgradeIndex ? upgradeReward : card)
    : deckAfterRemove;
  const deck = cardReward ? [...deckAfterUpgrade, cardReward] : deckAfterUpgrade;
  const upgradeSource = upgradeIndex >= 0 ? deckAfterRemove[upgradeIndex] : null;
  const temporaryArmor = choice.effects.temporaryArmor ?? 0;
  const chosenBlessings = temporaryArmor > 0
    ? [
      ...state.chosenBlessings,
      {
        id: `event_armor_${event.id}_${choice.id}`,
        name: '临时护甲',
        description: `下场战斗获得 ${temporaryArmor} 点护甲。`,
        effect: { armor: temporaryArmor },
        duration: 'battle' as const,
      },
    ]
    : state.chosenBlessings;
  const removedCard = removeIndex >= 0 ? state.deck[removeIndex] : null;
  const maxHpDelta = choice.effects.maxHpChange ?? 0;
  const extraMessage = [
    hpChange > 0 ? msg(`恢复 ${hpChange} 点生命。`, `Restored ${hpChange} HP.`) : '',
    maxHpDelta !== 0 ? msg(`生命上限 ${maxHpDelta > 0 ? '+' : ''}${maxHpDelta}。`, `Max HP ${maxHpDelta > 0 ? '+' : ''}${maxHpDelta}.`) : '',
    upgradeReward && upgradeSource ? msg(`${upgradeSource.name} 升级为 ${upgradeReward.name}。`, `${upgradeSource.name_en ?? upgradeSource.name} upgraded to ${upgradeReward.name_en ?? upgradeReward.name}.`) : '',
    cardReward ? msg(`获得卡牌：${cardReward.name}。`, `Obtained card: ${cardReward.name_en ?? cardReward.name}.`) : '',
    removedCard ? msg(`移除了 ${removedCard.name}。`, `Removed ${removedCard.name_en ?? removedCard.name}.`) : '',
  ].filter(Boolean).join(' ');

  const discoveredCards = [cardReward?.id, upgradeReward?.id]
    .filter((cardId): cardId is string => Boolean(cardId));
  const eventState = {
    ...state,
    currentHp,
    currentMaxHp: nextMaxHp,
    gold,
    risk,
    progress: nextProgress,
    deck,
    chosenBlessings,
    discoveredCards: Array.from(new Set([...state.discoveredCards, ...discoveredCards])),
    activeEvent: null,
    message: extraMessage,
  };

  if (currentHp <= 0) {
    return {
      ...eventState,
      combat: null,
      phase: 'defeat',
      message: `${eventState.message}\n${msg('你倒下了…冒险到此结束。', 'You fell... The adventure ends here.')}`,
    };
  }

  const advanced = advanceToNextLayer(eventState);
  return { ...advanced, message: advanced.message ? `${eventState.message}\n${advanced.message}` : eventState.message };
}

export function getUpgradeableCards(state: RunState): SkillCard[] {
  return state.deck.filter((card) => Boolean(card.upgradeTo));
}

/** 稀有度越高，出现在祭坛候选中的权重越高。红卡无 upgradeTo 不入池。 */
const UPGRADE_RARITY_WEIGHT: Record<string, number> = {
  white: 1,
  green: 2,
  blue: 3,
  purple: 4,
  orange: 5,
};

/**
 * 进入祭坛时生成升级候选：候选数 = clamp(ceil(牌组总数/3), 2, 5)，
 * 按稀有度加权无放回抽样，按 id 去重避免重复牌名。
 * 可升级牌不足候选数时有几张给几张。
 */
function pickUpgradeChoices(deck: SkillCard[]): SkillCard[] {
  const upgradeable = Array.from(
    new Map(deck.filter((card) => Boolean(card.upgradeTo)).map((card) => [card.id, card])).values(),
  );
  const count = Math.min(Math.max(Math.ceil(deck.length / 3), 2), 5);
  const n = Math.min(count, upgradeable.length);

  const pool = upgradeable.map((card) => ({ card, weight: UPGRADE_RARITY_WEIGHT[card.rarity] ?? 1 }));
  const result: SkillCard[] = [];
  for (let i = 0; i < n; i += 1) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx += 1) {
      roll -= pool[idx].weight;
      if (roll <= 0) break;
    }
    const picked = pool.splice(Math.min(idx, pool.length - 1), 1)[0];
    if (picked) result.push(picked.card);
  }
  return result;
}

export function upgradeCard(state: RunState, cardId: string): RunState {
  const gameLang: 'zh' | 'en' | null = (() => { try { const v = window.localStorage.getItem('card-quest-lang'); return v === 'en' || v === 'zh' ? v : null; } catch { return null; } })();
  const msg = (zh: string, en: string) => gameLang === 'en' ? en : zh;
  if (state.phase !== 'upgrade') {
    return state;
  }

  const inChoices = state.upgradeChoices.some((card) => card.id === cardId);
  const target = inChoices ? state.deck.find((card) => card.id === cardId && card.upgradeTo) : null;
  const upgraded = target?.upgradeTo
    ? allSkills.find((card) => card.id === target.upgradeTo)
    : null;

  if (!target || !upgraded) {
    return { ...state, message: msg('没有可升级的卡牌。', 'No upgradable cards.') };
  }

  const cost = getUpgradeCost(target);
  if (state.gold < cost) {
    return { ...state, message: msg(`金币不足，升级 ${target.name} 需要 ${cost} 金币。`, `Not enough gold. Upgrading ${target.name_en ?? target.name} costs ${cost} gold.`) };
  }

  let replaced = false;
  const deck = state.deck.map((card) => {
    if (!replaced && card.id === cardId) {
      replaced = true;
      return upgraded;
    }
    return card;
  });

  return advanceToNextLayer({
    ...state,
    gold: state.gold - cost,
    deck,
    discoveredCards: Array.from(new Set([...state.discoveredCards, upgraded.id])),
    message: msg(`${target.name} 升级为 ${upgraded.name}，花费 ${cost} 金币。`, `${target.name_en ?? target.name} upgraded to ${upgraded.name_en ?? upgraded.name}, costing ${cost} gold.`),
  });
}

export function skipUpgrade(state: RunState): RunState {
  const gameLang: 'zh' | 'en' | null = (() => { try { const v = window.localStorage.getItem('card-quest-lang'); return v === 'en' || v === 'zh' ? v : null; } catch { return null; } })();
  const msg = (zh: string, en: string) => gameLang === 'en' ? en : zh;
  if (state.phase !== 'upgrade') {
    return state;
  }

  return advanceToNextLayer({
    ...state,
    message: msg('你离开了技能祭坛。', 'You left the skill altar.'),
  });
}

export function burnCard(state: RunState, deckIndex: number): RunState {
  const gameLang: 'zh' | 'en' | null = (() => { try { const v = window.localStorage.getItem('card-quest-lang'); return v === 'en' || v === 'zh' ? v : null; } catch { return null; } })();
  const msg = (zh: string, en: string) => gameLang === 'en' ? en : zh;
  if (state.phase !== 'burn') {
    return state;
  }

  const target = state.deck[deckIndex];
  if (!target) {
    return { ...state, message: msg('没有可焚毁的卡牌。', 'No card to burn.') };
  }
  if (state.deck.length <= 1) {
    return { ...state, message: msg('至少保留一张卡牌。', 'Must keep at least one card.') };
  }

  const deck = state.deck.filter((_, index) => index !== deckIndex);

  return advanceToNextLayer({
    ...state,
    deck,
    message: msg(`焚毁 ${target.name}。`, `Burned ${target.name_en ?? target.name}.`),
  });
}

export function skipBurn(state: RunState): RunState {
  const gameLang: 'zh' | 'en' | null = (() => { try { const v = window.localStorage.getItem('card-quest-lang'); return v === 'en' || v === 'zh' ? v : null; } catch { return null; } })();
  const msg = (zh: string, en: string) => gameLang === 'en' ? en : zh;
  if (state.phase !== 'burn') {
    return state;
  }

  return advanceToNextLayer({
    ...state,
    message: msg('你离开了焚卡炉。', 'You left the card forge.'),
  });
}

// —— 全局进度 ——

const UNLOCK_KEY = 'card-quest-unlocks';

export function getGlobalUnlocks(): GlobalUnlocks {
  const fallback: GlobalUnlocks = {
    unlockedCharacters: ['ironwall', 'shadowblade', 'lifesage', 'taichimonk'],
    unlockedBlessings: [],
    maxLevel: 1,
    achievements: [],
    discoveredCards: [],
    discoveredEnemies: [],
    discoveredEnemyCards: [],
    discoveredCombos: [],
    totalRuns: 0,
    totalVictories: 0,
    totalBossKills: 0,
    runHistory: [],
  };

  try {
    const raw = window.localStorage.getItem(UNLOCK_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<GlobalUnlocks>;
    return {
      unlockedCharacters: parsed.unlockedCharacters ?? fallback.unlockedCharacters,
      unlockedBlessings: parsed.unlockedBlessings ?? fallback.unlockedBlessings,
      maxLevel: parsed.maxLevel ?? fallback.maxLevel,
      achievements: parsed.achievements ?? fallback.achievements,
      discoveredCards: parsed.discoveredCards ?? fallback.discoveredCards,
      discoveredEnemies: parsed.discoveredEnemies ?? fallback.discoveredEnemies,
      discoveredEnemyCards: parsed.discoveredEnemyCards ?? fallback.discoveredEnemyCards,
      discoveredCombos: parsed.discoveredCombos ?? fallback.discoveredCombos,
      totalRuns: parsed.totalRuns ?? fallback.totalRuns,
      totalVictories: parsed.totalVictories ?? fallback.totalVictories,
      totalBossKills: parsed.totalBossKills ?? fallback.totalBossKills,
      runHistory: parsed.runHistory ?? [],
    };
  } catch { /* ignore */ }

  return fallback;
}

export function saveGlobalUnlocks(unlocks: GlobalUnlocks): void {
  window.localStorage.setItem(UNLOCK_KEY, JSON.stringify(unlocks));
}

export function unlockAllContent(unlocks: GlobalUnlocks): GlobalUnlocks {
  return {
    ...unlocks,
    unlockedCharacters: Array.from(new Set([
      ...unlocks.unlockedCharacters,
      ...characters.filter(char => char.id !== 'developer').map(char => char.id),
    ])),
    unlockedBlessings: Array.from(new Set([
      ...unlocks.unlockedBlessings,
      ...allBlessings.map(blessing => blessing.id),
    ])),
    discoveredCards: Array.from(new Set([
      ...unlocks.discoveredCards,
      ...allSkills.filter(card => card.characterBind !== 'developer').map(card => card.id),
    ])),
    discoveredEnemies: Array.from(new Set([
      ...unlocks.discoveredEnemies,
      ...allEnemies.map(enemy => enemy.id),
    ])),
    discoveredEnemyCards: Array.from(new Set([
      ...(unlocks.discoveredEnemyCards ?? []),
      ...allEnemies.flatMap(enemy => enemy.deck.map(card => card.id)),
    ])),
    discoveredCombos: Array.from(new Set([
      ...(unlocks.discoveredCombos ?? []),
      ...allCombos.map(combo => combo.id),
    ])),
  };
}

function applyUnlocks(unlocks: GlobalUnlocks, bossKills: number): GlobalUnlocks {
  // 每击杀一个Boss解锁2个新角色，需要击杀全部5个Boss才能完全解锁
  const stage0: CharacterClass[] = ['wealthmerchant', 'holylight'];
  const stage1: CharacterClass[] = ['undeadpriest', 'armorbreaker'];
  const stage2: CharacterClass[] = ['elementmage', 'omnisage'];
  const stage3: CharacterClass[] = ['combatmaster', 'frostpriest'];
  const stage4: CharacterClass[] = ['thornguardian', 'devourer'];

  return {
    ...unlocks,
    unlockedCharacters: Array.from(new Set([
      ...unlocks.unlockedCharacters,
      ...(bossKills >= 1 ? stage0 : []),
      ...(bossKills >= 2 ? stage1 : []),
      ...(bossKills >= 3 ? stage2 : []),
      ...(bossKills >= 4 ? stage3 : []),
      ...(bossKills >= 5 ? stage4 : []),
    ])),
  };
}

export function recordBossKill(state: RunState): void {
  const current = getGlobalUnlocks();
  const totalBossKills = current.totalBossKills + 1;
  // 训练场不解锁玩家卡牌图鉴，仅同步敌方卡牌
  const discoveredCards = state.isTraining
    ? (current.discoveredCards ?? [])
    : Array.from(new Set([...(current.discoveredCards ?? []), ...state.discoveredCards]));
  const discoveredEnemies = Array.from(new Set([...(current.discoveredEnemies ?? []), ...state.discoveredEnemies]));
  const discoveredEnemyCards = Array.from(new Set([...(current.discoveredEnemyCards ?? []), ...(state.discoveredEnemyCards ?? [])]));
  const baseUnlocks = {
    ...current,
    discoveredCards,
    discoveredEnemies,
    discoveredEnemyCards,
    maxLevel: Math.max(current.maxLevel, state.progress.level),
    totalBossKills,
  };
  saveGlobalUnlocks(applyUnlocks(baseUnlocks, totalBossKills));
}

export function recordRunEnd(victory: boolean, state?: RunState): void {
  const unlocks = getGlobalUnlocks();
  const totalVictories = victory ? unlocks.totalVictories + 1 : unlocks.totalVictories;

  const totalBossKills = unlocks.totalBossKills;
  const runLevel = state?.progress.level ?? 0;

  // Build history entry
  const entry: RunHistoryEntry | null = state ? {
    characterId: state.character.id,
    characterName: state.character.name,
    victory,
    areaReached: state.currentArea,
    areaReachedName: AREA_NAMES[state.currentArea],
    level: state.progress.level,
    gold: state.gold,
    deck: state.deck.map(c => c.id),
    cardsPlayedCount: state.cardsPlayedCount,
    timestamp: Date.now(),
    bossKills: totalBossKills,
  } : null;

  const baseUnlocks = {
    ...unlocks,
    maxLevel: Math.max(unlocks.maxLevel, runLevel),
    discoveredCards: state?.isTraining
      ? (unlocks.discoveredCards ?? [])
      : (state ? Array.from(new Set([...(unlocks.discoveredCards ?? []), ...state.discoveredCards])) : (unlocks.discoveredCards ?? [])),
    discoveredEnemies: state ? Array.from(new Set([...(unlocks.discoveredEnemies ?? []), ...state.discoveredEnemies])) : (unlocks.discoveredEnemies ?? []),
    discoveredEnemyCards: state ? Array.from(new Set([...(unlocks.discoveredEnemyCards ?? []), ...(state.discoveredEnemyCards ?? [])])) : (unlocks.discoveredEnemyCards ?? []),
    discoveredCombos: state ? Array.from(new Set([...(unlocks.discoveredCombos ?? []), ...state.discoveredCombos])) : (unlocks.discoveredCombos ?? []),
    totalRuns: unlocks.totalRuns + 1,
    totalVictories,
    totalBossKills,
    runHistory: entry ? [entry, ...unlocks.runHistory].slice(0, 50) : unlocks.runHistory, // keep last 50
  };
  saveGlobalUnlocks(victory ? applyUnlocks(baseUnlocks, totalBossKills) : baseUnlocks);
}

// —— 存档/读档 ——

export interface SaveSlot {
  name: string;
  timestamp: number;
  runState: RunState;
}

const SAVE_PREFIX = 'card-quest-save-';
const SAVE_COUNT = 3;

function normalizeSavedEnemy(enemy: EnemyInstance, suffix: string): EnemyInstance {
  // 旧存档可能缺少 drawPile/hand/discard/handSize（或仍带 deck 出牌池语义），按 id 从配置兜底
  const config = getEnemyById(enemy.id);
  const baseDeck = enemy.deck ?? config?.deck ?? [];
  const handSize = enemy.handSize ?? config?.handSize ?? (
    enemy.tier === 'boss' ? 5 : enemy.tier === 'elite' ? 4 : 3
  );
  return {
    ...enemy,
    instanceId: enemy.instanceId ?? `${enemy.id}_save_${suffix}`,
    statusEffects: enemy.statusEffects ?? [],
    deck: baseDeck,
    currentEnergy: enemy.currentEnergy ?? enemy.energy ?? config?.energy ?? 0,
    drawPile: enemy.drawPile ?? [...baseDeck],
    hand: enemy.hand ?? [],
    discard: enemy.discard ?? [],
    inPlay: enemy.inPlay ?? [],
    handSize,
  };
}

function normalizeSavedCombat(combat: CombatState): CombatState {
  const enemy = normalizeSavedEnemy(combat.enemy, 'main');
  const extraEnemies = (combat.extraEnemies ?? []).map((item, index) => normalizeSavedEnemy(item, `extra_${index}`));
  const defeatedEnemies = (combat.defeatedEnemies ?? []).map((item, index) => normalizeSavedEnemy(item, `defeated_${index}`));

  return {
    ...combat,
    enemy,
    extraEnemies,
    defeatedEnemies,
    currentEnemyIndex: combat.currentEnemyIndex ?? 0,
    playerStatusEffects: combat.playerStatusEffects ?? [],
    playerInPlay: combat.playerInPlay ?? [],
    radianceStacks: combat.radianceStacks ?? 0,
    ragePoints: combat.ragePoints ?? 0,
    playerRetaliateBonus: combat.playerRetaliateBonus ?? 0,
  };
}

function normalizeSaveSlot(slot: SaveSlot): SaveSlot {
  return {
    ...slot,
    runState: {
      ...slot.runState,
      cardsPlayedCount: slot.runState.cardsPlayedCount ?? 0,
      shopItems: slot.runState.shopItems ?? [],
      gachaDrawn: slot.runState.gachaDrawn ?? 0,
      pendingBlessings: slot.runState.pendingBlessings ?? [],
      discoveredEnemyCards: slot.runState.discoveredEnemyCards ?? [],
      combat: slot.runState.combat ? normalizeSavedCombat(slot.runState.combat) : null,
    },
  };
}

export function getSaveSlots(): (SaveSlot | null)[] {
  const slots: (SaveSlot | null)[] = [];
  for (let i = 0; i < SAVE_COUNT; i++) {
    try {
      const raw = window.localStorage.getItem(`${SAVE_PREFIX}${i}`);
      slots.push(raw ? normalizeSaveSlot(JSON.parse(raw)) : null);
    } catch {
      slots.push(null);
    }
  }
  return slots;
}

export function saveGame(slotIndex: number, runState: RunState, name?: string): void {
  const slot: SaveSlot = {
    name: name ?? `存档 ${slotIndex + 1}`,
    timestamp: Date.now(),
    runState,
  };
  window.localStorage.setItem(`${SAVE_PREFIX}${slotIndex}`, JSON.stringify(slot));
}

export function loadGame(slotIndex: number): SaveSlot | null {
  try {
    const raw = window.localStorage.getItem(`${SAVE_PREFIX}${slotIndex}`);
    return raw ? normalizeSaveSlot(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function deleteSave(slotIndex: number): void {
  window.localStorage.removeItem(`${SAVE_PREFIX}${slotIndex}`);
}

export function resetAllData(): void {
  for (let i = 0; i < SAVE_COUNT; i++) {
    window.localStorage.removeItem(`${SAVE_PREFIX}${i}`);
  }
  window.localStorage.removeItem(UNLOCK_KEY);
}
