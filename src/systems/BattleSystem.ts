// ============================================================
// 《勇者大冒险》- 战斗系统
// 遵循 game-vibe patterns.md 的事件/信号模式
// 数据驱动：所有数值引用配置，不硬编码
// ============================================================

import type {
  SkillCard,
  EnemyInstance,
  EnemyConfig,
  EnemyCard,
  EnemyTurnStep,
  CombatState,
  AppliedStatusEffect,
  Blessing,
  RarityColor,
  StatusEffect,
  StatusEffectType,
  CombatFxEvent,
} from '../types/game';


export function getStatusValue(effects: AppliedStatusEffect[], type: StatusEffect['type']): number {
  return effects
    .filter((effect) => effect.type === type)
    .reduce((sum, effect) => sum + effect.value, 0);
}

export function removeStatusStacks(
  effects: AppliedStatusEffect[],
  type: StatusEffect['type'],
  value: number,
): AppliedStatusEffect[] {
  let remainingValue = value;
  return effects
    .map((effect) => {
      if (effect.type !== type || remainingValue <= 0) return effect;
      const consumed = Math.min(effect.value, remainingValue);
      remainingValue -= consumed;
      return { ...effect, value: effect.value - consumed };
    })
    .filter((effect) => effect.value > 0);
}

function getStatusLabel(type: StatusEffect['type'], lang?: 'zh' | 'en'): string {
  const labels: Record<StatusEffect['type'], string> = {
    burn: '灼烧',
    poison: '中毒',
    bleed: '流血',
    fragile: '脆弱',
    weak: '虚弱',
    paralyze: '麻痹',
    empower: '强化',
    regen: '再生',
    armor: '护甲',
    agile: '敏捷',
    taunt: '嘲讽',
    stun: '眩晕',
    freeze: '冻结',
    echo: '回响',
    combo: '连击',
    berserk: '狂暴',
  };
  return labels[type] ?? type;
}

// 吞噬者被动机制常量
export const DEVOUDER_PASSIVE_EXECUTE_THRESHOLD = 0.15;
const DEVOUDER_EXECUTE_HEAL_RATIO = 0.15;
const DEVOUDER_EXECUTE_MAX_HP_GAIN = 2;
export const DEVOUDER_CHARACTER_ID = 'devourer';

// 狂战士血怒机制常量
const BERSERKER_CHARACTER_ID = 'armorbreaker';
const RAGE_PER_ATTACK_CARD = 15;   // 每打出一张攻击牌 +15 怒气
const RAGE_PER_HIT = 10;           // 每受到一次伤害 +10 怒气
const RAGE_MAX = 100;              // 怒气满 100 进入狂暴
const BERSERK_DURATION = 3;        // 狂暴持续回合数
const BERSERK_LIFESTEAL_PERCENT = 30; // 狂暴：攻击造成伤害的百分比转化为生命回复

export const PARALYZE_CARD_FAIL_CHANCE = 25;
export const AGILE_DODGE_CHANCE = 25;
export const FREEZE_SKIP_CHANCE_PER_STACK = 1;

const STATUS_PER_STACK = {
  dot: 1,         // 灼烧/中毒/流血 每层每回合伤害
  regen: 1,       // 每层每回合回复
  fragileFlat: 1, // 脆弱 每层受到伤害 +
  empowerFlat: 1, // 强化 每层造成伤害 +
  weakAtk: 1,     // 虚弱 每层敌人攻击 -
  stunPct: 20,    // 眩晕 每层 20% 跳过行动概率
  comboFlat: 1,    // 连击 每层攻击伤害 +
};

function isDamageOverTime(type: StatusEffect['type']): boolean {
  return type === 'burn' || type === 'poison' || type === 'bleed';
}

function isNegativePlayerStatus(type: StatusEffect['type']): boolean {
  return type === 'burn' || type === 'poison' || type === 'bleed' || type === 'fragile' || type === 'weak' || type === 'paralyze' || type === 'stun' || type === 'freeze';
}

function cleanseOneNegativeStatus(effects: AppliedStatusEffect[]): { effects: AppliedStatusEffect[]; cleansed?: StatusEffect['type'] } {
  const candidates = effects.filter(effect => isNegativePlayerStatus(effect.type) && effect.value > 0);
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  if (!target) return { effects };
  return { effects: removeStatusStacks(effects, target.type, 1), cleansed: target.type };
}

let instanceCounter = 0;

// 缺省手牌目标数推算：约等于一回合能出的牌数 + 1（按 tier 在数据里覆盖）
function deriveHandSize(config: EnemyConfig): number {
  if (config.handSize && config.handSize > 0) return config.handSize;
  return config.tier === 'boss' ? 5 : config.tier === 'elite' ? 4 : 3;
}

/** 卡壳废牌：污染玩家牌库的版本（SkillCard，玩家抽到只能空过/弃掉） */
export const JAM_SKILL_CARD: SkillCard = {
  id: 'jam',
  name: '卡壳',
  tier: 1,
  rarity: 'white',
  cost: 1,
  type: 'special',
  effect: {},
  description: '一张毫无用处的废牌，占用手牌与能量。',
  upgradeTo: null,
  characterBind: 'generic',
  flavorText: '思绪卡住了，什么也做不了。',
};

/** 卡壳废牌：污染敌方抽牌循环的版本（EnemyCard，怪抽到只能空过） */
export const JAM_ENEMY_CARD: EnemyCard = {
  id: 'jam',
  name: '卡壳',
  name_en: 'Jam',
  cost: 1,
  type: 'special',
  effect: {},
  description: '毫无用处的废牌。',
  description_en: 'A useless dead card.',
};

function shuffleEnemyCards(cards: EnemyCard[]): EnemyCard[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}


/** 从抽牌堆补牌到 target 张手牌；抽牌堆空则把弃牌堆洗回；都空则停 */
function drawEnemyHand(enemy: EnemyInstance, target: number): EnemyInstance {
  let drawPile = [...enemy.drawPile];
  let hand = [...enemy.hand];
  let discard = [...enemy.discard];
  while (hand.length < target) {
    if (drawPile.length === 0) {
      if (discard.length === 0) break;
      drawPile = shuffleEnemyCards(discard);
      discard = [];
    }
    hand = [...hand, drawPile[0]];
    drawPile = drawPile.slice(1);
  }
  return { ...enemy, drawPile, hand, discard };
}

/** 在手牌中随机挑一张出得起的牌（uniform，重复牌天然加权）；无则 null */
function pickAffordableFromHand(hand: EnemyCard[], availableMana: number): EnemyCard | null {
  const affordable = hand.filter((card) => card.cost <= availableMana);
  if (affordable.length === 0) return null;
  return affordable[Math.floor(Math.random() * affordable.length)];
}

function createEnemyInstance(config: EnemyConfig): EnemyInstance {
  return {
    ...config,
    instanceId: generateId(config.id),
    currentHp: config.hp,
    currentEnergy: config.energy,
    armor: 0,
    statusEffects: [],
    drawPile: shuffleEnemyCards(config.deck),
    hand: [],
    discard: [],
    inPlay: [],
    handSize: deriveHandSize(config),
  };
}

function generateId(prefix: string): string {
  instanceCounter += 1;
  return `${prefix}_${instanceCounter}`;
}

function rollChance(percent: number): boolean {
  return Math.random() * 100 < percent;
}

export function calculateHeal(card: SkillCard): number {
  return card.effect.heal ?? 0;
}

export function calculateArmor(card: SkillCard): number {
  return card.effect.armor ?? 0;
}

function getPlayerAttackBonus(
  playerStatus: AppliedStatusEffect[],
  enemyStatus: AppliedStatusEffect[],
  includeCombo: boolean,
): number {
  const empowerStacks = getStatusValue(playerStatus, 'empower');
  const comboStacks = includeCombo ? getStatusValue(playerStatus, 'combo') : 0;
  const weakStacks = getStatusValue(playerStatus, 'weak');
  const fragileStacks = getStatusValue(enemyStatus, 'fragile');
  return empowerStacks * STATUS_PER_STACK.empowerFlat
    + comboStacks * STATUS_PER_STACK.comboFlat
    + fragileStacks * STATUS_PER_STACK.fragileFlat
    - weakStacks * STATUS_PER_STACK.weakAtk;
}


export function executeEnemyCard(
  card: EnemyCard,
  enemy: EnemyInstance,
  playerArmor: number,
  playerHp: number,
  playerStatuses: AppliedStatusEffect[],
  playerRadiance = 0,
): {
  damageToPlayer: number;
  rawAttackDamage: number;   // 护甲吸收前的原始伤害（用于荆棘反弹）
  armorGained: number;
  playerHpAfter: number;
  playerArmorAfter: number;  // 本张牌吸收伤害后玩家剩余护甲（在怪回合内逐张累计）
  enemyAfter: EnemyInstance;
  playerStatusesAfter: AppliedStatusEffect[];
  radianceAfter: number;
  radianceBlockedStatus: boolean;
  manaBurnToPlayer: number;  // 灼烧玩家蓝量层数
  manaGainSelf: number;      // 怪自身回蓝量
  injectJamCount: number;    // 注入玩家弃牌堆的卡壳数量
} {
  let damageToPlayer = 0;
  let rawAttackDamage = 0;
  let armorGained = 0;
  let playerArmorAfter = playerArmor;  // 默认护甲不变（非攻击牌不消耗护甲）
  let enemyAfter = { ...enemy, statusEffects: [...enemy.statusEffects] };
  let playerStatusesAfter = [...playerStatuses];
  let radianceAfter = playerRadiance;
  let radianceBlockedStatus = false;
  const playerFragile = playerStatuses
    .filter((status) => status.type === 'fragile')
    .reduce((sum, status) => sum + status.value, 0);
  const effect = card.effect;

  // 攻击伤害：damage / damageToAll（对单体玩家等效）走攻击算法（虚弱减、强化加、脆弱加、护甲吸收）
  const baseDamage = (effect.damage ?? 0) + (effect.damageToAll ?? 0);
  if (baseDamage > 0) {
    const weakValue = getStatusValue(enemy.statusEffects, 'weak');
    const empowerValue = getStatusValue(enemy.statusEffects, 'empower');
    const attackValue = Math.max(0, baseDamage - weakValue * STATUS_PER_STACK.weakAtk + empowerValue * STATUS_PER_STACK.empowerFlat);
    rawAttackDamage = attackValue;
    const incomingDamage = attackValue + playerFragile * STATUS_PER_STACK.fragileFlat;
    const absorbed = Math.min(playerArmor, incomingDamage);
    damageToPlayer = incomingDamage - absorbed;
    playerArmorAfter = playerArmor - absorbed;  // 护甲吸收一部分，剩余结转给后续怪牌
  }

  if (effect.armor && effect.armor > 0) {
    armorGained = effect.armor;
    enemyAfter = { ...enemyAfter, armor: enemyAfter.armor + effect.armor };
  }

  if (effect.heal && effect.heal > 0) {
    enemyAfter = {
      ...enemyAfter,
      currentHp: Math.min(enemyAfter.hp, enemyAfter.currentHp + effect.heal),
    };
  }

  if (effect.applyStatus) {
    const target = effect.applyStatus.target ?? 'player';
    if (target === 'enemy') {
      enemyAfter = {
        ...enemyAfter,
        statusEffects: addStatus(enemyAfter.statusEffects, effect.applyStatus),
      };
    } else if (radianceAfter > 0 && isNegativePlayerStatus(effect.applyStatus.type)) {
      radianceAfter -= 1;
      radianceBlockedStatus = true;
    } else {
      playerStatusesAfter = addStatus(playerStatusesAfter, effect.applyStatus);
    }
  }

  const manaBurnToPlayer = effect.manaBurn && effect.manaBurn > 0 ? effect.manaBurn : 0;
  const manaGainSelf = effect.manaGain && effect.manaGain > 0 ? effect.manaGain : 0;
  const injectJamCount = effect.injectCard ? effect.injectCard.count : 0;

  return {
    damageToPlayer,
    rawAttackDamage,
    armorGained,
    playerHpAfter: Math.max(0, playerHp - damageToPlayer),
    playerArmorAfter,
    enemyAfter,
    playerStatusesAfter,
    radianceAfter,
    radianceBlockedStatus,
    manaBurnToPlayer,
    manaGainSelf,
    injectJamCount,
  };
}

export function addStatus(
  effects: AppliedStatusEffect[],
  status: StatusEffect,
): AppliedStatusEffect[] {
  const existing = effects.find((s) => s.type === status.type);
  if (!existing) {
    return [
      ...effects,
      {
        type: status.type,
        value: status.value,
        remainingTurns: status.duration,
      },
    ];
  }

  return effects.map((effect) => (
    effect.type === status.type
      ? {
          ...effect,
          value: effect.value + status.value,
          remainingTurns: Math.max(effect.remainingTurns, status.duration),
        }
      : effect
  ));
}

export function tickStatusEffects(
  effects: AppliedStatusEffect[],
): { damage: number; healing: number; remaining: AppliedStatusEffect[]; tickedTypes: StatusEffect['type'][] } {
  let damage = 0;
  let healing = 0;
  const tickedTypes: StatusEffect['type'][] = [];

  for (const effect of effects) {
    if (isDamageOverTime(effect.type)) {
      damage += effect.value * STATUS_PER_STACK.dot;
      tickedTypes.push(effect.type);
    }
    if (effect.type === 'regen') {
      healing += effect.value * STATUS_PER_STACK.regen;
    }
  }

  return { damage, healing, remaining: decayStatusEffects(effects), tickedTypes };
}

function decayStatusEffects(effects: AppliedStatusEffect[]): AppliedStatusEffect[] {
  return effects
    .filter((effect) => effect.type !== 'combo')
    .map((effect) => ({
      ...effect,
      // 麻痹不按回合衰减，持续叠加，仅靠出牌消耗层数
      remainingTurns: effect.type === 'agile' || effect.type === 'freeze' || effect.type === 'echo' || effect.type === 'armor' || effect.type === 'paralyze'
        ? effect.remainingTurns
        : effect.remainingTurns - 1,
    }))
    .filter((effect) => effect.remainingTurns > 0 && effect.value > 0);
}

function resolveEnemyStatusesAfterAction(
  beforeAction: AppliedStatusEffect[],
  afterAction: AppliedStatusEffect[],
): AppliedStatusEffect[] {
  return afterAction
    .map((effect) => {
      if (effect.type === 'freeze' || effect.type === 'paralyze') return effect;
      const previous = beforeAction.find((item) => item.type === effect.type);
      if (!previous || effect.remainingTurns > previous.remainingTurns) return effect;
      return {
        ...effect,
        remainingTurns: effect.remainingTurns - 1,
      };
    })
    .filter((effect) => effect.remainingTurns > 0 && effect.value > 0);
}

export function applyBlessings(
  blessings: Blessing[],
  initialState: CombatState,
): CombatState {
  return blessings.reduce((state, blessing) => {
    const nextArmor = blessing.effect.armor
      ? state.playerArmor + blessing.effect.armor
      : state.playerArmor;
    const nextMaxEnergy = blessing.effect.maxEnergyGain
      ? state.playerMaxEnergy + blessing.effect.maxEnergyGain
      : state.playerMaxEnergy;
    const nextEnergy = Math.min(
      nextMaxEnergy,
      state.playerEnergy + (blessing.effect.maxEnergyGain ?? 0) + (blessing.effect.energyGain ?? 0),
    );

    return {
      ...state,
      playerArmor: nextArmor,
      playerEnergy: nextEnergy,
      playerMaxEnergy: nextMaxEnergy,
    };
  }, initialState);
}

export interface BattleAction {
  card: SkillCard;
  targetId: string;
  handIndex: number;
  blessingActive: boolean;
  goldAvailable: number;
  passiveDamageBonus: number;
  characterId: string;
  lang?: 'zh' | 'en';
}

export interface BattleTurnResult {
  playerDamageDealt: number;
  playerHealReceived: number;
  playerArmorGained: number;
  enemyDamageDealt: number;
  enemyDefeated: boolean;
  statusDamage: number;
  goldSpent: number;
  goldGained: number;
  cardPlayed: SkillCard;
  isCrit: boolean;
  devourMaxHpGain: number;
  freezeSkips: number;
  messages: string[];
  brokeEnemyArmor: boolean;
  bonusDrawCards: number;
}

export function executeBattleAction(
  action: BattleAction,
  state: CombatState,
): { result: BattleTurnResult; newState: CombatState } {
  const messages: string[] = [];
  const card = action.card;
  const goldCost = card.effect.goldCost ?? 0;
  const result: BattleTurnResult = {
    playerDamageDealt: 0,
    playerHealReceived: 0,
    playerArmorGained: 0,
    enemyDamageDealt: 0,
    enemyDefeated: false,
    statusDamage: 0,
    goldSpent: goldCost,
    goldGained: card.effect.goldGain ?? 0,
    cardPlayed: card,
    isCrit: false,
    devourMaxHpGain: 0,
    freezeSkips: 0,
    messages,
    brokeEnemyArmor: false,
    bonusDrawCards: 0,
  };

  const msg = (zh: string, en: string) => action.lang === 'en' ? en : zh;

  if (goldCost > action.goldAvailable) {
    return {
      result: {
        ...result,
        goldSpent: 0,
        messages: [msg(`金币不足，无法使用 ${card.name}。`, `Not enough gold for ${card.name_en ?? card.name}.`)],
      },
      newState: state,
    };
  }

  const newEnergy = state.playerEnergy - card.cost;
  let enemies = [state.enemy, ...(state.extraEnemies ?? [])]
    .map(enemy => ({ ...enemy, statusEffects: [...enemy.statusEffects] }));
  const requestedTargetIndex = enemies.findIndex(enemy => enemy.instanceId === action.targetId && enemy.currentHp > 0);
  const fallbackTargetIndex = enemies.findIndex(enemy => enemy.currentHp > 0);
  // 嘲讽：若存在带嘲讽状态的存活敌人，强制目标指向它
  const tauntIndex = enemies.findIndex(enemy => enemy.currentHp > 0 && getStatusValue(enemy.statusEffects, 'taunt') > 0);
  const targetIndex = tauntIndex >= 0 ? tauntIndex
    : requestedTargetIndex >= 0 ? requestedTargetIndex : Math.max(0, fallbackTargetIndex);
  const targetEnemyBeforeAction = enemies[targetIndex] ?? state.enemy;
  let newPlayerHp = state.playerHp;
  let newPlayerArmor = state.playerArmor;
  let newPlayerEnergy = newEnergy;
  let playerStatuses = [...state.playerStatusEffects];
  let radianceStacks = state.radianceStacks ?? 0;
  let newRetaliateBonus = state.playerRetaliateBonus ?? 0;
  let lastSingleTargetDamage = 0;
  let berserkLifestealTotal = 0;
  const playerAttackHits: Record<string, number[]> = {};
  // 回响机制：消耗1层回响，卡牌效果额外触发一次（执行两遍）
  const echoStacks = getStatusValue(playerStatuses, 'echo');
  const echoCount = echoStacks > 0 ? 2 : 1;
  if (echoCount > 1) {
    playerStatuses = removeStatusStacks(playerStatuses, 'echo', 1);
    messages.push(msg(`${card.name} 触发回响！`, `${card.name_en ?? card.name} echoes!`));
  }

  // 狂战士血怒：打出攻击牌立即累积怒气，满 100 立即进入狂暴（本次攻击即可享受狂暴效果）；狂暴期间不再累积怒气
  let newRagePoints = state.ragePoints ?? 0;
  if (action.characterId === BERSERKER_CHARACTER_ID) {
    const alreadyBerserkBefore = getStatusValue(playerStatuses, 'berserk') > 0;
    if (!alreadyBerserkBefore) {
      const isAttackCard = card.type === 'attack' || (card.effect.damage ?? 0) > 0;
      if (isAttackCard) {
        newRagePoints = Math.min(RAGE_MAX, newRagePoints + RAGE_PER_ATTACK_CARD);
      }
      if (newRagePoints >= RAGE_MAX) {
        playerStatuses = addStatus(playerStatuses, { type: 'berserk', value: 1, duration: BERSERK_DURATION, target: 'player' });
        newRagePoints = 0;
        messages.push(msg('血怒爆发：进入狂暴状态！', 'Blood Fury erupts: entering Berserk!'));
      }
    }
  }

  const cleanseWithRadiance = () => {
    if (radianceStacks <= 0 || !card.tags?.includes('holy')) return;
    const cleansed = cleanseOneNegativeStatus(playerStatuses);
    if (!cleansed.cleansed) return;
    playerStatuses = cleansed.effects;
    radianceStacks -= 1;
    messages.push(msg(
      `${card.name} 消耗1层圣光，净化1层${getStatusLabel(cleansed.cleansed, action.lang)}。`,
      `${card.name_en ?? card.name} consumes 1 Radiance to cleanse 1 ${getStatusLabel(cleansed.cleansed, action.lang)}.`,
    ));
  };

  const getTargetEnemy = () => enemies[targetIndex] ?? enemies[0] ?? state.enemy;

  const updateEnemyAt = (enemyIndex: number, updater: (enemy: EnemyInstance) => EnemyInstance) => {
    enemies = enemies.map((enemy, index) => index === enemyIndex ? updater(enemy) : enemy);
  };

  const updateTargetEnemy = (updater: (enemy: EnemyInstance) => EnemyInstance) => {
    updateEnemyAt(targetIndex, updater);
  };

  if (card.effect.hpCost && card.effect.hpCost > 0) {
    const paid = Math.min(card.effect.hpCost, Math.max(0, newPlayerHp - 1));
    newPlayerHp -= paid;
    messages.push(msg(`${card.name} 献祭 ${paid} 点生命。`, `${card.name_en ?? card.name} sacrifices ${paid} HP.`));
    if (action.characterId === 'undeadpriest' && paid > 0) {
      playerStatuses = addStatus(playerStatuses, { type: 'empower', value: 1, duration: 2, target: 'player' });
      messages.push(msg('血祭仪式：献祭后获得 1 层强化。', 'Blood Rite: gain 1 Empower after sacrifice.'));
    }
  }

  const getDamageTags = (isCrit: boolean) => {
    const critTag = isCrit ? msg('（暴击！）', ' (Crit!)') : '';
    return { critTag };
  };

  const getDamagedEnemy = (enemy: EnemyInstance, damage: number): { enemy: EnemyInstance; actualDamage: number; brokeArmor: boolean } => {
    const absorbed = Math.min(enemy.armor, damage);
    const actualDamage = damage - absorbed;
    const brokeArmor = enemy.armor > 0 && actualDamage > 0;
    return {
      enemy: {
        ...enemy,
        armor: enemy.armor - absorbed,
        currentHp: Math.max(0, enemy.currentHp - actualDamage),
      },
      actualDamage,
      brokeArmor,
    };
  };

  // 吞噬斩杀：卡牌阈值 与 吞噬者被动(15%) 取较高阈值
  const cardExecuteThreshold = card.effect.executeThreshold ?? 0;
  const passiveExecuteThreshold = action.characterId === DEVOUDER_CHARACTER_ID ? DEVOUDER_PASSIVE_EXECUTE_THRESHOLD : 0;
  const executeThreshold = Math.max(cardExecuteThreshold, passiveExecuteThreshold);

  const tryDevour = (enemyAfter: EnemyInstance, hpBeforeDamage?: number): EnemyInstance => {
    if (executeThreshold <= 0) return enemyAfter;
    // 如果敌人被伤害击杀，用受伤前的HP来判断是否触发斩杀，防止伤害杀死敌人导致吞噬不生效
    const effectiveHp = (enemyAfter.currentHp <= 0 && hpBeforeDamage !== undefined) ? hpBeforeDamage : enemyAfter.currentHp;
    if (effectiveHp <= 0) return enemyAfter;
    if (effectiveHp / enemyAfter.hp > executeThreshold) return enemyAfter;
    // 触发斩杀
    const isDevourer = action.characterId === DEVOUDER_CHARACTER_ID;
    if (isDevourer) {
      const healAmount = Math.round(enemyAfter.hp * DEVOUDER_EXECUTE_HEAL_RATIO);
      newPlayerHp = Math.min(state.playerMaxHp + result.devourMaxHpGain + DEVOUDER_EXECUTE_MAX_HP_GAIN, newPlayerHp + healAmount + DEVOUDER_EXECUTE_MAX_HP_GAIN);
      result.devourMaxHpGain += DEVOUDER_EXECUTE_MAX_HP_GAIN;
      result.playerHealReceived += healAmount;
      messages.push(msg(
        `吞噬本能：${enemyAfter.name} 被吞噬斩杀，回复 ${healAmount} 生命，生命上限永久+2。`,
        `Devour: ${enemyAfter.name_en ?? enemyAfter.name} is devoured. Heal ${healAmount} HP, +2 max HP.`,
      ));
    } else {
      messages.push(msg(`${card.name} 斩杀了 ${enemyAfter.name}！`, `${card.name_en ?? card.name} executes ${enemyAfter.name_en ?? enemyAfter.name}!`));
    }
    return { ...enemyAfter, currentHp: 0 };
  };

  // 狂暴：造成伤害时按比例回复生命
  const applyBerserkLifesteal = (actualDamage: number) => {
    if (actualDamage <= 0) return;
    if (getStatusValue(playerStatuses, 'berserk') <= 0) return;
    const healAmount = Math.max(1, Math.floor(actualDamage * BERSERK_LIFESTEAL_PERCENT / 100));
    newPlayerHp = Math.min(state.playerMaxHp, newPlayerHp + healAmount);
    result.playerHealReceived += healAmount;
    berserkLifestealTotal += healAmount;
  };

  const applyDamage = (damage: number) => {
    const targetBefore = getTargetEnemy();
    const { enemy: damagedEnemy, actualDamage, brokeArmor } = getDamagedEnemy(targetBefore, damage);
    const finalEnemy = targetBefore.currentHp > 0 ? tryDevour(damagedEnemy, targetBefore.currentHp) : damagedEnemy;
    updateTargetEnemy(() => finalEnemy);
    lastSingleTargetDamage = actualDamage;
    result.playerDamageDealt += actualDamage;
    result.brokeEnemyArmor ||= brokeArmor;
    if (targetBefore.currentHp > 0 && finalEnemy.currentHp <= 0) {
      messages.push(msg(`${targetBefore.name} 被击败！`, `${targetBefore.name_en ?? targetBefore.name} defeated!`));
    }
    applyBerserkLifesteal(actualDamage);
    return actualDamage;
  };

  const calculatePlayerHitDamage = (
    baseDamage: number,
    statusForHit: AppliedStatusEffect[],
    includePersistentAttackBonus: boolean,
  ) => {
    const armorScaleDamage = Math.floor(newPlayerArmor * (card.effect.armorScale ?? 0));
    const fragileStacks = getStatusValue(getTargetEnemy().statusEffects, 'fragile');
    const fragileScaleDamage = fragileStacks * (card.effect.fragileScale ?? 0);
    const burnStacks = getStatusValue(getTargetEnemy().statusEffects, 'burn');
    const burnScaleDamage = burnStacks * (card.effect.burnScale ?? 0);
    const paralyzeStacks = getStatusValue(getTargetEnemy().statusEffects, 'paralyze');
    const paralyzeScaleDamage = paralyzeStacks * (card.effect.paralyzeScale ?? 0);
    // 狂暴：玩家处于 berserk 状态时，此攻击额外造成 berserkDamage 点伤害
    const berserkDamage = getStatusValue(playerStatuses, 'berserk') > 0 ? (card.effect.berserkDamage ?? 0) : 0;
    const fixedBonuses = armorScaleDamage + fragileScaleDamage + burnScaleDamage + paralyzeScaleDamage + berserkDamage;
    const scaledBaseDamage = Math.floor(baseDamage * (1 + action.passiveDamageBonus / 100)) + fixedBonuses;
    const rawDamage = scaledBaseDamage + (includePersistentAttackBonus
      ? getPlayerAttackBonus(statusForHit, getTargetEnemy().statusEffects, action.characterId === 'combatmaster')
      : 0);
    // 穷追猛打：目标生命低于 50% 时，按 ravenous 倍率追加伤害（1 = +100%）
    const ravenousTarget = getTargetEnemy();
    const ravenousMult = (card.effect.ravenous && ravenousTarget.hp > 0
      && ravenousTarget.currentHp / ravenousTarget.hp < 0.5)
      ? (1 + card.effect.ravenous)
      : 1;
    return Math.max(0, Math.floor(rawDamage * ravenousMult));
  };

  const applyPlayerAttackDamage = (prependMessage = true) => {
    const baseDamage = card.effect.damage ?? 0;
    if (baseDamage <= 0) return;
    const hitCount = Math.max(1, card.effect.damageMultiplier ?? 1);
    const isCombatMaster = action.characterId === 'combatmaster';
    const isCrit = rollChance(0); // 暴击率 0%，可调整
    let totalActualDamage = 0;

    for (let hit = 0; hit < hitCount; hit += 1) {
      if (getTargetEnemy().currentHp <= 0) break;
      const hitDamage = calculatePlayerHitDamage(baseDamage, playerStatuses, isCombatMaster || hit === 0);
      const damage = isCrit ? Math.floor(hitDamage * 1.5) : hitDamage;
      const actualDamage = applyDamage(damage);
      totalActualDamage += actualDamage;
      if (actualDamage > 0) {
        const targetId = getTargetEnemy().instanceId;
        playerAttackHits[targetId] = [...(playerAttackHits[targetId] ?? []), actualDamage];
      } else if (damage > 0) {
        const targetId = getTargetEnemy().instanceId;
        playerAttackHits[targetId] = [...(playerAttackHits[targetId] ?? []), 0];
      }
      if (isCombatMaster && damage > 0) {
        playerStatuses = addStatus(playerStatuses, { type: 'combo', value: 1, duration: 1, target: 'player' });
      }
    }

    result.isCrit = isCrit;
    const { critTag } = getDamageTags(isCrit);
    const damageMessage = msg(
      `${card.name} 对 ${targetEnemyBeforeAction.name} 造成 ${totalActualDamage} 点伤害${critTag}。`,
      `${card.name_en ?? card.name} deals ${totalActualDamage} damage to ${targetEnemyBeforeAction.name_en ?? targetEnemyBeforeAction.name}${critTag}.`,
    );
    if (prependMessage) messages.unshift(damageMessage);
    else messages.push(damageMessage);
  };

  const applyDamageToAll = (damage: number, excludeTarget: boolean) => {
    const defeatedNames: string[] = [];
    enemies = enemies.map((enemy, index) => {
      if (enemy.currentHp <= 0 || (excludeTarget && index === targetIndex)) return enemy;
      const hpBefore = enemy.currentHp;
      const { enemy: damagedEnemy, actualDamage, brokeArmor } = getDamagedEnemy(enemy, damage);
      result.playerDamageDealt += actualDamage;
      result.brokeEnemyArmor ||= brokeArmor;
      const finalEnemy = hpBefore > 0 ? tryDevour(damagedEnemy, hpBefore) : damagedEnemy;
      if (enemy.currentHp > 0 && finalEnemy.currentHp <= 0) defeatedNames.push(enemy.name);
      applyBerserkLifesteal(actualDamage);
      return finalEnemy;
    });
    defeatedNames.forEach(name => messages.push(msg(`${name} 被击败！`, `${name} defeated!`)));
  };

  const applyStatusEffect = (status: StatusEffect) => {
    const multipliedStatus = { ...status };
    const target = status.target ?? 'enemy';
    if (target === 'player') {
      playerStatuses = addStatus(playerStatuses, multipliedStatus);
    } else {
      updateTargetEnemy(enemy => ({
        ...enemy,
        statusEffects: addStatus(enemy.statusEffects, multipliedStatus),
      }));
    }
    const targetLabel = target === 'player' ? msg('自身', 'self') : getTargetEnemy().name;
    messages.push(msg(
      `${card.name} 对${targetLabel}施加了${getStatusLabel(status.type, action.lang)}。`,
      `${card.name_en ?? card.name} applies ${getStatusLabel(status.type, action.lang)} to ${targetLabel}.`,
    ));
  };

  const applyCardArmor = () => {
    const weakArmor = getStatusValue(getTargetEnemy().statusEffects, 'weak') * (card.effect.weakArmorScale ?? 0);
    const armor = calculateArmor(card) + weakArmor;
    if (armor <= 0) return;
    newPlayerArmor += armor;
    result.playerArmorGained += armor;
    messages.push(msg(`${card.name} 获得 ${armor} 点护甲。`, `${card.name_en ?? card.name} grants ${armor} armor.`));
  };

  const applyCardHeal = () => {
    if (!card.effect.heal) return;
    const heal = calculateHeal(card);
    newPlayerHp = Math.min(state.playerMaxHp, newPlayerHp + heal);
    result.playerHealReceived += heal;
    messages.push(msg(`${card.name} 回复了 ${heal} 点生命。`, `${card.name_en ?? card.name} heals ${heal} HP.`));
  };

  const applyCardStatus = () => {
    if (card.effect.applyStatus) applyStatusEffect(card.effect.applyStatus);
  };

  const applySingleUseEffects = () => {
    if (card.effect.manaGain && card.effect.manaGain > 0) {
      newPlayerEnergy = Math.min(state.playerMaxEnergy, newPlayerEnergy + card.effect.manaGain);
      messages.push(msg(`${card.name} 恢复 ${card.effect.manaGain} 点蓝量。`, `${card.name_en ?? card.name} restores ${card.effect.manaGain} mana.`));
    }
    if (card.effect.manaBurn && card.effect.manaBurn > 0) {
      const burn = card.effect.manaBurn;
      updateTargetEnemy(enemy => ({ ...enemy, currentEnergy: Math.max(0, enemy.currentEnergy - burn) }));
      messages.push(msg(
        `${card.name} 灼烧 ${getTargetEnemy().name} ${burn} 点蓝量。`,
        `${card.name_en ?? card.name} burns ${burn} mana from ${getTargetEnemy().name_en ?? getTargetEnemy().name}.`,
      ));
    }
    if (card.effect.injectCard) {
      const count = card.effect.injectCard.count;
      updateTargetEnemy(enemy => ({
        ...enemy,
        discard: [...enemy.discard, ...Array.from({ length: count }, () => JAM_ENEMY_CARD)],
      }));
      messages.push(msg(
        `${card.name} 向 ${getTargetEnemy().name} 的牌库注入 ${count} 张卡壳。`,
        `${card.name_en ?? card.name} injects ${count} Jam into ${getTargetEnemy().name_en ?? getTargetEnemy().name}'s deck.`,
      ));
    }
    if (card.effect.agileGain && card.effect.agileGain > 0) {
      playerStatuses = addStatus(playerStatuses, { type: 'agile', value: card.effect.agileGain, duration: 1, target: 'player' });
      messages.push(msg(`${card.name} 获得 ${card.effect.agileGain} 层敏捷。`, `${card.name_en ?? card.name} gains ${card.effect.agileGain} Agile.`));
    }
    if (card.effect.retaliateBoost && card.effect.retaliateBoost > 0) {
      newRetaliateBonus += card.effect.retaliateBoost;
      messages.push(msg(
        `反击强化：本回合反弹比例 +${card.effect.retaliateBoost}%。`,
        `Retaliate Boost: +${card.effect.retaliateBoost}% reflect this turn.`,
      ));
    }
    if (card.effect.echoGain && card.effect.echoGain > 0) {
      playerStatuses = addStatus(playerStatuses, { type: 'echo', value: card.effect.echoGain, duration: 1, target: 'player' });
      messages.push(msg(`${card.name} 获得 ${card.effect.echoGain} 层回响。`, `${card.name_en ?? card.name} gains ${card.effect.echoGain} Echo.`));
    }
    if (card.effect.radianceGain && card.effect.radianceGain > 0) {
      radianceStacks += card.effect.radianceGain;
      messages.push(msg(`${card.name} 积累 ${card.effect.radianceGain} 层圣光。`, `${card.name_en ?? card.name} builds ${card.effect.radianceGain} Radiance.`));
    }
    if (card.effect.radianceBurst && card.effect.radianceBurst > 0) {
      const burstStacks = radianceStacks;
      if (burstStacks > 0) {
        const burstValue = Math.floor(burstStacks * card.effect.radianceBurst * (1 + action.passiveDamageBonus / 100));
        radianceStacks = 0;
        applyDamage(burstValue);
        newPlayerHp = Math.min(state.playerMaxHp, newPlayerHp + burstValue);
        result.playerHealReceived += burstValue;
        messages.push(msg(
          `${card.name} 消耗 ${burstStacks} 层圣光，造成 ${burstValue} 点伤害并回复生命。`,
          `${card.name_en ?? card.name} consumes ${burstStacks} Radiance, dealing ${burstValue} damage and healing HP.`,
        ));
      }
    }
    if (card.effect.radianceJudgment && card.effect.radianceJudgment > 0) {
      const judgmentStacks = radianceStacks;
      if (judgmentStacks > 0) {
        const statusValue = judgmentStacks * card.effect.radianceJudgment;
        radianceStacks = 0;
        playerStatuses = addStatus(playerStatuses, { type: 'empower', value: statusValue, duration: 2, target: 'player' });
        updateTargetEnemy(enemy => ({
          ...enemy,
          statusEffects: addStatus(enemy.statusEffects, { type: 'weak', value: statusValue, duration: 2, target: 'enemy' }),
        }));
        messages.push(msg(
          `${card.name} 消耗 ${judgmentStacks} 层圣光，获得 ${statusValue} 层强化，并施加 ${statusValue} 层虚弱。`,
          `${card.name_en ?? card.name} consumes ${judgmentStacks} Radiance, gaining ${statusValue} Empower and applying ${statusValue} Weak.`,
        ));
      }
    }
  };

  // 回响循环：echoCount=1正常，echoCount=2执行两遍（整张卡完整重放，含资源类效果）
  for (let echoPass = 0; echoPass < echoCount; echoPass++) {
  cleanseWithRadiance();

  switch (card.type) {
    case 'attack': {
      if (card.effect.armorScale && card.effect.armor) {
        applyCardArmor();
        applyPlayerAttackDamage(false);
      } else {
        applyPlayerAttackDamage();
        applyCardArmor();
      }
      applyCardHeal();
      applyCardStatus();
      if (card.effect.drawCards) {
        result.bonusDrawCards += card.effect.drawCards;
        messages.push(msg(`${card.name} 抽 ${card.effect.drawCards} 张牌。`, `${card.name_en ?? card.name} draws ${card.effect.drawCards} cards.`));
      }
      break;
    }
    case 'defense': {
      applyCardArmor();
      applyCardStatus();
      if (card.effect.drawCards) {
        result.bonusDrawCards += card.effect.drawCards;
        messages.push(msg(`${card.name} 抽 ${card.effect.drawCards} 张牌。`, `${card.name_en ?? card.name} draws ${card.effect.drawCards} cards.`));
      }
      break;
    }
    case 'heal': {
      applyCardHeal();
      applyCardArmor();
      applyCardStatus();
      if (card.effect.drawCards) {
        result.bonusDrawCards += card.effect.drawCards;
        messages.push(msg(`${card.name} 抽 ${card.effect.drawCards} 张牌。`, `${card.name_en ?? card.name} draws ${card.effect.drawCards} cards.`));
      }
      if (card.effect.energyGain) {
        newPlayerEnergy = Math.min(state.playerMaxEnergy, newPlayerEnergy + card.effect.energyGain);
        messages.push(msg(`${card.name} 恢复 ${card.effect.energyGain} 点能量。`, `${card.name_en ?? card.name} restores ${card.effect.energyGain} energy.`));
      }
      break;
    }
    case 'buff': {
      if (card.effect.drawCards) {
        result.bonusDrawCards += card.effect.drawCards;
        messages.push(msg(`${card.name} 抽 ${card.effect.drawCards} 张牌。`, `${card.name_en ?? card.name} draws ${card.effect.drawCards} cards.`));
      }
      if (card.effect.energyGain) {
        newPlayerEnergy = Math.min(state.playerMaxEnergy, newPlayerEnergy + card.effect.energyGain);
        messages.push(msg(`${card.name} 恢复 ${card.effect.energyGain} 点能量。`, `${card.name_en ?? card.name} restores ${card.effect.energyGain} energy.`));
      }
      if (card.effect.heal) {
        applyCardHeal();
      }
      if (card.effect.armor) {
        applyCardArmor();
      }
      if (card.effect.applyStatus) {
        applyCardStatus();
      }
      break;
    }
    case 'debuff':
    case 'special': {
      applyPlayerAttackDamage();
      if (card.effect.heal) {
        applyCardHeal();
      }
      if (card.effect.armor) {
        applyCardArmor();
      }
      if (card.effect.drawCards) {
        result.bonusDrawCards += card.effect.drawCards;
        messages.push(msg(`${card.name} 抽 ${card.effect.drawCards} 张牌。`, `${card.name_en ?? card.name} draws ${card.effect.drawCards} cards.`));
      }
      if (card.effect.energyGain) {
        newPlayerEnergy = Math.min(state.playerMaxEnergy, newPlayerEnergy + card.effect.energyGain);
        messages.push(msg(`${card.name} 恢复 ${card.effect.energyGain} 点能量。`, `${card.name_en ?? card.name} restores ${card.effect.energyGain} energy.`));
      }
      if (card.effect.applyStatus) {
        applyCardStatus();
      }
      break;
    }
    case 'economy': {
      applyPlayerAttackDamage();
      if (card.effect.drawCards) {
        result.bonusDrawCards += card.effect.drawCards;
        messages.push(msg(`${card.name} 抽 ${card.effect.drawCards} 张牌。`, `${card.name_en ?? card.name} draws ${card.effect.drawCards} cards.`));
      }
      if (card.effect.goldGain) {
        messages.push(msg(`${card.name} 获得 ${card.effect.goldGain} 金币。`, `${card.name_en ?? card.name} gains ${card.effect.goldGain} gold.`));
      }
      if (card.effect.applyStatus) {
        applyCardStatus();
      }
      break;
    }
  }

  applySingleUseEffects();
  if (card.effect.consumeBurnDamage && card.effect.consumeBurnDamage > 0) {
    const burnTarget = getTargetEnemy();
    const burnStacks = getStatusValue(burnTarget.statusEffects, 'burn');
    if (burnStacks > 0 && burnTarget.currentHp > 0) {
      const consumeDamage = burnStacks * card.effect.consumeBurnDamage;
      const hpBefore = burnTarget.currentHp;
      const { enemy: damagedEnemy, actualDamage, brokeArmor } = getDamagedEnemy(burnTarget, consumeDamage);
      result.brokeEnemyArmor ||= brokeArmor;
      const clearedEnemy: EnemyInstance = {
        ...damagedEnemy,
        statusEffects: removeStatusStacks(damagedEnemy.statusEffects, 'burn', burnStacks),
      };
      const finalEnemy = tryDevour(clearedEnemy, hpBefore);
      updateTargetEnemy(() => finalEnemy);
      result.playerDamageDealt += actualDamage;
      messages.push(msg(
        `${card.name} 消耗 ${burnStacks} 层灼烧，造成 ${actualDamage} 点伤害。`,
        `${card.name_en ?? card.name} consumes ${burnStacks} Burn, dealing ${actualDamage} damage.`,
      ));
      if (hpBefore > 0 && finalEnemy.currentHp <= 0) {
        messages.push(msg(`${burnTarget.name} 被击败！`, `${burnTarget.name_en ?? burnTarget.name} defeated!`));
      }
    }
  }

  const targetHadWeak = getStatusValue(targetEnemyBeforeAction.statusEffects, 'weak') > 0;
  const weakDraw = card.effect.drawIfWeak ?? 0;
  if (weakDraw > 0 && targetHadWeak) {
    result.bonusDrawCards += weakDraw;
    messages.push(msg(`${card.name} 抽 ${weakDraw} 张牌。`, `${card.name_en ?? card.name} draws ${weakDraw} card${weakDraw > 1 ? 's' : ''}.`));
  }

  const targetHadParalyze = getStatusValue(targetEnemyBeforeAction.statusEffects, 'paralyze') > 0;
  if (card.effect.paralyzeIfNone && !targetHadParalyze) {
    updateTargetEnemy(enemy => ({
      ...enemy,
      statusEffects: addStatus(enemy.statusEffects, { type: 'paralyze', value: card.effect.paralyzeIfNone ?? 0, duration: 1, target: 'enemy' }),
    }));
    messages.push(msg(`${card.name} 施加 ${card.effect.paralyzeIfNone} 层麻痹。`, `${card.name_en ?? card.name} applies ${card.effect.paralyzeIfNone} Paralyze.`));
  }
  if (card.effect.consumeParalyze && targetHadParalyze) {
    const paralyzeStacks = getStatusValue(getTargetEnemy().statusEffects, 'paralyze');
    updateTargetEnemy(enemy => ({
      ...enemy,
      statusEffects: removeStatusStacks(enemy.statusEffects, 'paralyze', card.effect.consumeParalyze ?? 0),
    }));
    messages.push(msg(`${card.name} 消耗 ${Math.min(card.effect.consumeParalyze, paralyzeStacks)} 层麻痹。`, `${card.name_en ?? card.name} consumes ${Math.min(card.effect.consumeParalyze, paralyzeStacks)} Paralyze.`));
  }
  if (card.effect.energyIfParalyzed && targetHadParalyze) {
    newPlayerEnergy = Math.min(state.playerMaxEnergy, newPlayerEnergy + card.effect.energyIfParalyzed);
    messages.push(msg(`${card.name} 恢复 ${card.effect.energyIfParalyzed} 点能量。`, `${card.name_en ?? card.name} restores ${card.effect.energyIfParalyzed} energy.`));
  }
  const paralyzeDraw = card.effect.drawIfParalyzed ?? 0;
  if (paralyzeDraw > 0 && targetHadParalyze) {
    result.bonusDrawCards += paralyzeDraw;
    messages.push(msg(`${card.name} 抽 ${paralyzeDraw} 张牌。`, `${card.name_en ?? card.name} draws ${paralyzeDraw} card${paralyzeDraw > 1 ? 's' : ''}.`));
  }

  // 引爆：对目标立即结算所有持续伤害(灼烧/中毒/流血)，每层造成 detonate 点额外伤害，并移除这些层数
  if (card.effect.detonate && card.effect.detonate > 0) {
    const detonateTarget = getTargetEnemy();
    const dotStacks = detonateTarget.statusEffects
      .filter(eff => isDamageOverTime(eff.type))
      .reduce((sum, eff) => sum + eff.value, 0);
    if (dotStacks > 0 && detonateTarget.currentHp > 0) {
      const detonateDamage = dotStacks * card.effect.detonate;
      const hpBefore = detonateTarget.currentHp;
      const { enemy: damagedEnemy, actualDamage, brokeArmor } = getDamagedEnemy(detonateTarget, detonateDamage);
      result.brokeEnemyArmor ||= brokeArmor;
      const clearedEnemy: EnemyInstance = {
        ...damagedEnemy,
        statusEffects: damagedEnemy.statusEffects.filter(eff => !isDamageOverTime(eff.type)),
      };
      const finalEnemy = tryDevour(clearedEnemy, hpBefore);
      updateTargetEnemy(() => finalEnemy);
      result.playerDamageDealt += actualDamage;
      messages.push(msg(
        `${card.name} 引爆 ${detonateTarget.name} 的持续伤害，造成 ${actualDamage} 点伤害。`,
        `${card.name_en ?? card.name} detonates DoT on ${detonateTarget.name_en ?? detonateTarget.name} for ${actualDamage} damage.`,
      ));
      if (hpBefore > 0 && finalEnemy.currentHp <= 0) {
        messages.push(msg(`${detonateTarget.name} 被击败！`, `${detonateTarget.name_en ?? detonateTarget.name} defeated!`));
      }
    }
  }

  const isAoeCard = Boolean(card.effect.damageToAll || card.tags?.includes('aoe'));
  const aoeDamage = card.effect.damageToAll ?? (card.tags?.includes('aoe') ? lastSingleTargetDamage : 0);
  const aoeIncludesTarget = Boolean(card.effect.damageToAll);
  const aoeTargetCountBefore = enemies.filter((enemy, index) => (
    enemy.currentHp > 0 && (aoeIncludesTarget || index !== targetIndex)
  )).length;
  if (isAoeCard && aoeDamage > 0 && aoeTargetCountBefore > 0) {
    applyDamageToAll(aoeDamage, !aoeIncludesTarget);
    messages.push(msg(
      `群伤对 ${aoeTargetCountBefore} 个敌人造成 ${aoeDamage} 点伤害。`,
      `AoE deals ${aoeDamage} damage to ${aoeTargetCountBefore} enemies.`,
    ));
  }

  } // end echo loop


  // —— 被动技能结算 ————

  // 元素刻印：火/冰/雷牌额外施加对应状态。
  if (action.characterId === 'elementmage') {
    const elementTag = (card.tags ?? []).find(t => ['fire', 'ice', 'lightning'].includes(t));
    if (elementTag) {
      const statusType = elementTag === 'fire' ? 'burn' : elementTag === 'ice' ? 'weak' : 'paralyze';
      const duration = elementTag === 'lightning' ? 1 : 2;
      updateTargetEnemy(enemy => ({
        ...enemy,
        statusEffects: addStatus(enemy.statusEffects, { type: statusType, value: 1, duration, target: 'enemy' }),
      }));
      messages.push(msg('元素刻印触发。', 'Elemental Imprint triggers.'));
    }
  }

  const allRemainingEnemies = enemies.filter(enemy => enemy.currentHp > 0);
  const newlyDefeatedEnemies = enemies.filter(enemy => enemy.currentHp <= 0);
  const finalEnemy = allRemainingEnemies[0] ?? newlyDefeatedEnemies[0] ?? getTargetEnemy();
  const finalExtraEnemies = allRemainingEnemies.slice(1);
  result.enemyDefeated = allRemainingEnemies.length === 0;

  if (card.effect.retainArmorPercent && newPlayerArmor > 0) {
    playerStatuses = addStatus(playerStatuses, {
      type: 'armor',
      value: card.effect.retainArmorPercent,
      duration: 1,
      target: 'player',
    });
    messages.push(msg(
      `${card.name} 会在回合结束时保留 ${card.effect.retainArmorPercent}% 护甲。`,
      `${card.name_en ?? card.name} retains ${card.effect.retainArmorPercent}% armor at end of turn.`,
    ));
  }

  if (berserkLifestealTotal > 0) {
    messages.push(msg(
      `狂暴吸血：回复 ${berserkLifestealTotal} 点生命。`,
      `Berserk lifesteal: restore ${berserkLifestealTotal} HP.`,
    ));
  }

  // 根据出牌位置移除手牌，避免引用相等导致删错卡
  const newHand = state.hand.filter((_, index) => index !== action.handIndex);

  const newState: CombatState = {
    ...state,
    playerHp: newPlayerHp,
    playerMaxHp: state.playerMaxHp + result.devourMaxHpGain,
    playerArmor: newPlayerArmor,
    playerEnergy: newPlayerEnergy,
    enemy: finalEnemy,
    extraEnemies: finalExtraEnemies,
    currentEnemyIndex: finalExtraEnemies.length > 0 ? Math.min(state.currentEnemyIndex, finalExtraEnemies.length) : 0,
    defeatedEnemies: Array.from(new Map([...(state.defeatedEnemies ?? []), ...newlyDefeatedEnemies].map(enemy => [enemy.instanceId, enemy])).values()),
    hand: newHand,
    playerInPlay: [...state.playerInPlay, card],
    playerStatusEffects: playerStatuses,
    radianceStacks,
    playedCardTypesThisTurn: [...state.playedCardTypesThisTurn, card.type],
    handLimit: state.handLimit,
    drawPerTurn: state.drawPerTurn,
    ragePoints: newRagePoints,
    playerRetaliateBonus: newRetaliateBonus,
    playerAttackHits,
  };

  return { result, newState };
}

export function endTurn(state: CombatState, lang?: 'zh' | 'en', characterId?: string): {
  state: CombatState;
  enemyDamage: number;
  rawDamage: number;     // 护甲吸收前的原始伤害
  statusDamage: number;
  messages: string[];
  enemySteps: EnemyTurnStep[];
  freezeSkips: number;
} {
  const msg = (zh: string, en: string) => lang === 'en' ? en : zh;
  const messages: string[] = [];
  const allEnemies = [state.enemy, ...(state.extraEnemies ?? [])].filter(e => e.currentHp > 0);
  const actingEnemy = allEnemies[state.currentEnemyIndex % Math.max(1, allEnemies.length)] ?? allEnemies[0];
  const actingEnemyIds = new Set(actingEnemy ? [actingEnemy.instanceId] : []);
  let totalEnemyDamage = 0;
  let totalRawDamage = 0;
  let totalStatusDamage = 0;
  let remainingPlayerHp = state.playerHp;
  let remainingPlayerArmor = state.playerArmor;
  let remainingPlayerStatuses = [...(state.playerStatusEffects ?? [])];
  let remainingRadianceStacks = state.radianceStacks ?? 0;
  let playerEnergyBurn = 0;              // 累计灼烧玩家下回合起始能量
  const injectedJamCards: SkillCard[] = []; // 累计注入玩家弃牌堆的卡壳废牌
  const processedEnemies: EnemyInstance[] = [];
  let liveRagePoints = state.ragePoints ?? 0; // 狂战士：怒气点数，受击后立即结算（不再等回合结束统一结算）

  // —— 逐张出牌动画快照 ——
  // 显示版：各怪 DoT/再生结算后的 HP（状态未衰减），仅用于回放展示，不影响真实结算
  const displayEnemies = allEnemies.map((e) => {
    const { damage, healing } = tickStatusEffects(e.statusEffects);
    return {
      ...e,
      currentHp: Math.min(e.hp, Math.max(0, e.currentHp - damage + healing)),
      statusEffects: [...e.statusEffects],
    };
  });
  const enemySteps: EnemyTurnStep[] = [];
  let freezeSkips = 0;
  const pushStep = (
    acting: EnemyInstance | null,
    reveal: EnemyTurnStep['reveal'],
    stepMessage: string,
    lastEnemyAction?: CombatState['lastEnemyAction'],
    fxEvents?: CombatFxEvent[],
  ) => {
    const list = displayEnemies.map((de) => (acting && de.instanceId === acting.instanceId ? acting : de));
    const actionWithFx = lastEnemyAction && fxEvents ? { ...lastEnemyAction, fxEvents } : lastEnemyAction;
    enemySteps.push({
      combat: {
        ...state,
        fxEvents,
        playerHp: remainingPlayerHp,
        playerArmor: remainingPlayerArmor,
        playerStatusEffects: remainingPlayerStatuses,
        radianceStacks: remainingRadianceStacks,
        ragePoints: liveRagePoints,
        enemy: list[0],
        extraEnemies: list.slice(1),
        lastEnemyAction: actionWithFx,
      },
      reveal,
      message: stepMessage,
      fxEvents,
    });
  };

  const playerStatusResult = tickStatusEffects(state.playerStatusEffects ?? []);
  if (playerStatusResult.damage > 0) {
    totalStatusDamage += playerStatusResult.damage;
    messages.push(msg(`你受到 ${playerStatusResult.damage} 点状态伤害。`, `You take ${playerStatusResult.damage} status damage.`));
  }
  if (playerStatusResult.healing > 0) {
    messages.push(msg(`再生恢复 ${playerStatusResult.healing} 点生命。`, `Regen heals ${playerStatusResult.healing} HP.`));
  }
  remainingPlayerHp = Math.min(
    state.playerMaxHp,
    Math.max(0, state.playerHp - playerStatusResult.damage + playerStatusResult.healing),
  );
  remainingPlayerStatuses = playerStatusResult.remaining;

  // 起手帧：玩家或敌人有 DoT/再生时，先播一帧让数值变化（无卡牌弹窗）
  const anyEnemyHpChange = displayEnemies.some((d, i) => d.currentHp !== allEnemies[i].currentHp);
  if (playerStatusResult.damage > 0 || playerStatusResult.healing > 0 || anyEnemyHpChange) {
    const startMsg = playerStatusResult.damage > 0
      ? msg(`你受到 ${playerStatusResult.damage} 点状态伤害。`, `You take ${playerStatusResult.damage} status damage.`)
      : playerStatusResult.healing > 0
        ? msg(`再生恢复 ${playerStatusResult.healing} 点生命。`, `Regen heals ${playerStatusResult.healing} HP.`)
        : '';
    const playerTickEvents: CombatFxEvent[] = playerStatusResult.tickedTypes.map((type, idx) => ({
      id: `${state.turnNumber}:player:tick:${type}:${idx}`,
      target: 'player' as const,
      type,
      phase: 'tick' as const,
    }));
    // 敌方 DoT fxEvents（每个受伤的敌人按类型触发）
    const enemyTickEvents: CombatFxEvent[] = displayEnemies.flatMap((de) => {
      const orig = allEnemies.find((oe) => oe.instanceId === de.instanceId);
      if (!orig || de.currentHp >= orig.currentHp) return [];
      return orig.statusEffects
        .filter((s) => isDamageOverTime(s.type))
        .map((s, idx) => ({
          id: `${state.turnNumber}:${de.instanceId}:tick:${s.type}:${idx}`,
          target: 'enemy' as const,
          enemyId: de.instanceId,
          type: s.type,
          phase: 'tick' as const,
        }));
    });
    const allTickEvents = [...playerTickEvents, ...enemyTickEvents];
    pushStep(null, null, startMsg, undefined, allTickEvents.length > 0 ? allTickEvents : undefined);
  }

  for (const e of allEnemies) {
    const { damage: eStatusDmg, healing: eStatusHealing, remaining: eRemainingStatuses, tickedTypes: eTickedTypes } = tickStatusEffects(e.statusEffects);
    const eAfterStatus: EnemyInstance = {
      ...e,
      armor: 0,
      currentHp: Math.min(e.hp, Math.max(0, e.currentHp - eStatusDmg + eStatusHealing)),
      statusEffects: actingEnemyIds.has(e.instanceId) ? [...e.statusEffects] : eRemainingStatuses,
    };
    if (eStatusDmg > 0) messages.push(msg(`${e.name} 受到 ${eStatusDmg} 点持续伤害。`, `${e.name_en ?? e.name} takes ${eStatusDmg} status damage.`));
    if (eStatusHealing > 0) messages.push(msg(`${e.name} 恢复 ${eStatusHealing} 点生命。`, `${e.name_en ?? e.name} heals ${eStatusHealing} HP.`));

    if (eAfterStatus.currentHp <= 0) {
      processedEnemies.push(eAfterStatus);
      continue;
    }

    if (!actingEnemyIds.has(e.instanceId)) {
      processedEnemies.push({
        ...eAfterStatus,
        discard: [...eAfterStatus.discard, ...eAfterStatus.inPlay],
        inPlay: [],
      });
      continue;
    }

    // 行动怪：先把上回合暂存场上的牌并入弃牌堆；冻结跳过时也要归位，但不摸牌不出牌。
    const eMergedInPlay: EnemyInstance = {
      ...eAfterStatus,
      discard: [...eAfterStatus.discard, ...eAfterStatus.inPlay],
      inPlay: [],
    };

    const freezeStacks = getStatusValue(eMergedInPlay.statusEffects, 'freeze');
    const thawedEnemy = freezeStacks > 0
      ? {
          ...eMergedInPlay,
          statusEffects: eMergedInPlay.statusEffects.filter(status => status.type !== 'freeze'),
        }
      : eMergedInPlay;
    const frozen = freezeStacks > 0 && rollChance(freezeStacks * FREEZE_SKIP_CHANCE_PER_STACK);
    if (frozen) {
      const frozenMsg = msg(`${e.name} 被冻结，跳过行动。`, `${e.name_en ?? e.name} is frozen and skips its action.`);
      messages.push(frozenMsg);
      freezeSkips += 1;
      pushStep(thawedEnemy, null, frozenMsg, undefined, [{
        id: `${state.turnNumber}:${e.instanceId}:freeze`,
        target: 'enemy',
        enemyId: e.instanceId,
        type: 'freeze',
        phase: 'triggered',
      }]);
      processedEnemies.push({
        ...thawedEnemy,
        currentEnergy: Math.max(thawedEnemy.currentEnergy, thawedEnemy.energy),
        statusEffects: resolveEnemyStatusesAfterAction(eAfterStatus.statusEffects, thawedEnemy.statusEffects),
      });
      continue;
    }

    // 确保抽牌洗牌池（drawPile 空时洗 discard）不含上回合还在场上的牌。

    // 行动怪：回满蓝量 → 抽牌至 handSize → 连续出牌
    const phased = thawedEnemy;

    // 眩晕判定：按层数 roll，命中则整个怪回合跳过
    const stunStacks = getStatusValue(phased.statusEffects, 'stun');
    const stunned = stunStacks > 0 && rollChance(Math.min(100, stunStacks * STATUS_PER_STACK.stunPct));

    if (stunned) {
      const stunMsg = msg(`${e.name} 被眩晕，无法行动。`, `${e.name_en ?? e.name} is stunned, cannot act.`);
      messages.push(stunMsg);
      pushStep(phased, null, stunMsg, undefined, [{
        id: `${state.turnNumber}:${e.instanceId}:stun`,
        target: 'enemy',
        enemyId: e.instanceId,
        type: 'stun' as StatusEffectType,
        phase: 'triggered',
      }]);
      processedEnemies.push({
        ...phased,
        currentEnergy: Math.max(phased.currentEnergy, phased.energy),
        statusEffects: resolveEnemyStatusesAfterAction(e.statusEffects, phased.statusEffects),
      });
      continue;
    }

    // 蓝量回满后抽牌到手牌目标数（受 manaBurn 影响可能不满）
    let mana = Math.max(phased.currentEnergy, phased.energy);
    let actingState: EnemyInstance = drawEnemyHand({ ...phased, currentEnergy: mana }, phased.handSize);
    // 摸牌帧：先展示补满后的手牌数，停顿一拍再开始出牌（reveal 为 null，不揭示具体牌）
    if (actingState.hand.length > phased.hand.length) {
      pushStep(
        { ...actingState, currentEnergy: mana },
        null,
        msg(`${e.name} 摸牌。`, `${e.name_en ?? e.name} draws cards.`),
      );
    }
    let plays = 0;
    // 敌人不在回合内补抽，手牌有限且 cost>=1 必然耗尽蓝量 → 循环终止。
    // 999 仅为防御性兜底，正常永不触达。
    while (plays < 999) {
      const card = pickAffordableFromHand(actingState.hand, mana);
      if (!card) break;
      // 麻痹：有层数时每出一张牌固定概率失效，无论是否命中都消耗1层
      const enemyParalyzeStacks = getStatusValue(actingState.statusEffects, 'paralyze');
      const enemyParalyzed = enemyParalyzeStacks > 0 && rollChance(PARALYZE_CARD_FAIL_CHANCE);
      if (enemyParalyzeStacks > 0) {
        actingState = {
          ...actingState,
          statusEffects: removeStatusStacks(actingState.statusEffects, 'paralyze', 1),
        };
      }
      if (enemyParalyzed) {
        const paraMsg = msg(
          `${e.name} 被麻痹，【${lang === 'en' && card.name_en ? card.name_en : card.name}】没有生效。`,
          `${e.name_en ?? e.name} is paralyzed, ${lang === 'en' && card.name_en ? card.name_en : card.name} had no effect.`,
        );
        messages.push(paraMsg);
        // 麻痹失效也消耗能量，与玩家侧一致
        mana = Math.max(0, mana - card.cost);
        const handIdx2 = actingState.hand.indexOf(card);
        actingState = {
          ...actingState,
          hand: actingState.hand.filter((_, i) => i !== handIdx2),
          inPlay: [...actingState.inPlay, card],
          currentEnergy: Math.min(actingState.energy, mana),
        };
        pushStep(actingState, null, paraMsg, undefined, [{
          id: `${state.turnNumber}:${e.instanceId}:paralyze`,
          target: 'enemy',
          enemyId: e.instanceId,
          type: 'paralyze' as StatusEffectType,
          phase: 'triggered',
        }]);
        plays += 1;
        continue;
      }

      const isAttackCard = ((card.effect.damage ?? 0) + (card.effect.damageToAll ?? 0)) > 0;
      const agileStacks = getStatusValue(remainingPlayerStatuses, 'agile');
      const agileCanTrigger = isAttackCard && agileStacks > 0;
      const hasAgileDodge = agileCanTrigger && rollChance(AGILE_DODGE_CHANCE);
      const statusesAfterAgile = agileCanTrigger
        ? removeStatusStacks(remainingPlayerStatuses, 'agile', 1)
        : remainingPlayerStatuses;
      const cardResult = hasAgileDodge
        ? {
            damageToPlayer: 0,
            rawAttackDamage: 0,
            armorGained: 0,
            playerHpAfter: remainingPlayerHp,
            playerArmorAfter: remainingPlayerArmor,
            enemyAfter: actingState,
            playerStatusesAfter: statusesAfterAgile,
            radianceAfter: remainingRadianceStacks,
            radianceBlockedStatus: false,
            manaBurnToPlayer: 0,
            manaGainSelf: 0,
            injectJamCount: 0,
          }
        : executeEnemyCard(
            card,
            actingState,
            remainingPlayerArmor,
            remainingPlayerHp,
            statusesAfterAgile,
            remainingRadianceStacks,
          );
      // 出过的牌移出手牌、暂存场上（inPlay），下回合行动开始时才并入弃牌堆
      const handIdx = actingState.hand.indexOf(card);
      const nextHand = actingState.hand.filter((_, i) => i !== handIdx);
      const manaAfter = mana - card.cost + cardResult.manaGainSelf;
      actingState = {
        ...cardResult.enemyAfter,
        hand: nextHand,
        inPlay: [...cardResult.enemyAfter.inPlay, card],
        currentEnergy: Math.min(actingState.energy, manaAfter),
      };
      mana = manaAfter;
      plays += 1;

      totalEnemyDamage += cardResult.damageToPlayer;
      totalRawDamage += cardResult.rawAttackDamage;
      remainingPlayerHp = cardResult.playerHpAfter;
      remainingPlayerArmor = cardResult.playerArmorAfter;
      remainingPlayerStatuses = cardResult.playerStatusesAfter;
      remainingRadianceStacks = cardResult.radianceAfter;
      // 狂战士血怒：每受到一次伤害立即累积怒气，满 100 立即进入狂暴；狂暴期间不再累积怒气
      if (characterId === BERSERKER_CHARACTER_ID && cardResult.damageToPlayer > 0) {
        const alreadyBerserk = getStatusValue(remainingPlayerStatuses, 'berserk') > 0;
        if (!alreadyBerserk) {
          liveRagePoints = Math.min(RAGE_MAX, liveRagePoints + RAGE_PER_HIT);
          if (liveRagePoints >= RAGE_MAX) {
            remainingPlayerStatuses = addStatus(remainingPlayerStatuses, { type: 'berserk', value: 1, duration: BERSERK_DURATION, target: 'player' });
            liveRagePoints = 0;
            messages.push(msg('血怒爆发：进入狂暴状态！', 'Blood Fury erupts: entering Berserk!'));
          }
        }
      }
      if (cardResult.manaBurnToPlayer > 0) playerEnergyBurn += cardResult.manaBurnToPlayer;
      for (let k = 0; k < cardResult.injectJamCount; k += 1) injectedJamCards.push(JAM_SKILL_CARD);

      const cardName = lang === 'en' && card.name_en ? card.name_en : card.name;
      const stepMessages: string[] = [];
      if (hasAgileDodge) {
        stepMessages.push(msg(
          `敏捷闪避：你避开了 ${e.name} 的【${cardName}】。`,
          `Agile Dodge: you dodge ${e.name_en ?? e.name}'s ${cardName}.`,
        ));
      } else if (cardResult.damageToPlayer > 0) {
        stepMessages.push(msg(
          `${e.name} 使用【${cardName}】，造成 ${cardResult.damageToPlayer} 点伤害。`,
          `${e.name_en ?? e.name} plays ${cardName}, dealing ${cardResult.damageToPlayer} damage.`,
        ));
      }
      if (cardResult.armorGained > 0) {
        stepMessages.push(msg(
          `${e.name} 使用【${cardName}】，获得 ${cardResult.armorGained} 点护甲。`,
          `${e.name_en ?? e.name} plays ${cardName}, gains ${cardResult.armorGained} armor.`,
        ));
      }
      if (cardResult.radianceBlockedStatus && card.effect.applyStatus) {
        stepMessages.push(msg(
          `圣光抵消了 ${e.name} 的${getStatusLabel(card.effect.applyStatus.type, lang)}。`,
          `Radiance blocks ${e.name_en ?? e.name}'s ${getStatusLabel(card.effect.applyStatus.type, lang)}.`,
        ));
      } else if (card.effect.applyStatus) {
        stepMessages.push(msg(
          `${e.name} 使用【${cardName}】，施加${getStatusLabel(card.effect.applyStatus.type, lang)}。`,
          `${e.name_en ?? e.name} plays ${cardName}, applies ${getStatusLabel(card.effect.applyStatus.type, lang)}.`,
        ));
      }
      if (cardResult.manaBurnToPlayer > 0) {
        stepMessages.push(msg(
          `${e.name} 使用【${cardName}】，灼烧你 ${cardResult.manaBurnToPlayer} 点蓝量。`,
          `${e.name_en ?? e.name} plays ${cardName}, burns ${cardResult.manaBurnToPlayer} of your mana.`,
        ));
      }
      if (cardResult.injectJamCount > 0) {
        stepMessages.push(msg(
          `${e.name} 使用【${cardName}】，向你的牌库注入 ${cardResult.injectJamCount} 张卡壳。`,
          `${e.name_en ?? e.name} plays ${cardName}, injects ${cardResult.injectJamCount} Jam into your deck.`,
        ));
      }
      if (cardResult.damageToPlayer === 0 && cardResult.armorGained === 0
          && !card.effect.applyStatus && (card.effect.heal ?? 0) > 0) {
        stepMessages.push(msg(
          `${e.name} 使用【${cardName}】，恢复 ${card.effect.heal} 点生命。`,
          `${e.name_en ?? e.name} plays ${cardName}, heals ${card.effect.heal} HP.`,
        ));
      }
      // 兜底：纯增益牌（如仅给自己 empower）也要有一条记录
      if (stepMessages.length === 0) {
        stepMessages.push(msg(`${e.name} 使用【${cardName}】。`, `${e.name_en ?? e.name} plays ${cardName}.`));
      }
      messages.push(...stepMessages);

      // 出牌动画快照：用本张牌结算后的累计值
      const selfStatus = card.effect.applyStatus?.target === 'enemy';
      pushStep(
        actingState,
        {
          enemyId: e.instanceId,
          enemyName: e.name,
          enemyName_en: (e as any).name_en,
          cardName: card.name,
          cardName_en: card.name_en,
          cardType: card.type,
          card,
          damage: cardResult.damageToPlayer > 0 ? cardResult.damageToPlayer : undefined,
          armor: cardResult.armorGained > 0 ? cardResult.armorGained : undefined,
          heal: (card.effect.heal ?? 0) > 0 ? card.effect.heal : undefined,
          statusType: card.effect.applyStatus?.type,
        },
        stepMessages.join(' '),
        {
          enemyId: e.instanceId,
          attackedPlayer: cardResult.rawAttackDamage > 0 || hasAgileDodge,
          damagedPlayer: cardResult.damageToPlayer > 0,
          shieldedPlayer: cardResult.rawAttackDamage > cardResult.damageToPlayer,
          brokePlayerArmor: remainingPlayerArmor === 0 && cardResult.rawAttackDamage > cardResult.damageToPlayer && cardResult.damageToPlayer > 0,
          affectedSelf: cardResult.armorGained > 0 || (card.effect.heal ?? 0) > 0 || selfStatus,
          actionKey: `${state.turnNumber}:${e.instanceId}:${plays}:${card.id}`,
          hits: 1,
        },
        hasAgileDodge ? [{
          id: `${state.turnNumber}:${e.instanceId}:${plays}:dodge`,
          target: 'player',
          type: 'dodge',
          phase: 'triggered',
        }] : undefined,
      );
    }

    // 整个怪回合结束后，状态效果结算一次（衰减一回合）
    processedEnemies.push({
      ...actingState,
      currentEnergy: actingState.energy,
      statusEffects: resolveEnemyStatusesAfterAction(e.statusEffects, actingState.statusEffects),
    });
  }

  const alive = processedEnemies.filter(e => e.currentHp > 0);
  const newlyDefeatedEnemies = processedEnemies.filter(e => e.currentHp <= 0);
  const finalEnemy = alive[0] ?? newlyDefeatedEnemies[0] ?? state.enemy;
  const finalExtra = alive.slice(1);


  const newState: CombatState = {
    ...state,
    playerHp: remainingPlayerHp,
    playerArmor: remainingPlayerArmor,
    playerEnergy: Math.max(0, state.playerMaxEnergy - playerEnergyBurn),
    radianceStacks: remainingRadianceStacks,
    enemy: finalEnemy,
    extraEnemies: finalExtra,
    defeatedEnemies: Array.from(new Map([...(state.defeatedEnemies ?? []), ...newlyDefeatedEnemies].map(enemy => [enemy.instanceId, enemy])).values()),
    currentEnemyIndex: alive.length > 0 ? (state.currentEnemyIndex + 1) % alive.length : 0,
    // 未使用手牌保留到下一回合，只把已打出的牌留在弃牌堆。
    // 怪注入的卡壳废牌进入玩家弃牌堆，随后续洗牌污染牌库。
    hand: [...state.hand],
    deck: [...state.deck],
    discard: [...state.discard, ...injectedJamCards],
    newlyDrawnIndexes: [],
    turnNumber: state.turnNumber + 1,
    fxEvents: undefined,
    playedCardTypesThisTurn: [],
    playerStatusEffects: remainingPlayerStatuses.filter(status => status.type !== 'combo'),

    handLimit: state.handLimit,
    drawPerTurn: state.drawPerTurn,
    lastEnemyAction: undefined,
    playerAttackHits: undefined,
    ragePoints: liveRagePoints,
    playerRetaliateBonus: 0,
  };

  return {
    state: newState,
    enemyDamage: totalEnemyDamage,
    rawDamage: totalRawDamage,
    statusDamage: totalStatusDamage,
    messages,
    enemySteps,
    freezeSkips,
  };
}

export { createEnemyInstance, generateId };
