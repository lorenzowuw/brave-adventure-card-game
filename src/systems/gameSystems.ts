import cardsData from '../data/cards.json';
import constantsData from '../data/constants.json';
import encountersData from '../data/encounters.json';
import equipmentData from '../data/equipment.json';
import eventsData from '../data/events.json';
import type {
  ActiveEncounter,
  CardDefinition,
  CardInstance,
  ConstantsConfig,
  EncounterDefinition,
  EquippedItem,
  EquipmentItem,
  OldEquipmentSlot as EquipmentSlot,
  EquipmentState,
  EventOption,
  GameMessage,
  GameState,
  ResourceBag,
  ResourceKey,
  SaveData,
  StoryEvent,
} from '../types/game';
import { eventBus } from './EventBus';

export const constants = constantsData as unknown as ConstantsConfig;
export const cardDefinitions = cardsData as CardDefinition[];
export const encounterDefinitions = encountersData as EncounterDefinition[];
export const storyEvents = eventsData as unknown as StoryEvent[];
export const equipmentDefinitions = equipmentData as EquipmentItem[];

const SAVE_KEY = 'card-survival-m01-save';
const RESOURCE_KEYS: ResourceKey[] = [
  'hp',
  'maxHp',
  'stamina',
  'maxStamina',
  'food',
  'wood',
  'metal',
  'pelt',
  'herb',
  'bone',
  'parts',
  'poison',
  'silk',
];

const RESOURCE_CAPS: Partial<Record<ResourceKey, number>> = {
  hp: constants.initialResources.maxHp,
  stamina: constants.initialResources.maxStamina,
  food: 99,
  wood: 99,
  metal: 99,
  pelt: 99,
  herb: 99,
  bone: 99,
  parts: 99,
  poison: 99,
  silk: 99,
};

const nodePlan = [
  ['wolf', 'snake'],
  ['tree', 'herbs'],
  ['event'],
  ['boar', 'goblin'],
  ['tree', 'herbs', 'ore_vein', 'event'],
  ['event'],
  ['reward'],
  ['bear', 'spider'],
  ['event'],
  ['bear'],
];

let instanceCounter = 0;
let messageCounter = 0;

function pickByIndex<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function createMessage(text: string, tone: GameMessage['tone'] = 'info'): GameMessage {
  messageCounter += 1;
  return { id: messageCounter, text, tone };
}

function createCardInstance(card: CardDefinition): CardInstance {
  instanceCounter += 1;
  return { ...card, instanceId: `${card.id}-${instanceCounter}` };
}

function buildStarterDeck(): CardInstance[] {
  return cardDefinitions.filter((card) => card.starter).map(createCardInstance);
}

function buildInitialEquipment(): EquipmentState {
  return equipmentDefinitions.reduce<EquipmentState>(
    (equipment, item) => ({
      ...equipment,
      [item.slot]: { ...item, currentDurability: item.durability },
    }),
    { weapon: null, armor: null, tool: null },
  );
}

function createEncounter(encounterId: string): ActiveEncounter {
  const definition = encounterDefinitions.find((encounter) => encounter.id === encounterId) ?? encounterDefinitions[0];
  return { ...definition, currentHp: definition.hp, maxHp: definition.hp };
}

function getCard(cardId: string): CardDefinition {
  return cardDefinitions.find((card) => card.id === cardId) ?? cardDefinitions[0];
}

function clampResource(key: ResourceKey, value: number, resources: ResourceBag): number {
  if (key === 'maxHp' || key === 'maxStamina') {
    return Math.max(1, value);
  }

  const cap = key === 'hp' ? resources.maxHp : key === 'stamina' ? resources.maxStamina : RESOURCE_CAPS[key];
  return Math.max(0, Math.min(cap ?? 99, value));
}

export function createInitialState(): GameState {
  const firstEncounter = createEncounter('wolf');

  return {
    scene: 'board',
    resources: { ...constants.initialResources },
    equipment: buildInitialEquipment(),
    deck: buildStarterDeck(),
    hand: [],
    discard: [],
    exhausted: [],
    currentEncounter: firstEncounter,
    pendingEvent: null,
    rewardChoices: [],
    phase: 'draw',
    actionsLeft: constants.actionsPerTurn,
    progress: 1,
    runNumber: 1,
    nextNodePreview: null,
    message: createMessage('拖拽手牌到中央目标区，或点击卡牌后点“使用选中卡”。'),
  };
}

export function validateGameData(): string[] {
  const errors: string[] = [];
  const cardIds = new Set(cardDefinitions.map((card) => card.id));

  if (cardDefinitions.filter((card) => card.starter).length === 0) {
    errors.push('初始牌组为空。');
  }

  storyEvents.forEach((event) => {
    event.options.forEach((option) => {
      option.cardRewards?.forEach((cardId) => {
        if (!cardIds.has(cardId)) {
          errors.push(`事件 ${event.id} 引用了不存在的卡牌 ${cardId}。`);
        }
      });
    });
  });

  return errors;
}

export function drawCards(state: GameState, count = constants.drawCount): GameState {
  const availableSlots = Math.max(0, constants.maxHandSize - state.hand.length);
  const drawCount = Math.min(count, availableSlots);

  if (drawCount === 0) {
    return { ...state, phase: 'action', actionsLeft: constants.actionsPerTurn };
  }

  const drawStep = Array.from({ length: drawCount }).reduce<{
    deck: CardInstance[];
    discard: CardInstance[];
    hand: CardInstance[];
  }>(
    (acc) => {
      const sourceDeck = acc.deck.length > 0 ? acc.deck : acc.discard;
      const sourceDiscard = acc.deck.length > 0 ? acc.discard : [];
      const drawnCard = sourceDeck[0];

      if (!drawnCard) {
        return acc;
      }

      return {
        deck: sourceDeck.slice(1),
        discard: sourceDiscard,
        hand: [...acc.hand, drawnCard],
      };
    },
    { deck: state.deck, discard: state.discard, hand: state.hand },
  );

  eventBus.emit('turn:draw', { count: drawStep.hand.length - state.hand.length });
  return {
    ...state,
    deck: drawStep.deck,
    discard: drawStep.discard,
    hand: drawStep.hand,
    phase: 'action',
    actionsLeft: constants.actionsPerTurn,
  };
}

function applyResourceChanges(state: GameState, changes: Partial<Record<ResourceKey, number>>): GameState {
  const nextResources = RESOURCE_KEYS.reduce<ResourceBag>((resources, key) => {
    const delta = changes[key] ?? 0;
    const before = resources[key];
    const after = clampResource(key, before + delta, resources);

    if (delta !== 0 && before !== after) {
      eventBus.emit('resource:change', { key, before, after });
    }

    return { ...resources, [key]: after };
  }, state.resources);

  return { ...state, resources: nextResources };
}

function hasRequiredResources(resources: ResourceBag, requires: EventOption['requires']): boolean {
  if (!requires) {
    return true;
  }

  return Object.entries(requires).every(([key, amount]) => resources[key as ResourceKey] >= (amount ?? 0));
}

function getEquipmentBonus(equipment: EquipmentState, bonusType: 'attack' | 'gather' | 'defense'): number {
  return Object.values(equipment).reduce((total, item) => {
    if (!item || item.currentDurability <= 0 || item.bonusType !== bonusType) {
      return total;
    }

    return total + item.bonus;
  }, 0);
}

function degradeEquipment(equipment: EquipmentState, slot: EquipmentSlot): EquipmentState {
  const item = equipment[slot];

  if (!item || item.currentDurability <= 0) {
    return equipment;
  }

  return {
    ...equipment,
    [slot]: { ...item, currentDurability: Math.max(0, item.currentDurability - 1) },
  };
}

function resolveNextNode(state: GameState): GameState {
  if (state.resources.hp <= 0) {
    eventBus.emit('run:end', { reason: 'defeat' });
    eventBus.emit('run:enter_camp', { reason: 'defeat' });
    return {
      ...state,
      scene: 'camp',
      currentEncounter: null,
      pendingEvent: null,
      rewardChoices: [],
      phase: 'end',
      message: createMessage('你倒在森林边境，被同伴拖回营地。', 'danger'),
    };
  }

  if (state.progress >= constants.maxProgress) {
    eventBus.emit('run:end', { reason: 'victory' });
    eventBus.emit('run:enter_camp', { reason: 'victory' });
    return {
      ...state,
      scene: 'camp',
      currentEncounter: null,
      pendingEvent: null,
      rewardChoices: [],
      phase: 'end',
      message: createMessage('你完成了森林边境的 10 个节点，带着战利品返回营地。', 'success'),
    };
  }

  const nextProgress = state.progress + 1;
  const options = nodePlan[nextProgress - 1] ?? ['wolf'];
  const selected = pickByIndex(options, state.runNumber + nextProgress + state.discard.length + state.exhausted.length);

  eventBus.emit('turn:advance', { progress: nextProgress });

  if (selected === 'event') {
    const event = pickByIndex(storyEvents, state.runNumber + nextProgress + state.resources.wood + state.resources.food);
    eventBus.emit('event:show', { event });
    return {
      ...state,
      progress: nextProgress,
      currentEncounter: null,
      pendingEvent: event,
      phase: 'action',
      actionsLeft: 0,
      message: createMessage(`事件：${event.title}`),
    };
  }

  if (selected === 'reward') {
    const choices = cardDefinitions.filter((card) => !card.starter).slice(0, 3);
    eventBus.emit('reward:show', { choices });
    return {
      ...state,
      progress: nextProgress,
      currentEncounter: null,
      rewardChoices: choices,
      phase: 'action',
      actionsLeft: 0,
      message: createMessage('奖励节点：选择一张卡加入牌库。', 'success'),
    };
  }

  return drawCards({
    ...state,
    progress: nextProgress,
    currentEncounter: createEncounter(selected),
    pendingEvent: null,
    rewardChoices: [],
    phase: 'draw',
    message: createMessage(`进入节点 ${nextProgress}/10。`),
  });
}

export function startRun(state: GameState): GameState {
  const freshState = {
    ...createInitialState(),
    runNumber: state.runNumber + 1,
    resources: {
      ...constants.initialResources,
      food: state.resources.food,
      wood: state.resources.wood,
      metal: state.resources.metal,
      pelt: state.resources.pelt,
      herb: state.resources.herb,
      bone: state.resources.bone,
      parts: state.resources.parts,
      poison: state.resources.poison,
      silk: state.resources.silk,
    },
  };

  eventBus.emit('run:start', { runNumber: freshState.runNumber });
  return drawCards(freshState);
}

export function playCard(state: GameState, cardInstanceId: string): GameState {
  if (state.scene !== 'board' || state.actionsLeft <= 0) {
    return { ...state, message: createMessage('现在不能出牌。', 'danger') };
  }

  const card = state.hand.find((item) => item.instanceId === cardInstanceId);
  if (!card) {
    return { ...state, message: createMessage('这张卡已经不在手牌中。', 'danger') };
  }

  eventBus.emit('card:play', { card, targetId: state.currentEncounter?.id ?? 'self' });

  const remainingHand = state.hand.filter((item) => item.instanceId !== cardInstanceId);
  const stateAfterCardMove = {
    ...state,
    hand: remainingHand,
    exhausted: [...state.exhausted, card],
    actionsLeft: state.actionsLeft - 1,
  };

  if (card.effect === 'healHp') {
    const healed = applyResourceChanges(stateAfterCardMove, { hp: card.value });
    return {
      ...healed,
      message: createMessage(`${card.name} 恢复了 ${card.value} 点 HP。`, 'success'),
    };
  }

  if (card.effect === 'healStamina') {
    const rested = applyResourceChanges(stateAfterCardMove, { stamina: card.value });
    return {
      ...rested,
      message: createMessage(`${card.name} 恢复了 ${card.value} 点体力。`, 'success'),
    };
  }

  if (card.effect === 'scout') {
    const preview = nodePlan[state.progress]?.join(' / ') ?? '营地';
    const scouted = applyResourceChanges(stateAfterCardMove, { stamina: 1 });
    return {
      ...scouted,
      nextNodePreview: preview,
      message: createMessage(`侦察结果：下一节点可能是 ${preview}。`, 'success'),
    };
  }

  if (card.effect === 'skipCombat' && state.currentEncounter?.type === 'combat') {
    eventBus.emit('encounter:resolve', { encounterId: state.currentEncounter.id });
    return resolveNextNode({
      ...stateAfterCardMove,
      currentEncounter: null,
      message: createMessage(`${card.name} 让你避开了战斗。`, 'success'),
    });
  }

  if (!state.currentEncounter) {
    return {
      ...stateAfterCardMove,
      message: createMessage('当前没有可处理的遭遇目标。', 'danger'),
    };
  }

  const isMatched = card.tags.some((tag) => state.currentEncounter?.weaknessTags.includes(tag));
  const baseValue = card.effect === 'attack' || card.effect === 'gather' || card.effect === 'special' ? card.value : 0;
  const equipmentBonus = card.effect === 'attack' ? getEquipmentBonus(state.equipment, 'attack') : card.effect === 'gather' ? getEquipmentBonus(state.equipment, 'gather') : 0;
  const impact = Math.max(0, baseValue + equipmentBonus + (isMatched ? 2 : -1));

  if (impact <= 0) {
    const damage = Math.max(1, state.currentEncounter.attack);
    const damaged = applyResourceChanges(stateAfterCardMove, { hp: -damage });
    eventBus.emit('encounter:fail', { encounterId: state.currentEncounter.id, damage });
    return {
      ...damaged,
      equipment: degradeEquipment(damaged.equipment, card.type === 'tool' ? 'tool' : 'weapon'),
      message: createMessage(`标签不匹配，${state.currentEncounter.name} 反击造成 ${damage} 点伤害。`, 'danger'),
    };
  }

  const nextEncounter = {
    ...state.currentEncounter,
    currentHp: Math.max(0, state.currentEncounter.currentHp - impact),
  };
  const usedEquipmentSlot: EquipmentSlot = card.effect === 'gather' ? 'tool' : 'weapon';
  const equipment = card.effect === 'attack' || card.effect === 'gather' ? degradeEquipment(state.equipment, usedEquipmentSlot) : state.equipment;

  if (nextEncounter.currentHp > 0) {
    const defense = getEquipmentBonus(equipment, 'defense');
    const damage = state.currentEncounter.type === 'combat' ? Math.max(0, state.currentEncounter.attack - defense) : 0;
    const damaged = applyResourceChanges({ ...stateAfterCardMove, equipment }, { hp: -damage });
    return {
      ...damaged,
      currentEncounter: nextEncounter,
      message: createMessage(`${card.name} 生效，造成 ${impact} 点进度。目标剩余 ${nextEncounter.currentHp}/${nextEncounter.maxHp}。`),
    };
  }

  const rewarded = applyResourceChanges({ ...stateAfterCardMove, equipment }, state.currentEncounter.rewards);
  eventBus.emit('encounter:resolve', { encounterId: state.currentEncounter.id });
  return resolveNextNode({
    ...rewarded,
    currentEncounter: null,
    message: createMessage(`${state.currentEncounter.name} 已结算，获得资源奖励。`, 'success'),
  });
}

export function endTurn(state: GameState): GameState {
  if (state.scene !== 'board') {
    return state;
  }

  eventBus.emit('turn:end', { progress: state.progress });

  if (!state.currentEncounter) {
    return resolveNextNode({
      ...state,
      discard: [...state.discard, ...state.hand],
      hand: [],
      phase: 'end',
    });
  }

  const defense = getEquipmentBonus(state.equipment, 'defense');
  const damage = state.currentEncounter.type === 'combat' ? Math.max(0, state.currentEncounter.attack - defense) : 0;
  const staminaLoss = state.currentEncounter.type === 'gather' ? 1 : 0;
  const punished = applyResourceChanges(state, { hp: -damage, stamina: -staminaLoss });

  return drawCards({
    ...punished,
    discard: [...punished.discard, ...punished.hand],
    hand: [],
    phase: 'draw',
    message: createMessage(
      damage > 0 ? `回合结束，${state.currentEncounter.name} 造成 ${damage} 点伤害。` : '回合结束，你重新整理手牌。',
      damage > 0 ? 'danger' : 'info',
    ),
  });
}

export function chooseEventOption(state: GameState, optionId: string): GameState {
  if (!state.pendingEvent) {
    return state;
  }

  const option = state.pendingEvent.options.find((item) => item.id === optionId);
  if (!option) {
    return { ...state, message: createMessage('事件选项不存在。', 'danger') };
  }

  if (!hasRequiredResources(state.resources, option.requires)) {
    return { ...state, message: createMessage('资源不足，无法选择该选项。', 'danger') };
  }

  eventBus.emit('event:choose', { eventId: state.pendingEvent.id, optionId });
  const changed = applyResourceChanges(state, option.resourceChanges);
  const choices = option.cardRewards?.map(getCard) ?? [];

  if (choices.length > 0) {
    eventBus.emit('reward:show', { choices });
    return {
      ...changed,
      pendingEvent: null,
      rewardChoices: choices,
      message: createMessage(option.message, 'success'),
    };
  }

  return resolveNextNode({
    ...changed,
    pendingEvent: null,
    message: createMessage(option.message, 'success'),
  });
}

export function chooseReward(state: GameState, cardId: string): GameState {
  const card = state.rewardChoices.find((choice) => choice.id === cardId);

  if (!card) {
    return { ...state, message: createMessage('奖励卡不存在。', 'danger') };
  }

  eventBus.emit('reward:choose', { cardId });
  eventBus.emit('card:obtain', { card });
  const gainedCard = createCardInstance(card);

  return resolveNextNode({
    ...state,
    deck: [...state.deck, gainedCard],
    rewardChoices: [],
    message: createMessage(`${card.name} 已加入牌库。`, 'success'),
  });
}

export function campHeal(state: GameState): GameState {
  if (state.resources.food < constants.camp.healFoodCost) {
    return { ...state, message: createMessage('食物不足，无法治疗。', 'danger') };
  }

  eventBus.emit('camp:heal', { amount: constants.camp.healAmount });
  const healed = applyResourceChanges(state, {
    food: -constants.camp.healFoodCost,
    hp: constants.camp.healAmount,
  });

  return { ...healed, message: createMessage('营地治疗完成。', 'success') };
}

export function campRepair(state: GameState): GameState {
  if (state.resources.wood < constants.camp.repairWoodCost) {
    return { ...state, message: createMessage('木材不足，无法修复装备。', 'danger') };
  }

  eventBus.emit('camp:repair', { amount: constants.camp.repairAmount });
  const repairedEquipment = Object.entries(state.equipment).reduce<EquipmentState>((equipment, [slot, item]) => {
    if (!item) {
      return equipment;
    }

    return {
      ...equipment,
      [slot]: {
        ...item,
        currentDurability: Math.min(item.durability, item.currentDurability + constants.camp.repairAmount),
      } as EquippedItem,
    };
  }, state.equipment);

  const repaired = applyResourceChanges({ ...state, equipment: repairedEquipment }, { wood: -constants.camp.repairWoodCost });
  return { ...repaired, message: createMessage('装备已经修复。', 'success') };
}

export function saveGame(state: GameState): GameState {
  const saveData: SaveData = { version: 1, savedAt: new Date().toISOString(), state };
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  eventBus.emit('save:write', { state });
  return { ...state, message: createMessage('已写入本地存档。', 'success') };
}

export function loadGame(fallback: GameState): GameState {
  const rawSave = window.localStorage.getItem(SAVE_KEY);

  if (!rawSave) {
    return { ...fallback, message: createMessage('没有找到本地存档。', 'danger') };
  }

  try {
    const parsed = JSON.parse(rawSave) as SaveData;
    if (parsed.version !== 1) {
      return { ...fallback, message: createMessage('存档版本不兼容。', 'danger') };
    }

    eventBus.emit('save:load', { state: parsed.state });
    return { ...parsed.state, message: createMessage('已读取本地存档。', 'success') };
  } catch {
    return { ...fallback, message: createMessage('存档损坏，无法读取。', 'danger') };
  }
}
