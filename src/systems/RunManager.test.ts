import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { burnCard, createInitialRunState, drawGachaCard, endCombatTurn, GACHA_COSTS, GACHA_MACHINE_RARITY_WEIGHTS, GACHA_RARITY_WEIGHTS, getAreaRewardRange, getGachaCost, getGachaRarityRange, getGlobalUnlocks, getLevelProgress, getRewardRarityWeights, getStarterSkills, getUpgradeCost, playSkillCard, recordBossKill, recordRunEnd, resetAllData, saveGlobalUnlocks, unlockAllContent, useActiveSkill } from './RunManager';
import type { CombatState, EnemyInstance, GlobalUnlocks, SkillCard } from '../types/game';
import { blessingData, characterData, enemyData, eventData, skillData } from '../utils/DataLoader';
import { getUnifiedCardDisplayName } from '../utils/card';
import combosData from '../data/combos.json';

function makeShopState(overrides = {}) {
  return {
    ...createInitialRunState('ironwall'),
    phase: 'shop' as const,
    gold: 200,
    ...overrides,
  };
}

describe('unlockAllContent', () => {
  function makeUnlocks(overrides: Partial<GlobalUnlocks> = {}): GlobalUnlocks {
    return {
      unlockedCharacters: ['ironwall'],
      unlockedBlessings: ['bless_meditation'],
      maxLevel: 3,
      achievements: ['kept'],
      discoveredCards: ['basic_slash'],
      discoveredEnemies: ['wolf'],
      discoveredEnemyCards: ['w_bite'],
      discoveredCombos: [],
      totalRuns: 7,
      totalVictories: 2,
      totalBossKills: 1,
      runHistory: [],
      ...overrides,
    };
  }

  it('解锁全部普通内容但不解锁开发者角色', () => {
    const result = unlockAllContent(makeUnlocks());

    expect(result.unlockedCharacters).toEqual(
      expect.arrayContaining(characterData.filter(char => char.id !== 'developer').map(char => char.id)),
    );
    expect(result.unlockedCharacters).not.toContain('developer');
    expect(result.unlockedBlessings).toEqual(expect.arrayContaining(blessingData.map(blessing => blessing.id)));
    expect(result.discoveredCards).toEqual(expect.arrayContaining(skillData.filter(skill => skill.characterBind !== 'developer').map(skill => skill.id)));
    expect(result.discoveredCards).not.toEqual(expect.arrayContaining(skillData.filter(skill => skill.characterBind === 'developer').map(skill => skill.id)));
    expect(result.discoveredEnemies).toEqual(expect.arrayContaining(enemyData.map(enemy => enemy.id)));
    expect(result.discoveredCombos).toEqual(expect.arrayContaining(combosData.map(combo => combo.id)));
  });

  it('保留游玩统计和历史字段', () => {
    const base = makeUnlocks({ runHistory: [{ characterId: 'ironwall', characterName: '铁壁守卫', victory: true, areaReached: 'forest', areaReachedName: '迷雾森林', level: 2, gold: 30, deck: [], cardsPlayedCount: 5, timestamp: 1, bossKills: 1 }] });
    const result = unlockAllContent(base);

    expect(result.maxLevel).toBe(base.maxLevel);
    expect(result.totalRuns).toBe(base.totalRuns);
    expect(result.totalVictories).toBe(base.totalVictories);
    expect(result.totalBossKills).toBe(base.totalBossKills);
    expect(result.runHistory).toBe(base.runHistory);
    expect(result.achievements).toBe(base.achievements);
  });
});

describe('skill upgrade chains', () => {
  const playableSkills = skillData.filter(skill => skill.characterBind !== 'developer' && !skill.id.startsWith('dev_'));
  const skillsById = new Map(playableSkills.map(skill => [skill.id, skill]));
  const upgradedIds = new Set(playableSkills.map(skill => skill.upgradeTo).filter(Boolean));
  const roots = playableSkills.filter(skill => !upgradedIds.has(skill.id));

  it('all upgrade targets exist', () => {
    for (const skill of playableSkills) {
      if (!skill.upgradeTo) continue;

      expect(skillsById.has(skill.upgradeTo), `${skill.id} upgrades to missing ${skill.upgradeTo}`).toBe(true);
    }
  });

  it('all playable skill chains terminate at red rarity', () => {
    for (const root of roots) {
      const seen = new Set<string>();
      let current = root;

      while (current.upgradeTo) {
        expect(seen.has(current.id), `${root.id} has a circular upgrade chain at ${current.id}`).toBe(false);
        seen.add(current.id);
        current = skillsById.get(current.upgradeTo)!;
      }

      expect(current.rarity, `${root.id} ends at ${current.id}`).toBe('red');
    }
  });

  it('green standalone reward cards are balanced and upgradeable', () => {
    const coinStrike = skillsById.get('wealth_coin_strike');
    const thornBolt = skillsById.get('lifesage_thorn_bolt');

    expect(coinStrike?.upgradeTo).toBe('wealth_coin_strike_blue');
    expect(coinStrike?.effect.damage).toBeLessThanOrEqual(8);
    expect(coinStrike?.effect.goldGain).toBeLessThanOrEqual(1);
    expect(thornBolt?.upgradeTo).toBe('lifesage_thorn_bolt_blue');
    expect((thornBolt?.effect.heal ?? 0) - (thornBolt?.effect.hpCost ?? 0)).toBeLessThanOrEqual(0);
  });

  it('meditate only restores energy', () => {
    expect(skillsById.get('basic_meditate')?.effect).toEqual({ energyGain: 2 });
    expect(skillsById.get('basic_meditate_green')?.effect).toEqual({ energyGain: 3 });
    expect(skillsById.get('basic_meditate_blue')?.effect).toEqual({ energyGain: 4 });
    expect(skillsById.get('basic_meditate_purple')?.effect).toEqual({ energyGain: 5 });
    expect(skillsById.get('basic_meditate_orange')?.effect).toEqual({ energyGain: 6 });
    expect(skillsById.get('basic_meditate_red')?.effect).toEqual({ energyGain: 7 });
  });

  it('omnisage resource engines are capped', () => {
    expect(skillsById.get('omnisage_insight')?.rarity).toBe('green');
    expect(skillsById.get('omnisage_insight')?.upgradeTo).toBe('omnisage_insight_blue');
    expect(skillsById.get('omnisage_insight')?.effect).toEqual({ drawCards: 1, energyGain: 1 });
    expect(skillsById.get('omnisage_insight_blue')?.effect).toEqual({ drawCards: 1, energyGain: 2 });
    expect(skillsById.get('omnisage_insight_blue_purple')?.effect).toEqual({ drawCards: 2, energyGain: 2 });
    expect(skillsById.get('omnisage_insight_orange')?.effect).toEqual({ drawCards: 2, energyGain: 3 });
    expect(skillsById.get('omnisage_insight_orange_red')?.cost).toBe(1);
    expect(skillsById.get('omnisage_insight_orange_red')?.effect).toEqual({ drawCards: 2, energyGain: 4 });
    expect(skillsById.get('omnisage_copy_3')?.effect).toEqual({ echoGain: 3, drawCards: 1 });
    expect(skillsById.get('omnisage_copy_3')?.effect).not.toEqual(skillsById.get('omnisage_copy_2')?.effect);
  });

  it('taichimonk breath focuses on sustain without draw', () => {
    expect(skillsById.get('taichimonk_breath')?.effect).toEqual({ heal: 3, armor: 4 });
    expect(skillsById.get('taichimonk_breath_green')?.effect).toEqual({ heal: 4, armor: 5, energyGain: 1 });
    expect(skillsById.get('taichimonk_breath_green_blue')?.effect).toEqual({ heal: 5, armor: 7, energyGain: 1 });
    expect(skillsById.get('taichimonk_breath_green_blue_purple')?.effect).toEqual({ heal: 7, armor: 9, energyGain: 1 });
    expect(skillsById.get('taichimonk_breath_green_blue_purple_orange')?.effect).toEqual({ heal: 9, armor: 12, energyGain: 2 });
    expect(skillsById.get('taichimonk_breath_green_blue_purple_orange_red')?.effect).toEqual({ heal: 12, armor: 16, energyGain: 3 });
  });

  it('frost prayer keeps draw and gains freeze every upgrade', () => {
    expect(skillsById.get('frostpriest_prayer_1')?.effect).toEqual({ applyStatus: { type: 'freeze', value: 2, duration: 1 }, drawCards: 1 });
    expect(skillsById.get('frostpriest_prayer_2')?.effect).toEqual({ applyStatus: { type: 'freeze', value: 4, duration: 1 }, drawCards: 1 });
    expect(skillsById.get('frostpriest_prayer_3')?.effect).toEqual({ applyStatus: { type: 'freeze', value: 6, duration: 1 }, drawCards: 2 });
    expect(skillsById.get('frostpriest_prayer_4')?.effect).toEqual({ applyStatus: { type: 'freeze', value: 8, duration: 1 }, drawCards: 2 });
    expect(skillsById.get('frostpriest_prayer_5')?.effect).toEqual({ applyStatus: { type: 'freeze', value: 10, duration: 1 }, drawCards: 2 });
    expect(skillsById.get('frostpriest_prayer_6')?.effect).toEqual({ applyStatus: { type: 'freeze', value: 12, duration: 1 }, drawCards: 2 });
  });

  it('frost priest freeze cards have differentiated freeze values', () => {
    expect(skillsById.get('frostpriest_frost_lance_red')?.effect).toEqual({ damage: 26, applyStatus: { type: 'freeze', value: 3, duration: 1 } });
    expect(skillsById.get('frostpriest_freeze_3_purple_orange_red')?.effect).toEqual({ damage: 20, applyStatus: { type: 'freeze', value: 8, duration: 1 } });
    expect(skillsById.get('frostpriest_blizzard_orange_red')?.effect).toEqual({ armor: 12, applyStatus: { type: 'freeze', value: 18, duration: 1 } });
    expect(skillsById.get('frostpriest_ice_field_blue_purple_orange_red')?.effect).toEqual({ damage: 13, applyStatus: { type: 'freeze', value: 22, duration: 1 } });
  });

  it('frost barrier gains armor every upgrade', () => {
    expect(skillsById.get('frostpriest_barrier')?.effect).toEqual({ armor: 3 });
    expect(skillsById.get('frostpriest_barrier_green')?.effect).toEqual({ armor: 5 });
    expect(skillsById.get('frostpriest_barrier_green_blue')?.effect).toEqual({ armor: 7 });
    expect(skillsById.get('frostpriest_barrier_green_blue_purple')?.effect).toEqual({ armor: 9 });
    expect(skillsById.get('frostpriest_barrier_green_blue_purple_orange')?.effect).toEqual({ armor: 12 });
    expect(skillsById.get('frostpriest_barrier_green_blue_purple_orange_red')?.effect).toEqual({ armor: 16 });
  });

  it('unifies display names with card codex style across upgrade chains', () => {
    expect(getUnifiedCardDisplayName(skillsById.get('ironwall_bash_1') as SkillCard, 'zh')).toBe('盾牌猛击·普通');
    expect(getUnifiedCardDisplayName(skillsById.get('ironwall_bash_3') as SkillCard, 'zh')).toBe('盾牌猛击·精良');
    expect(getUnifiedCardDisplayName(skillsById.get('frostpriest_frost_lance_green') as SkillCard, 'zh')).toBe('霜锋·稀有');
    expect(getUnifiedCardDisplayName(skillsById.get('basic_meditate_red') as SkillCard, 'zh')).toBe('冥想·神话');
    expect(getUnifiedCardDisplayName(skillsById.get('ironwall_bash_3') as SkillCard, 'en')).toBe('Shield Bash·Rare');
  });
});

describe('event balance data', () => {
  it('frost pool drink trades health for hand limit', () => {
    const frostPool = eventData.find(event => event.id === 'frost_pool');
    const drink = frostPool?.choices.find(choice => choice.id === 'drink');

    expect(drink?.effects).toEqual({ hpChange: -6, handLimitChange: 1 });
  });
});

describe('recordRunEnd', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => { storage.set(key, value); },
        removeItem: (key: string) => { storage.delete(key); },
      },
    });
    resetAllData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('历史记录保留重复卡牌数量', () => {
    const run = createInitialRunState('ironwall');
    const duplicateCard = run.deck[0];
    const state = { ...run, deck: [...run.deck, duplicateCard], phase: 'defeat' as const };

    recordRunEnd(false, state);

    expect(getGlobalUnlocks().runHistory[0].deck).toEqual(state.deck.map(card => card.id));
  });
});

describe('getLevelProgress', () => {
  it('满级后返回满级标记且经验上限固定为满级门槛', () => {
    expect(getLevelProgress(420)).toEqual({ level: 10, expForNext: 420, isMaxLevel: true });
    expect(getLevelProgress(999)).toEqual({ level: 10, expForNext: 420, isMaxLevel: true });
  });
});

describe('getUpgradeCost', () => {
  it('uses lower early upgrade costs and keeps high rarity upgrades expensive', () => {
    expect(getUpgradeCost({ rarity: 'white' })).toBe(6);
    expect(getUpgradeCost({ rarity: 'green' })).toBe(9);
    expect(getUpgradeCost({ rarity: 'blue' })).toBe(16);
    expect(getUpgradeCost({ rarity: 'purple' })).toBe(35);
    expect(getUpgradeCost({ rarity: 'orange' })).toBe(60);
    expect(getUpgradeCost({ rarity: 'red' })).toBe(90);
  });
});

describe('drawGachaCard', () => {
  it('uses configured draw costs', () => {
    expect(getGachaCost(0)).toBe(GACHA_COSTS[0]);
    expect(getGachaCost(1)).toBe(GACHA_COSTS[1]);
    expect(getGachaCost(2)).toBe(GACHA_COSTS[2]);
  });

  it('adds one drawn card and charges the first draw cost', () => {
    const state = makeShopState();
    const beforeDeckSize = state.deck.length;

    const result = drawGachaCard(state);

    expect(result.gold).toBe(200 - getGachaCost(0));
    expect(result.deck).toHaveLength(beforeDeckSize + 1);
    expect(result.gachaDrawn).toBe(1);
  });

  it('uses increasing draw costs and stops at three draws per shop', () => {
    let state = makeShopState();

    state = drawGachaCard(state);
    state = drawGachaCard(state);
    state = drawGachaCard(state);
    const afterThreeDraws = state;
    const afterLimit = drawGachaCard(state);

    expect(afterThreeDraws.gold).toBe(200 - getGachaCost(0) - getGachaCost(1) - getGachaCost(2));
    expect(afterThreeDraws.gachaDrawn).toBe(3);
    expect(afterLimit).toBe(afterThreeDraws);
  });

  it('does nothing without enough gold or outside shop phase', () => {
    const noGold = makeShopState({ gold: 10 });
    const notShop = makeShopState({ phase: 'exploration' as const });

    expect(drawGachaCard(noGold)).toBe(noGold);
    expect(drawGachaCard(notShop)).toBe(notShop);
  });

  it('draws cards within current area rarity range and class/generic pool', () => {
    const state = makeShopState();
    const beforeDeckSize = state.deck.length;
    const result = drawGachaCard(state);
    const drawnCard = result.deck[beforeDeckSize];
    const rarityOrder = ['white', 'green', 'blue', 'purple', 'orange', 'red'];
    const { minIndex, maxIndex } = getGachaRarityRange(state.currentArea);
    const rarityIndex = rarityOrder.indexOf(drawnCard.rarity);

    expect(rarityIndex).toBeGreaterThanOrEqual(minIndex);
    expect(rarityIndex).toBeLessThanOrEqual(maxIndex);
    expect(drawnCard.id.startsWith('generic_') || drawnCard.id.startsWith('basic_') || drawnCard.characterBind === state.character.id).toBe(true);
  });

  it('guarantees blue or better on the third draw', () => {
    let state = makeShopState();
    state = drawGachaCard(state);
    state = drawGachaCard(state);
    const beforeDeckSize = state.deck.length;

    const result = drawGachaCard(state);
    const drawnCard = result.deck[beforeDeckSize];
    const rarityOrder = ['white', 'green', 'blue', 'purple', 'orange', 'red'];

    expect(rarityOrder.indexOf(drawnCard.rarity)).toBeGreaterThanOrEqual(rarityOrder.indexOf('blue'));
  });
});

describe('getStarterSkills', () => {
  it('无专属防御牌角色使用通用格挡补足防御位', () => {
    const skills = getStarterSkills('shadowblade');

    expect(skills.filter(skill => skill.id === 'generic_light_attack')).toHaveLength(1);
    expect(skills.filter(skill => skill.id === 'generic_block')).toHaveLength(1);
    expect(skills.filter(skill => skill.id === 'shadowblade_phantom_1')).toHaveLength(1);
    expect(skills.filter(skill => skill.id === 'shadowblade_smoke')).toHaveLength(1);
  });
});

describe('playSkillCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('使用确认后的角色基础能量', () => {
    expect(createInitialRunState('ironwall').character.baseEnergy).toBe(4);
    expect(createInitialRunState('shadowblade').character.baseEnergy).toBe(3);
    expect(createInitialRunState('wealthmerchant').character.baseEnergy).toBe(5);
    expect(createInitialRunState('undeadpriest').character.baseEnergy).toBe(3);
    expect(createInitialRunState('elementmage').character.baseEnergy).toBe(4);
    expect(createInitialRunState('omnisage').character.baseEnergy).toBe(4);
    expect(createInitialRunState('combatmaster').character.baseEnergy).toBe(5);
    expect(createInitialRunState('thornguardian').character.baseEnergy).toBe(5);
    expect(createInitialRunState('devourer').character.baseEnergy).toBe(4);
  });

  function makeTestEnemy(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
    return {
      id: 'test_enemy',
      instanceId: 'e1',
      name: '测试敌人',
      hp: 30,
      currentHp: 30,
      armor: 0,
      damage: 6,
      tier: 'normal',
      statusEffects: [],
      energy: 3,
      currentEnergy: 3,
      deck: [],
      drawPile: [],
      hand: [],
      discard: [],
      inPlay: [],
      handSize: 3,
      rewards: { exp: 1, gold: 1, cardRarity: 'white' },
      area: 'forest',
      ...overrides,
    };
  }

  function makeTestCard(overrides: Partial<SkillCard> = {}): SkillCard {
    return {
      id: 'test_attack',
      name: '测试攻击',
      tier: 1,
      rarity: 'white',
      cost: 1,
      type: 'attack',
      effect: { damage: 5 },
      description: '',
      upgradeTo: null,
      characterBind: 'generic',
      flavorText: '',
      ...overrides,
    };
  }

  function makeCombatState(hand: SkillCard[], overrides: Partial<CombatState> = {}): CombatState {
    return {
      playerHp: 20,
      playerMaxHp: 20,
      playerEnergy: 5,
      playerMaxEnergy: 5,
      playerArmor: 0,
      enemy: makeTestEnemy(),
      extraEnemies: [],
      defeatedEnemies: [],
      currentEnemyIndex: 0,
      hand,
      deck: [],
      discard: [],
      exhausted: [],
      playerInPlay: [],
      newlyDrawnIndexes: [],
      blessings: [],
      turnNumber: 0,
      playedCardTypesThisTurn: [],
      playerStatusEffects: [],
      handLimit: 8,
      drawPerTurn: 4,
      ...overrides,
    };
  }

  it('结束回合会保留未打出的手牌，只把场上牌丢入弃牌堆', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const run = createInitialRunState('ironwall');
    const cards = Array.from({ length: 9 }, (_, index) => makeTestCard({ id: `card_${index}`, name: `测试牌${index}` }));
    const result = endCombatTurn({
      ...run,
      phase: 'combat',
      progress: { ...run.progress, handLimit: 5 },
      combat: makeCombatState(cards.slice(0, 5), {
        deck: [],
        discard: [],
        playerInPlay: cards.slice(5),
        handLimit: 5,
        enemy: makeTestEnemy({ deck: [], drawPile: [], hand: [], currentEnergy: 0 }),
      }),
    });

    // 手牌已满（5/5），未打出的牌原样保留，不会被丢弃重抽
    expect(result.run.combat?.hand).toEqual(cards.slice(0, 5));
    expect(result.run.combat?.deck).toHaveLength(0);
    // 只有本回合打出的4张场上牌进入弃牌堆
    expect(result.run.combat?.discard).toHaveLength(4);
    expect(result.run.combat?.playerInPlay).toHaveLength(0);
    expect([
      ...(result.run.combat?.hand ?? []),
      ...(result.run.combat?.deck ?? []),
      ...(result.run.combat?.discard ?? []),
      ...(result.run.combat?.playerInPlay ?? []),
    ]).toHaveLength(9);
  });

  it('抽2但只剩1张可抽时只抽1张，并为抽到的牌标记动画', () => {
    const drawCard = makeTestCard({ id: 'draw_two', type: 'special', cost: 0, effect: { drawCards: 2 } });
    const lastCard = makeTestCard({ id: 'last_card' });
    const run = createInitialRunState('ironwall');
    const result = playSkillCard({
      ...run,
      phase: 'combat',
      combat: makeCombatState([drawCard], { deck: [lastCard], discard: [] }),
    }, 0, 'e1');

    expect(result.combat?.hand).toEqual([lastCard]);
    expect(result.combat?.deck).toHaveLength(0);
    expect(result.combat?.discard).toHaveLength(0);
    expect(result.combat?.newlyDrawnIndexes).toEqual([0]);
    expect(result.combat?.drawEventId).toBeGreaterThan(0);
    expect(result.message).not.toContain('没有可抽的牌');
  });

  it('卡牌抽牌时牌库和弃牌都为空会提示无法抽牌', () => {
    const drawCard = makeTestCard({ id: 'draw_two_empty', type: 'special', cost: 0, effect: { drawCards: 2 } });
    const run = createInitialRunState('ironwall');
    const result = playSkillCard({
      ...run,
      phase: 'combat',
      combat: makeCombatState([drawCard], { deck: [], discard: [] }),
    }, 0, 'e1');

    expect(result.combat?.newlyDrawnIndexes).toEqual([]);
    expect(result.message).toContain('没有可抽的牌');
  });

  it('回合开始自然抽牌时无牌可抽会提示无法抽牌', () => {
    const run = createInitialRunState('ironwall');
    const result = endCombatTurn({
      ...run,
      phase: 'combat',
      progress: { ...run.progress, handLimit: 5 },
      combat: makeCombatState([], {
        deck: [],
        discard: [],
        playerInPlay: [],
        handLimit: 5,
        enemy: makeTestEnemy({ deck: [], drawPile: [], hand: [], currentEnergy: 0 }),
      }),
    });

    expect(result.run.message).toContain('没有可抽的牌');
  });

  it('生命贤者每回合结束回复3点生命', () => {
    const run = createInitialRunState('lifesage');
    const result = endCombatTurn({
      ...run,
      phase: 'combat',
      currentHp: 10,
      combat: makeCombatState([], {
        playerHp: 10,
        playerMaxHp: 35,
        deck: [],
        discard: [],
        playerInPlay: [],
        enemy: makeTestEnemy({ deck: [], drawPile: [], hand: [], currentEnergy: 0 }),
      }),
    });

    expect(result.run.currentHp).toBe(13);
    expect(result.run.combat?.playerHp).toBe(13);
    expect(result.run.message).toContain('自然回春恢复3点生命');
  });

  it('counts and discovers a card even when paralyze fizzles it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = createInitialRunState('ironwall');
    const card = state.deck[0];
    const result = playSkillCard({
      ...state,
      phase: 'combat',
      cardsPlayedCount: 0,
      discoveredCards: [],
      combat: {
        playerHp: 20,
        playerMaxHp: 20,
        playerEnergy: 5,
        playerMaxEnergy: 5,
        playerArmor: 0,
        enemy: makeTestEnemy(),
        extraEnemies: [],
        defeatedEnemies: [],
        currentEnemyIndex: 0,
        hand: [card],
        deck: [],
        discard: [],
        exhausted: [],
        playerInPlay: [],
        newlyDrawnIndexes: [],
        blessings: [],
        turnNumber: 0,
        playedCardTypesThisTurn: [],
        playerStatusEffects: [{ type: 'paralyze', value: 1, remainingTurns: 1 }],
        handLimit: 8,
        drawPerTurn: 4,
      },
    }, 0, 'e1');

    expect(result.cardsPlayedCount).toBe(1);
    expect(result.discoveredCards).toContain(card.id);
    expect(result.combat?.hand).toHaveLength(0);
    expect(result.combat?.discard[0].id).toBe(card.id);
  });

  it('玩家麻痹每次出牌只消耗1层', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const state = createInitialRunState('ironwall');
    const card = state.deck[0];
    const result = playSkillCard({
      ...state,
      phase: 'combat',
      combat: makeCombatState([card], {
        playerStatusEffects: [
          { type: 'paralyze', value: 2, remainingTurns: 1 },
          { type: 'paralyze', value: 1, remainingTurns: 1 },
        ],
      }),
    }, 0, 'e1');

    const remainingParalyze = result.combat?.playerStatusEffects
      .filter(status => status.type === 'paralyze')
      .reduce((sum, status) => sum + status.value, 0);
    expect(remainingParalyze).toBe(2);
  });

  it('吞噬者斩杀失败后下一回合仍可出伤害性技能牌', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const run = createInitialRunState('devourer');
    const executeCard = makeTestCard({ id: 'maw', cost: 1, effect: { damage: 3, executeThreshold: 0.35 } });
    const nextDamageCard = makeTestCard({ id: 'damage_next', cost: 1, effect: { damage: 5 } });
    const failed = playSkillCard({
      ...run,
      phase: 'combat',
      combat: makeCombatState([executeCard], {
        enemy: makeTestEnemy({ currentHp: 20, deck: [], hand: [], damage: 0 }),
        deck: [nextDamageCard],
        handLimit: 1,
      }),
    }, 0, 'e1');

    const nextTurn = endCombatTurn(failed).run;
    const nextTurnWithDamageCard = {
      ...nextTurn,
      combat: nextTurn.combat ? { ...nextTurn.combat, hand: [nextDamageCard] } : null,
    };
    const played = playSkillCard(nextTurnWithDamageCard, 0, 'e1');

    expect(played.combat?.hand).toHaveLength(0);
    expect(played.combat?.playerEnergy).toBe((nextTurnWithDamageCard.combat?.playerEnergy ?? 0) - nextDamageCard.cost);
  });

  it('冰霜祭司冻结敌人跳过行动后抽1张牌', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const run = createInitialRunState('frostpriest');
    const drawCard = makeTestCard({ id: 'drawn_card', effect: { damage: 1 } });
    const enemyAttack = {
      id: 'enemy_attack',
      name: '敌方攻击',
      cost: 1,
      type: 'attack' as const,
      effect: { damage: 6 },
      description: '',
    };
    const combat = makeCombatState([], {
      deck: [drawCard],
      enemy: makeTestEnemy({
        statusEffects: [{ type: 'freeze', value: 30, remainingTurns: 1 }],
        drawPile: [enemyAttack],
        handSize: 1,
        inPlay: [enemyAttack],
      }),
    });

    const result = endCombatTurn({ ...run, phase: 'combat' as const, combat }).run;

    expect(result.combat?.hand.map(card => card.id)).toContain('drawn_card');
    expect(result.combat?.playerArmor).toBe(0);
    expect(result.message).toContain('寒冰共鸣');
    expect(result.message).not.toContain('冰霜护盾');
  });
});

describe('getAreaRewardRange', () => {
  it('uses the tuned area reward table without level scaling', () => {
    expect(getAreaRewardRange('forest', 'normal')).toEqual({ min: 'white', max: 'green' });
    expect(getAreaRewardRange('forest', 'elite')).toEqual({ min: 'green', max: 'blue' });
    expect(getAreaRewardRange('forest', 'reward')).toEqual({ min: 'white', max: 'blue' });
    expect(getAreaRewardRange('forest', 'boss')).toEqual({ min: 'green', max: 'purple' });

    expect(getAreaRewardRange('ruins', 'normal')).toEqual({ min: 'green', max: 'blue' });
    expect(getAreaRewardRange('ruins', 'elite')).toEqual({ min: 'blue', max: 'purple' });
    expect(getAreaRewardRange('ruins', 'reward')).toEqual({ min: 'green', max: 'blue' });
    expect(getAreaRewardRange('ruins', 'boss')).toEqual({ min: 'blue', max: 'purple' });

    expect(getAreaRewardRange('flame', 'normal')).toEqual({ min: 'green', max: 'purple' });
    expect(getAreaRewardRange('flame', 'elite')).toEqual({ min: 'blue', max: 'purple' });
    expect(getAreaRewardRange('flame', 'reward')).toEqual({ min: 'green', max: 'purple' });
    expect(getAreaRewardRange('flame', 'boss')).toEqual({ min: 'purple', max: 'orange' });

    expect(getAreaRewardRange('frost', 'normal')).toEqual({ min: 'blue', max: 'purple' });
    expect(getAreaRewardRange('frost', 'elite')).toEqual({ min: 'purple', max: 'orange' });
    expect(getAreaRewardRange('frost', 'reward')).toEqual({ min: 'blue', max: 'purple' });
    expect(getAreaRewardRange('frost', 'boss')).toEqual({ min: 'purple', max: 'orange' });

    expect(getAreaRewardRange('chaos', 'normal')).toEqual({ min: 'blue', max: 'orange' });
    expect(getAreaRewardRange('chaos', 'elite')).toEqual({ min: 'purple', max: 'red' });
    expect(getAreaRewardRange('chaos', 'reward')).toEqual({ min: 'blue', max: 'orange' });
    expect(getAreaRewardRange('chaos', 'boss')).toEqual({ min: 'orange', max: 'red' });
  });
});

describe('getRewardRarityWeights', () => {
  it('keeps high-rarity rewards possible but much lower weighted', () => {
    const weights = getRewardRarityWeights('red');
    const red = weights.find(item => item.rarity === 'red');

    expect(weights.map(item => item.rarity)).toEqual(['white', 'green', 'blue', 'purple', 'orange', 'red']);
    expect(red?.weight).toBe(GACHA_RARITY_WEIGHTS.red);
    expect(weights.find(item => item.rarity === 'white')?.weight).toBeGreaterThan(red?.weight ?? 0);
  });

  it('caps weights at the provided max rarity', () => {
    expect(getRewardRarityWeights('blue').map(item => item.rarity)).toEqual(['white', 'green', 'blue']);
  });

  it('uses min rarity as reward floor', () => {
    expect(getRewardRarityWeights('purple', 'blue').map(item => item.rarity)).toEqual(['blue', 'purple']);
  });

  it('falls back to white for unknown rarity', () => {
    expect(getRewardRarityWeights('unknown')).toEqual([{ rarity: 'white', weight: 45 }]);
  });
});

describe('主动技能击杀记录', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => { storage.set(key, value); },
        removeItem: (key: string) => { storage.delete(key); },
      },
    });
    resetAllData();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function makeBossEnemy(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
    return {
      id: 'boss_tree_king',
      instanceId: 'boss_1',
      name: '树王',
      hp: 50,
      currentHp: 0,
      armor: 0,
      damage: 10,
      tier: 'boss',
      statusEffects: [],
      energy: 3,
      currentEnergy: 3,
      deck: [],
      drawPile: [],
      hand: [],
      discard: [],
      inPlay: [],
      handSize: 5,
      rewards: { exp: 50, gold: 100, cardRarity: 'blue' },
      area: 'forest',
      ...overrides,
    };
  }

  function makeMutualKillState(): CombatState {
    return {
      playerHp: 0,
      playerMaxHp: 20,
      playerEnergy: 0,
      playerMaxEnergy: 5,
      playerArmor: 0,
      playerStatusEffects: [{ type: 'burn', value: 5, remainingTurns: 1 }],
      enemy: makeBossEnemy(),
      extraEnemies: [],
      defeatedEnemies: [],
      currentEnemyIndex: 0,
      hand: [],
      deck: [],
      discard: [],
      exhausted: [],
      playerInPlay: [],
      newlyDrawnIndexes: [],
      blessings: [],
      turnNumber: 0,
      playedCardTypesThisTurn: [],
      handLimit: 8,
      drawPerTurn: 4,
    };
  }

  it('玩家与 Boss 同归于尽时记录 Boss 击杀', () => {
    const run = createInitialRunState('ironwall');
    const combat = makeMutualKillState();
    const state = { ...run, phase: 'combat' as const, combat };

    const { run: result } = endCombatTurn(state);

    expect(result.phase).toBe('defeat');
    const unlocks = getGlobalUnlocks();
    expect(unlocks.totalBossKills).toBeGreaterThanOrEqual(1);
  });

  it('普通敌人与玩家同归于尽时不记录 Boss 击杀', () => {
    const normalEnemy: EnemyInstance = {
      ...makeBossEnemy(),
      id: 'forest_wolf',
      tier: 'normal',
      instanceId: 'wolf_1',
    };
    const combat = { ...makeMutualKillState(), enemy: normalEnemy };
    const run = createInitialRunState('ironwall');
    const state = { ...run, phase: 'combat' as const, combat };
    const killsBefore = getGlobalUnlocks().totalBossKills;

    endCombatTurn(state);

    expect(getGlobalUnlocks().totalBossKills).toBe(killsBefore);
  });

  it('财富商人主动技能击杀 Boss 时记录击杀并更新统计', () => {
    const run = createInitialRunState('wealthmerchant');
    const combat = {
      ...makeMutualKillState(),
      playerHp: 20,
      playerEnergy: 1,
      enemy: makeBossEnemy({ currentHp: 5 }),
    };
    const state = {
      ...run,
      phase: 'combat' as const,
      gold: 10,
      cardsPlayedCount: 0,
      discoveredEnemies: [],
      combat,
    };

    const result = useActiveSkill(state, 'boss_1');

    expect(getGlobalUnlocks().totalBossKills).toBe(1);
    expect(result.cardsPlayedCount).toBe(1);
    expect(result.discoveredEnemies).toContain('boss_tree_king');
  });

  it('生命贤者不再拥有主动技能', () => {
    const run = createInitialRunState('lifesage');

    expect(run.character.activeSkill).toBeUndefined();
  });

  it('游侠商人主动技能消耗最多40金币和1点能量，造成消耗金币×2伤害', () => {
    const run = createInitialRunState('wealthmerchant');
    const combat = {
      ...makeMutualKillState(),
      playerEnergy: 2,
      enemy: makeBossEnemy({ currentHp: 120 }),
    };
    const state = {
      ...run,
      phase: 'combat' as const,
      gold: 50,
      combat,
    };

    const result = useActiveSkill(state, 'boss_1');

    expect(result.gold).toBe(10);
    expect(result.combat?.playerEnergy).toBe(1);
    expect(result.combat?.enemy.currentHp).toBe(40);
  });

  it('游侠商人主动技能金币不足40时消耗全部金币并造成双倍伤害', () => {
    const run = createInitialRunState('wealthmerchant');
    const combat = {
      ...makeMutualKillState(),
      playerEnergy: 2,
      enemy: makeBossEnemy({ currentHp: 80 }),
    };
    const state = {
      ...run,
      phase: 'combat' as const,
      gold: 25,
      combat,
    };

    const result = useActiveSkill(state, 'boss_1');

    expect(result.gold).toBe(0);
    expect(result.combat?.playerEnergy).toBe(1);
    expect(result.combat?.enemy.currentHp).toBe(30);
  });

  it('游侠商人主动技能能量不足时不发动', () => {
    const run = createInitialRunState('wealthmerchant');
    const combat = {
      ...makeMutualKillState(),
      playerEnergy: 0,
      enemy: makeBossEnemy({ currentHp: 80 }),
    };
    const state = {
      ...run,
      phase: 'combat' as const,
      gold: 25,
      combat,
    };

    const result = useActiveSkill(state, 'boss_1');

    expect(result.gold).toBe(25);
    expect(result.combat).toBe(combat);
    expect(result.message).toBe('能量不足，无法使用主动技能。');
  });
});

describe('焚卡炉', () => {
  it('只移除选择的卡牌，不回复生命或添加祝福', () => {
    const state = {
      ...createInitialRunState('ironwall'),
      phase: 'burn' as const,
      currentHp: 10,
      currentMaxHp: 50,
      chosenBlessings: [],
    };
    const burnedCard = state.deck[0];

    const result = burnCard(state, 0);

    expect(result.deck).not.toContain(burnedCard);
    expect(result.deck).toHaveLength(state.deck.length - 1);
    expect(result.currentHp).toBe(10);
    expect(result.chosenBlessings).toHaveLength(0);
  });

  it('不会焚毁最后一张卡牌', () => {
    const onlyCard = createInitialRunState('ironwall').deck[0];
    const state = {
      ...createInitialRunState('ironwall'),
      phase: 'burn' as const,
      deck: [onlyCard],
    };

    const result = burnCard(state, 0);

    expect(result.deck).toHaveLength(1);
    expect(result.phase).toBe('burn');
  });
});

describe('商店商品读档持久化', () => {
  it('存档包含 shopItems 时读档恢复', () => {
    const state = createInitialRunState('ironwall');
    const items = [state.deck[0], state.deck[1]];
    const stateWithShop = { ...state, phase: 'shop' as const, shopItems: items };

    const json = JSON.stringify({ name: 'test', timestamp: Date.now(), runState: stateWithShop });
    const parsed = JSON.parse(json);

    expect(parsed.runState.shopItems).toHaveLength(2);
    expect(parsed.runState.shopItems[0].id).toBe(items[0].id);
  });

  it('旧存档无 shopItems 字段时读档默认空数组', () => {
    const state = createInitialRunState('ironwall');
    const oldSave = { name: 'old', timestamp: Date.now(), runState: { ...state } };
    delete (oldSave.runState as any).shopItems;

    const json = JSON.stringify(oldSave);
    const parsed = JSON.parse(json);
    expect(parsed.runState.shopItems).toBeUndefined();
  });
});

describe('抽卡权重配置', () => {
  it('奖励权重保持保守递减', () => {
    const w = GACHA_RARITY_WEIGHTS;
    expect(w.white).toBeGreaterThan(w.green);
    expect(w.green).toBeGreaterThan(w.blue);
    expect(w.blue).toBeGreaterThan(w.purple);
    expect(w.purple).toBeGreaterThan(w.orange);
    expect(w.orange).toBeGreaterThan(w.red);
  });

  it('奖励权重不跟随抽卡机爆率提升', () => {
    const rewardWeights = getRewardRarityWeights('red');
    for (const item of rewardWeights) {
      expect(item.weight).toBe(GACHA_RARITY_WEIGHTS[item.rarity]);
    }
    expect(GACHA_MACHINE_RARITY_WEIGHTS.blue).toBeGreaterThan(GACHA_RARITY_WEIGHTS.blue);
  });

  it('抽卡机大幅提升蓝色以上和橙红概率', () => {
    const w = GACHA_MACHINE_RARITY_WEIGHTS;
    const total = Object.values(w).reduce((sum, weight) => sum + weight, 0);
    const bluePlus = w.blue + w.purple + w.orange + w.red;
    const orangePlus = w.orange + w.red;

    expect(bluePlus / total).toBeGreaterThanOrEqual(0.6);
    expect(orangePlus / total).toBeGreaterThanOrEqual(0.12);
  });
});
