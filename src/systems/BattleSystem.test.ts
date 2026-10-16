import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  applyBlessings,
  executeBattleAction,
  executeEnemyCard,
  endTurn,
  AGILE_DODGE_CHANCE,
  type BattleAction,
} from './BattleSystem';
import type { CombatState, EnemyInstance } from '../types/game';

// 防止 10% 暴击导致 flaky test：让 Math.random 始终返回 0.5（不会触发暴击）
afterEach(() => { vi.restoreAllMocks(); });
function disableCrit() {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
}

/** 创建一个基本敌人 */
function makeEnemy(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
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
    ...overrides,
  };
}

/** 创建一张基础 attack 卡 */
function makeAttackCard(overrides: Record<string, any> = {}) {
  const overriddenEffect = overrides.effect || {};
  return {
    id: 'test_attack',
    name: '测试攻击',
    cost: 1,
    type: 'attack' as const,
    tier: 1,
    rarity: 'white' as const,
    description: '',
    tags: [],
    ...overrides,
    effect: { damage: 6, ...overriddenEffect },
  };
}

/** 创建一个基础战斗状态 */
function makeCombatState(overrides: Partial<CombatState> = {}): CombatState {
  const base = {
    playerHp: 20,
    playerMaxHp: 20,
    playerEnergy: 5,
    playerMaxEnergy: 5,
    playerArmor: 0,
    playerStatusEffects: [],
    enemy: makeEnemy(),
    extraEnemies: [],
    currentEnemyIndex: 0,
    defeatedEnemies: [],
    hand: [makeAttackCard()],
    deck: [],
    discard: [],
    playerInPlay: [],
    handLimit: 8,
    drawPerTurn: 4,
    playedCardTypesThisTurn: [],
  };
  return { ...base, ...overrides };
}

/** 创建 acton */
function makeAction(overrides: Partial<BattleAction> = {}): BattleAction {
  return {
    card: makeAttackCard(),
    targetId: 'e1',
    handIndex: 0,
    blessingActive: false,
    goldAvailable: 999,
    passiveDamageBonus: 0,
    characterId: 'devourer',
    ...overrides,
  };
}

// ================================================================
// 测试：回响机制
// ================================================================

describe('回响机制', () => {
  it('触发回响时整张卡完整执行两遍，含抽牌和回能', () => {
    disableCrit();
    const state = makeCombatState({
      playerHp: 10,
      playerEnergy: 1,
      playerMaxEnergy: 5,
      playerStatusEffects: [{ type: 'echo', value: 1, remainingTurns: 1 }],
    });
    const card = makeAttackCard({
      cost: 0,
      type: 'buff',
      effect: { heal: 2, drawCards: 1, energyGain: 2 },
    });

    const { result, newState } = executeBattleAction(makeAction({ card, characterId: 'omnisage' }), state);

    // heal/energyGain 各执行两遍：+2+2=4 血，+2+2=4 能量（cap 到 maxEnergy=5）
    expect(newState.playerHp).toBe(14);
    expect(newState.playerEnergy).toBe(5);
    // drawCards 效果也随整张卡重放两遍，累加进 bonusDrawCards（1+1=2）
    expect(result.bonusDrawCards).toBe(2);
  });

  it('回响触发时伤害和回响获取都随整张卡重放', () => {
    disableCrit();
    const state = makeCombatState({
      enemy: makeEnemy({ currentHp: 30 }),
      playerStatusEffects: [{ type: 'echo', value: 1, remainingTurns: 1 }],
    });
    const card = makeAttackCard({ effect: { damage: 6, echoGain: 2 } });

    const { result, newState } = executeBattleAction(makeAction({ card, characterId: 'omnisage' }), state);

    expect(result.playerDamageDealt).toBe(12);
    expect(newState.enemy.currentHp).toBe(18);
    // echoGain 也随整张卡重放两遍：2+2=4 层（原有1层已消耗触发本次回响，不计入）
    expect(newState.playerStatusEffects).toContainEqual({ type: 'echo', value: 4, remainingTurns: 1 });
  });

  it('回响触发时敏捷和圣光等资源型增益也随整张卡重放', () => {
    disableCrit();
    const state = makeCombatState({
      radianceStacks: 1,
      playerStatusEffects: [{ type: 'echo', value: 1, remainingTurns: 1 }],
    });
    const card = makeAttackCard({
      cost: 0,
      type: 'buff',
      effect: { agileGain: 2, radianceGain: 3 },
    });

    const { newState } = executeBattleAction(makeAction({ card, characterId: 'omnisage' }), state);

    // radianceGain 重放两遍：1 + 3 + 3 = 7
    expect(newState.radianceStacks).toBe(7);
    // agileGain 重放两遍，同层状态叠加为 4
    expect(newState.playerStatusEffects).toContainEqual({ type: 'agile', value: 4, remainingTurns: 1 });
  });
});

// ================================================================
// 测试：attack 类型卡牌带 heal 效果
// ================================================================

describe('attack 卡牌带 heal 效果', () => {
  it('attack + heal 卡同时造成伤害和回复', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 20 });
    const state = makeCombatState({ enemy, playerHp: 15 });
    const card = makeAttackCard({ effect: { damage: 6, heal: 4 } });
    const action = makeAction({ card, characterId: 'generic' });
    const { result, newState } = executeBattleAction(action, state);

    // 敌人受到 6 伤害
    expect(newState.enemy.currentHp).toBe(14);
    expect(result.playerDamageDealt).toBe(6);
    // 玩家回复 4 血（但不能超过 maxHp）
    expect(newState.playerHp).toBe(19);
    expect(result.playerHealReceived).toBe(4);
  });

  it('attack + heal 回复不超过 maxHp', () => {
    const enemy = makeEnemy({ currentHp: 20 });
    const state = makeCombatState({ enemy, playerHp: 19 });
    const card = makeAttackCard({ effect: { damage: 6, heal: 10 } });
    const action = makeAction({ card, characterId: 'generic' });
    const { result, newState } = executeBattleAction(action, state);

    // 回复应被 cap 到 maxHp = 20
    expect(newState.playerHp).toBe(20);
    expect(result.playerHealReceived).toBe(10); // 实际收到的记录值
  });

  it('attack 无 heal 不影响血量', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 20 });
    const state = makeCombatState({ enemy, playerHp: 15 });
    const card = makeAttackCard({ effect: { damage: 6 } }); // 无 heal
    const action = makeAction({ card, characterId: 'generic' });
    const { result, newState } = executeBattleAction(action, state);

    expect(newState.enemy.currentHp).toBe(14);
    expect(newState.playerHp).toBe(15); // 没变化
    expect(result.playerHealReceived).toBe(0);
  });
});

// ================================================================
// 测试：吞噬者被动（吞噬本能）
// ================================================================

describe('吞噬者被动——吞噬本能', () => {
  // 辅助：创建吞噬者 + 低血量敌人的状态
  function setupDevour(enemyHp: number, playerHp = 14, playerMaxHp = 14, card?: any) {
    const enemyMaxHp = 30;
    const enemy = makeEnemy({ hp: enemyMaxHp, currentHp: enemyHp });
    const state = makeCombatState({ enemy, playerHp, playerMaxHp });
    const attackCard = card ?? makeAttackCard({
      effect: { damage: 3 }, // 3 伤害，不直接杀死低血量敌人
    });
    const action = makeAction({ card: attackCard, characterId: 'devourer' });
    return { state, action };
  }

  it('敌人在 15% 以下触发吞噬，回复 15% 最大生命并永久 +2 上限', () => {
    // 敌人 30 血，剩 4 血 (13.3% < 15%)
    const { state, action } = setupDevour(4, 14, 14);
    const { result, newState } = executeBattleAction(action, state);

    // 敌人被斩杀（伤害 3 + 吞噬）
    expect(newState.enemy.currentHp).toBe(0);
    // 回复：4/30 = 0.133, healAmount = round(30*0.15) = 5, +2 加上限
    // cap = min(14+2, 14+3+2) = min(16, 19) = 16
    expect(newState.playerHp).toBe(16);
    expect(newState.playerMaxHp).toBe(16);
    expect(result.devourMaxHpGain).toBe(2);
    expect(result.playerHealReceived).toBe(5);
    // 消息验证
    expect(result.messages.some(m => m.includes('吞噬本能'))).toBe(true);
  });

  it('伤害杀死敌人后仍触发吞噬（修复的 bug）', () => {
    // 敌人 30 血，剩 3 血 (10% < 15%)，攻击 6 伤害会直接打死
    const card = makeAttackCard({ effect: { damage: 6 } });
    const { state, action } = setupDevour(3, 14, 14, card);
    const { result, newState } = executeBattleAction(action, state);

    // 敌人被斩杀
    expect(newState.enemy.currentHp).toBe(0);
    // 吞噬回复仍然触发：healAmount = round(30*0.15) = 5
    expect(newState.playerHp).toBe(16); // min(16, 14+3+2) = 16
    expect(newState.playerMaxHp).toBe(16);
    expect(result.devourMaxHpGain).toBe(2);
  });

  it('敌人高于 15% 不触发吞噬', () => {
    // 敌人 30 血，剩 10 血 (33% > 15%)，攻击 3 伤害
    // 即使暴击也剩 6 血 (20% > 15%)
    const card = makeAttackCard({ effect: { damage: 3 } });
    const { state, action } = setupDevour(10, 14, 14, card);
    const { result, newState } = executeBattleAction(action, state);

    // 敌人存活，没有吞噬
    expect(newState.enemy.currentHp).toBeGreaterThan(0);
    expect(newState.enemy.currentHp / newState.enemy.hp).toBeGreaterThan(0.15);
    expect(result.devourMaxHpGain).toBe(0);
    expect(result.playerHealReceived).toBe(0);
    expect(newState.playerMaxHp).toBe(14);
  });

  it('多次吞噬累积加上限', () => {
    // 这个测试验证连续吞噬的累积效果
    // 但 executeBattleAction 是一次调用，所以只能测单次
    // 累积逻辑在 RunManager 中
    // 这里验证 devourMaxHpGain 正确传递
    const { state, action } = setupDevour(4, 14, 14);
    const { result, newState } = executeBattleAction(action, state);

    expect(result.devourMaxHpGain).toBe(2);
    expect(newState.playerMaxHp).toBe(16);
  });

  it('流血等持续伤害在回合结束跳血杀死敌人不触发吞噬（必须由攻击触发）', () => {
    // 敌人 30 血，剩 2 血，回合结束时被流血跳血杀死，而非玩家攻击直接斩杀
    const enemy = makeEnemy({ hp: 30, currentHp: 2, statusEffects: [{ type: 'bleed', value: 5, duration: 2 }] });
    const state = makeCombatState({ enemy, playerHp: 14, playerMaxHp: 14 });

    const result = endTurn(state);

    expect(result.state.enemy.currentHp).toBe(0);
    // endTurn 的结果类型上没有 devourMaxHpGain 字段，且玩家生命上限、当前生命均不受影响
    expect(result.state.playerMaxHp).toBe(14);
    expect(result.state.playerHp).toBe(14);
  });
});

// ================================================================
// 测试：吞噬者专属卡牌
// ================================================================

describe('吞噬者卡牌', () => {
  it('饱餐：造成伤害并回复血量', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 20 });
    const state = makeCombatState({ enemy, playerHp: 12 });
    // devourer_feast: type=attack, damage=5, heal=3
    const card = makeAttackCard({ effect: { damage: 5, heal: 3 } });
    const action = makeAction({ card, characterId: 'devourer' });
    const { result, newState } = executeBattleAction(action, state);

    expect(newState.enemy.currentHp).toBe(15);
    expect(newState.playerHp).toBe(15); // 12 + 3
    expect(result.playerHealReceived).toBe(3);
  });

  it('血盆大口：低于 35% 斩杀并触发吞噬', () => {
    const enemy = makeEnemy({ currentHp: 10 }); // 10/30 = 33% < 35%
    const state = makeCombatState({ enemy, playerHp: 14, playerMaxHp: 14 });
    // devourer_maw: type=attack, cost=2, damage=6, executeThreshold=0.35
    const card = makeAttackCard({ cost: 2, effect: { damage: 6, executeThreshold: 0.35 } });
    const action = makeAction({ card, characterId: 'devourer' });
    const { result, newState } = executeBattleAction(action, state);

    expect(newState.enemy.currentHp).toBe(0);
    // 吞噬触发：healAmount = round(30*0.15) = 5
    // cap = min(14+2, 14+3+2) = min(16, 19) = 16
    expect(newState.playerHp).toBe(16);
    expect(newState.playerMaxHp).toBe(16);
    expect(result.devourMaxHpGain).toBe(2);
  });

  it('斩杀卡未斩杀时只造成普通伤害', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 20, hp: 30 });
    const state = makeCombatState({ enemy });
    const card = makeAttackCard({ cost: 2, effect: { damage: 3, executeThreshold: 0.35 } });

    const { newState } = executeBattleAction(makeAction({ card, characterId: 'devourer' }), state);

    expect(newState.enemy.currentHp).toBe(17);
  });
});

// ================================================================
// 测试：其他角色 attack+heal 卡牌
// ================================================================

describe('其他角色 attack+heal 卡牌', () => {
  it('亡灵祭司：生命汲取造成伤害并回复', () => {
    const enemy = makeEnemy({ currentHp: 30, hp: 30 });
    const state = makeCombatState({ enemy, playerHp: 10 });
    const card = makeAttackCard({ effect: { damage: 6, heal: 2 } });
    const action = makeAction({ card, characterId: 'undeadpriest' });
    const { newState } = executeBattleAction(action, state);

    // 回复量不受暴击影响
    expect(newState.playerHp).toBe(12); // 10 + 2
    expect(newState.enemy.currentHp).toBeGreaterThanOrEqual(21); // 30 - 6(-9 if crit)
  });

  it('圣光之怒：造成伤害、回复并积累圣光', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 30 });
    const state = makeCombatState({ enemy, playerHp: 10 });
    const card = makeAttackCard({ effect: { damage: 16, heal: 6, radianceGain: 3 } });
    const action = makeAction({ card, characterId: 'holylight' });
    const { newState } = executeBattleAction(action, state);

    expect(newState.enemy.currentHp).toBe(14);
    expect(newState.playerHp).toBe(16);
    expect(newState.radianceStacks).toBe(3);
  });

  it('圣光爆发消耗圣光造成伤害并回复', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 30 });
    const state = makeCombatState({ enemy, playerHp: 10, radianceStacks: 4 });
    const card = makeAttackCard({ effect: { damage: 0, radianceBurst: 3 } });
    const action = makeAction({ card, characterId: 'holylight' });
    const { result, newState } = executeBattleAction(action, state);

    expect(newState.enemy.currentHp).toBe(18);
    expect(newState.playerHp).toBe(20);
    expect(newState.radianceStacks).toBe(0);
    expect(result.playerDamageDealt).toBe(12);
    expect(result.playerHealReceived).toBe(12);
  });

  it('没有圣光时圣光爆发正常打出但不造成额外效果', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 30 });
    const state = makeCombatState({ enemy, playerHp: 10, radianceStacks: 0 });
    const card = makeAttackCard({ effect: { damage: 0, radianceBurst: 3 } });
    const action = makeAction({ card, characterId: 'holylight' });
    const { result, newState } = executeBattleAction(action, state);

    expect(newState.enemy.currentHp).toBe(30);
    expect(newState.playerHp).toBe(10);
    expect(newState.radianceStacks).toBe(0);
    expect(result.playerDamageDealt).toBe(0);
    expect(result.playerHealReceived).toBe(0);
  });

  it('圣光可以多次积累', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 30 });
    const state = makeCombatState({ enemy, radianceStacks: 2 });
    const card = makeAttackCard({ effect: { damage: 0, radianceGain: 3 } });
    const action = makeAction({ card, characterId: 'holylight' });
    const { newState } = executeBattleAction(action, state);

    expect(newState.radianceStacks).toBe(5);
  });

  it('圣光爆发受圣光恩赐伤害加成', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 30 });
    const state = makeCombatState({ enemy, playerHp: 7, playerMaxHp: 20, radianceStacks: 4 });
    const card = makeAttackCard({ effect: { damage: 0, radianceBurst: 3 } });
    const action = makeAction({ card, characterId: 'holylight', passiveDamageBonus: 100 });
    const { result, newState } = executeBattleAction(action, state);

    expect(newState.enemy.currentHp).toBe(6);
    expect(newState.playerHp).toBe(20);
    expect(result.playerDamageDealt).toBe(24);
    expect(result.playerHealReceived).toBe(24);
  });

  it('圣光裁决消耗圣光获得强化并施加虚弱', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 30 });
    const state = makeCombatState({ enemy, radianceStacks: 3 });
    const card = makeAttackCard({ type: 'special', effect: { damage: 0, radianceJudgment: 2 } });
    const action = makeAction({ card, characterId: 'holylight' });
    const { newState } = executeBattleAction(action, state);

    expect(newState.radianceStacks).toBe(0);
    expect(newState.playerStatusEffects).toContainEqual({ type: 'empower', value: 6, remainingTurns: 2 });
    expect(newState.enemy.statusEffects).toContainEqual({ type: 'weak', value: 6, remainingTurns: 2 });
  });

  it('圣光消耗牌共享同一层数池', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 30 });
    const verdict = makeAttackCard({ id: 'verdict', type: 'special', effect: { damage: 0, radianceJudgment: 2 } });
    const burst = makeAttackCard({ id: 'burst', effect: { damage: 0, radianceBurst: 3 } });
    const state = makeCombatState({ enemy, hand: [verdict, burst], radianceStacks: 3 });

    const afterVerdict = executeBattleAction(makeAction({ card: verdict, handIndex: 0, characterId: 'holylight' }), state).newState;
    const afterBurst = executeBattleAction(makeAction({ card: burst, handIndex: 0, characterId: 'holylight' }), afterVerdict);

    expect(afterVerdict.radianceStacks).toBe(0);
    expect(afterBurst.result.playerDamageDealt).toBe(0);
    expect(afterBurst.newState.enemy.currentHp).toBe(30);
  });

  it('圣光卡消耗圣光净化自身负面效果', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 30 });
    const state = makeCombatState({
      enemy,
      radianceStacks: 2,
      playerStatusEffects: [{ type: 'weak', value: 2, remainingTurns: 2 }],
    });
    const card = makeAttackCard({ tags: ['holy'], effect: { damage: 0, radianceGain: 1 } });
    const action = makeAction({ card, characterId: 'holylight' });
    const { newState } = executeBattleAction(action, state);

    expect(newState.radianceStacks).toBe(2);
    expect(newState.playerStatusEffects).toContainEqual({ type: 'weak', value: 1, remainingTurns: 2 });
  });

  it('圣光抵消敌人施加的负面效果', () => {
    const enemyCard = {
      id: 'curse',
      name: '诅咒',
      cost: 1,
      type: 'skill' as const,
      effect: { applyStatus: { type: 'weak' as const, value: 2, duration: 2 } },
      description: '',
    };
    const enemy = makeEnemy();

    const result = executeEnemyCard(enemyCard, enemy, 0, 20, [], 1);

    expect(result.radianceAfter).toBe(0);
    expect(result.radianceBlockedStatus).toBe(true);
    expect(result.playerStatusesAfter).toEqual([]);
  });

  it('带圣光标签的圣光裁决会先净化再消耗剩余圣光', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const enemy = makeEnemy({ currentHp: 30 });
    const state = makeCombatState({
      enemy,
      radianceStacks: 3,
      playerStatusEffects: [{ type: 'weak', value: 1, remainingTurns: 2 }],
    });
    const card = makeAttackCard({ tags: ['holy'], type: 'special', effect: { damage: 0, radianceJudgment: 2 } });
    const action = makeAction({ card, characterId: 'holylight' });
    const { newState } = executeBattleAction(action, state);

    expect(newState.radianceStacks).toBe(0);
    expect(newState.playerStatusEffects).toContainEqual({ type: 'empower', value: 4, remainingTurns: 2 });
    expect(newState.playerStatusEffects.some(status => status.type === 'weak')).toBe(false);
    expect(newState.enemy.statusEffects).toContainEqual({ type: 'weak', value: 4, remainingTurns: 2 });
  });

  it('平衡之道：造成伤害并回复', () => {
    const enemy = makeEnemy({ currentHp: 30 }); // max HP, crit-proof
    const state = makeCombatState({ enemy, playerHp: 10 });
    const card = makeAttackCard({ effect: { damage: 8, heal: 3 } });
    const action = makeAction({ card, characterId: 'omnisage' });
    const { newState } = executeBattleAction(action, state);

    // 暴击不影响回复量
    expect(newState.playerHp).toBe(13); // 10 + 3
    expect(newState.enemy.currentHp).toBeGreaterThanOrEqual(18); // 30 - 8(-12 if crit)
  });
});

// ================================================================
// 测试：吞噬者平衡性调整
// ================================================================

describe('吞噬者初始卡组', () => {
  it('初始卡组包含基础格挡', async () => {
    // 从 RunManager 验证初始卡组包含 generic_block
    const { getStarterSkills } = await import('./RunManager');
    const skills = getStarterSkills('devourer');
    const blockCards = skills.filter(s => s.id === 'generic_block');
    expect(blockCards.length).toBe(2); // 2 张基础格挡

    const lightAttacks = skills.filter(s => s.id === 'generic_light_attack');
    expect(lightAttacks.length).toBe(2); // 而不是 4
  });
});

// ================================================================
// 测试：第一批机制一致性修复
// ================================================================

describe('机制一致性修复', () => {
  it('圣光使者在 35% 生命时攻击伤害翻倍', async () => {
    disableCrit();
    const { createInitialRunState, playSkillCard } = await import('./RunManager');
    const run = createInitialRunState('holylight');
    const attackCard = makeAttackCard({ effect: { damage: 6 } });
    const combat = makeCombatState({
      playerHp: 7,
      playerMaxHp: 20,
      hand: [attackCard],
      blessings: [],
      playerEnergy: 5,
      playerMaxEnergy: 5,
    });
    const state = { ...run, phase: 'combat' as const, combat };

    const result = playSkillCard(state, 0, 'e1');

    expect(result.combat?.enemy.currentHp).toBe(18);
  });

  it('能量充盈祝福同时提高当前能量和上限 2 点', () => {
    const state = makeCombatState({ playerEnergy: 4, playerMaxEnergy: 4 });

    const result = applyBlessings([{ id: 'bless_energy', name: '能量充盈', description: '', duration: 'battle', effect: { energyGain: 2, maxEnergyGain: 2 } }], state);

    expect(result.playerMaxEnergy).toBe(6);
    expect(result.playerEnergy).toBe(6);
  });

  it('defense 牌带 drawCards 时产生抽牌消息', () => {
    const card = makeAttackCard({ type: 'defense', effect: { armor: 5, drawCards: 1 } });
    const action = makeAction({ card, characterId: 'generic' });

    const { result } = executeBattleAction(action, makeCombatState());

    expect(result.messages.some(message => message.includes('抽 1 张牌'))).toBe(true);
  });

  it('AoE 对所有存活敌人生效', () => {
    disableCrit();
    const state = makeCombatState({
      enemy: makeEnemy({ instanceId: 'e1', currentHp: 20, hp: 20 }),
      extraEnemies: [
        makeEnemy({ instanceId: 'e2', currentHp: 18, hp: 18 }),
        makeEnemy({ instanceId: 'e3', currentHp: 16, hp: 16 }),
      ],
    });
    const card = makeAttackCard({ effect: { damage: 0, damageToAll: 5 } });

    const { result, newState } = executeBattleAction(makeAction({ card, targetId: 'e1', characterId: 'generic' }), state);

    expect(newState.enemy.currentHp).toBe(15);
    expect(newState.extraEnemies[0].currentHp).toBe(13);
    expect(newState.extraEnemies[1].currentHp).toBe(11);
    expect(result.playerDamageDealt).toBe(15);
  });

  it('护甲先吸收伤害', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 20, hp: 20, armor: 4 });
    const card = makeAttackCard({ effect: { damage: 6 } });

    const { result, newState } = executeBattleAction(makeAction({ card, characterId: 'generic' }), makeCombatState({ enemy }));

    expect(newState.enemy.currentHp).toBe(18);
    expect(newState.enemy.armor).toBe(0);
    expect(result.brokeEnemyArmor).toBe(true);
  });

  it('敌方旧护甲会在敌人回合开始时清空', () => {
    const state = makeCombatState({
      enemy: makeEnemy({ armor: 8, energy: 0, currentEnergy: 0, handSize: 0 }),
    });

    const result = endTurn(state);

    expect(result.state.enemy.armor).toBe(0);
  });

  it('敌人回合只保留本回合新获得的护甲', () => {
    const enemyCard = {
      id: 'enemy_guard',
      name: '敌方防御',
      cost: 1,
      type: 'defense' as const,
      effect: { armor: 3 },
      description: '',
    };
    const state = makeCombatState({
      enemy: makeEnemy({ armor: 5, energy: 1, currentEnergy: 1, handSize: 1, drawPile: [enemyCard] }),
    });

    const result = endTurn(state);

    expect(result.state.enemy.armor).toBe(3);
  });

  it('弱点与抗性不改变玩家攻击伤害', () => {
    disableCrit();
    const enemy = makeEnemy({ currentHp: 30, hp: 30, weaknesses: ['fire'], resistances: ['ice'] });
    const weaknessCard = makeAttackCard({ tags: ['fire'], effect: { damage: 6 } });
    const resistCard = makeAttackCard({ id: 'ice_attack', tags: ['ice'], effect: { damage: 6 } });

    const weaknessResult = executeBattleAction(
      makeAction({ card: weaknessCard, characterId: 'generic' }),
      makeCombatState({ enemy, hand: [weaknessCard] }),
    );
    const resistResult = executeBattleAction(
      makeAction({ card: resistCard, characterId: 'generic' }),
      makeCombatState({ enemy, hand: [resistCard] }),
    );

    expect(weaknessResult.newState.enemy.currentHp).toBe(24);
    expect(weaknessResult.result.playerDamageDealt).toBe(6);
    expect(weaknessResult.result.messages.join('')).not.toContain('弱点');
    expect(resistResult.newState.enemy.currentHp).toBe(24);
    expect(resistResult.result.playerDamageDealt).toBe(6);
    expect(resistResult.result.messages.join('')).not.toContain('抗性');
  });

  it('hpCost 只扣一次生命并触发血祭强化', () => {
    disableCrit();
    const card = makeAttackCard({ effect: { damage: 6, hpCost: 4 } });
    const state = makeCombatState({ playerHp: 20, hand: [card] });

    const { result, newState } = executeBattleAction(makeAction({ card, characterId: 'undeadpriest' }), state);

    expect(newState.playerHp).toBe(16);
    expect(result.messages.filter(message => message.includes('测试攻击 献祭 4 点生命')).length).toBe(1);
    expect(result.messages.join('')).not.toContain('消耗了 4 点生命');
    expect(newState.playerStatusEffects).toContainEqual({ type: 'empower', value: 1, remainingTurns: 2 });
  });

  it('goldCost 金币不足时拒绝出牌', () => {
    const state = makeCombatState();
    const card = makeAttackCard({ effect: { damage: 5, goldCost: 50 } });

    const { result, newState } = executeBattleAction(makeAction({ card, goldAvailable: 30, characterId: 'generic' }), state);

    expect(result.messages.some(message => message.includes('金币不足'))).toBe(true);
    expect(newState).toBe(state);
  });

  it('重复手牌出一张时只移除对应位置的一张', () => {
    disableCrit();
    const firstCard = makeAttackCard({ id: 'same_card', name: '同名牌' });
    const secondCard = makeAttackCard({ id: 'same_card', name: '同名牌' });
    const state = makeCombatState({ hand: [firstCard, secondCard] });

    const { newState } = executeBattleAction(
      makeAction({ card: firstCard, handIndex: 0, characterId: 'generic' }),
      state,
    );

    expect(newState.hand).toEqual([secondCard]);
    expect(newState.playerInPlay).toEqual([firstCard]);
  });

  it('applyStatus.target 控制状态施加方向', () => {
    const selfStatusCard = makeAttackCard({ effect: { applyStatus: { type: 'burn', value: 2, duration: 2, target: 'player' } } });
    const enemyStatusCard = makeAttackCard({ effect: { applyStatus: { type: 'poison', value: 1, duration: 3, target: 'enemy' } } });

    const selfResult = executeBattleAction(makeAction({ card: selfStatusCard, characterId: 'generic' }), makeCombatState()).newState;
    const enemyResult = executeBattleAction(makeAction({ card: enemyStatusCard, characterId: 'generic' }), makeCombatState()).newState;

    expect(selfResult.playerStatusEffects.some(status => status.type === 'burn')).toBe(true);
    expect(selfResult.enemy.statusEffects.some(status => status.type === 'burn')).toBe(false);
    expect(enemyResult.enemy.statusEffects.some(status => status.type === 'poison')).toBe(true);
  });

  it('元素法师每张元素牌触发对应刻印', () => {
    const fireCard = makeAttackCard({ tags: ['fire'], effect: { damage: 1 } });
    const iceCard = makeAttackCard({ tags: ['ice'], effect: { armor: 1 } });
    const lightningCard = makeAttackCard({ tags: ['lightning'], effect: { damage: 1 } });

    const fireState = executeBattleAction(
      makeAction({ card: fireCard, characterId: 'elementmage' }),
      makeCombatState(),
    ).newState;
    const iceState = executeBattleAction(
      makeAction({ card: iceCard, characterId: 'elementmage' }),
      makeCombatState(),
    ).newState;
    const lightningState = executeBattleAction(
      makeAction({ card: lightningCard, characterId: 'elementmage' }),
      makeCombatState(),
    ).newState;

    expect(fireState.enemy.statusEffects).toContainEqual({ type: 'burn', value: 1, remainingTurns: 2 });
    expect(iceState.enemy.statusEffects).toContainEqual({ type: 'weak', value: 1, remainingTurns: 2 });
    expect(lightningState.enemy.statusEffects).toContainEqual({ type: 'paralyze', value: 1, remainingTurns: 1 });
  });

  it('元素 payoff 按目标状态层数追加伤害或护甲', () => {
    const fragileCard = makeAttackCard({ effect: { damage: 4, fragileScale: 2 } });
    const paralyzeCard = makeAttackCard({ effect: { damage: 4, paralyzeScale: 3 } });
    const weakArmorCard = makeAttackCard({ effect: { damage: 0, armor: 2, weakArmorScale: 2 } });

    const fragileResult = executeBattleAction(
      makeAction({ card: fragileCard, characterId: 'elementmage' }),
      makeCombatState({ enemy: makeEnemy({ statusEffects: [{ type: 'fragile', value: 3, remainingTurns: 2 }] }) }),
    ).newState;
    const paralyzeResult = executeBattleAction(
      makeAction({ card: paralyzeCard, characterId: 'elementmage' }),
      makeCombatState({ enemy: makeEnemy({ statusEffects: [{ type: 'paralyze', value: 2, remainingTurns: 1 }] }) }),
    ).newState;
    const armorResult = executeBattleAction(
      makeAction({ card: weakArmorCard, characterId: 'elementmage' }),
      makeCombatState({ enemy: makeEnemy({ statusEffects: [{ type: 'weak', value: 3, remainingTurns: 2 }] }) }),
    ).newState;

    expect(fragileResult.enemy.currentHp).toBe(17);
    expect(paralyzeResult.enemy.currentHp).toBe(20);
    expect(armorResult.playerArmor).toBe(8);
  });

  it('火焰审判消耗灼烧造成额外伤害', () => {
    const card = makeAttackCard({ effect: { damage: 5, consumeBurnDamage: 3 } });

    const { result, newState } = executeBattleAction(
      makeAction({ card, characterId: 'elementmage' }),
      makeCombatState({ enemy: makeEnemy({ currentHp: 30, statusEffects: [{ type: 'burn', value: 2, remainingTurns: 2 }] }) }),
    );

    expect(newState.enemy.currentHp).toBe(19);
    expect(newState.enemy.statusEffects.find(status => status.type === 'burn')).toBeUndefined();
    expect(result.playerDamageDealt).toBe(11);
  });

  it('雷暴核心按行动前麻痹触发抽牌和消耗', () => {
    const card = makeAttackCard({ effect: { damage: 5, consumeParalyze: 1, drawIfParalyzed: 1, energyIfParalyzed: 1 } });

    const { result, newState } = executeBattleAction(
      makeAction({ card, characterId: 'elementmage' }),
      makeCombatState({ enemy: makeEnemy({ statusEffects: [{ type: 'paralyze', value: 1, remainingTurns: 1 }] }) }),
    );

    expect(newState.enemy.statusEffects.find(status => status.type === 'paralyze')).toBeUndefined();
    expect(newState.playerEnergy).toBe(5);
    expect(result.bonusDrawCards).toBe(1);
  });

  it('静电回路按行动前麻痹选择上麻痹或资源分支', () => {
    const card = makeAttackCard({ type: 'special' as const, effect: { paralyzeIfNone: 2, drawIfParalyzed: 1, energyIfParalyzed: 1 } });

    const noParalyze = executeBattleAction(
      makeAction({ card, characterId: 'elementmage' }),
      makeCombatState(),
    );
    const withParalyze = executeBattleAction(
      makeAction({ card, characterId: 'elementmage' }),
      makeCombatState({ enemy: makeEnemy({ statusEffects: [{ type: 'paralyze', value: 1, remainingTurns: 1 }] }) }),
    );

    expect(noParalyze.newState.enemy.statusEffects).toContainEqual({ type: 'paralyze', value: 2, remainingTurns: 1 });
    expect(noParalyze.result.bonusDrawCards).toBe(0);
    expect(withParalyze.newState.enemy.statusEffects).toContainEqual({ type: 'paralyze', value: 1, remainingTurns: 1 });
    expect(withParalyze.result.bonusDrawCards).toBe(1);
    expect(withParalyze.newState.playerEnergy).toBe(5);
  });

  it('护甲保留状态不会在敌人回合状态结算时提前消失', () => {
    const state = makeCombatState({
      playerArmor: 20,
      playerStatusEffects: [{ type: 'armor', value: 50, remainingTurns: 1 }],
      enemy: makeEnemy({ energy: 0, currentEnergy: 0, handSize: 0 }),
    });

    const result = endTurn(state);

    expect(result.state.playerStatusEffects).toContainEqual({ type: 'armor', value: 50, remainingTurns: 1 });
  });

  // ================================================================
  // 测试：金币消耗治疗卡
  // ================================================================

  describe('金币消耗治疗卡', () => {
    it('heal 类型卡牌带 goldCost 消耗金币并回复生命', () => {
      const state = makeCombatState({ playerHp: 10, playerMaxHp: 30 });
      const card = makeAttackCard({ type: 'heal' as const, effect: { goldCost: 3, heal: 15 } });
      const action = makeAction({ card, goldAvailable: 10, characterId: 'wealthmerchant' });

      const { result, newState } = executeBattleAction(action, state);

      expect(newState.playerHp).toBe(25);
      expect(result.playerHealReceived).toBe(15);
      expect(result.goldSpent).toBe(3);
    });

    it('金币不足时无法使用金币治疗卡', () => {
      const state = makeCombatState({ playerHp: 10 });
      const card = makeAttackCard({ type: 'heal' as const, effect: { goldCost: 10, heal: 30 } });
      const action = makeAction({ card, goldAvailable: 5, characterId: 'wealthmerchant' });

      const { result, newState } = executeBattleAction(action, state);

      expect(newState).toBe(state);
      expect(result.goldSpent).toBe(0);
      expect(result.messages.some(m => m.includes('金币不足'))).toBe(true);
    });
  });
});

// ================================================================
// 测试：第一批角色特色机制
// ================================================================

describe('第一批角色特色机制', () => {
  it('agileGain 获得敏捷状态', () => {
    const card = makeAttackCard({ type: 'buff', effect: { agileGain: 2 } });

    const { newState } = executeBattleAction(makeAction({ card, characterId: 'shadowblade' }), makeCombatState({ hand: [card] }));

    expect(newState.playerStatusEffects).toContainEqual({ type: 'agile', value: 2, remainingTurns: 1 });
  });

  it('敏捷判定成功时闪避敌方伤害牌并消耗1层', () => {
    vi.spyOn(Math, 'random').mockReturnValue((AGILE_DODGE_CHANCE - 1) / 100);
    const enemyCard = {
      id: 'enemy_attack',
      name: '敌方攻击',
      cost: 1,
      type: 'attack' as const,
      effect: { damage: 6 },
      description: '',
    };
    const state = makeCombatState({
      playerStatusEffects: [{ type: 'agile', value: 1, remainingTurns: 1 }],
      enemy: makeEnemy({ energy: 1, currentEnergy: 1, drawPile: [enemyCard], handSize: 1 }),
    });

    const result = endTurn(state);

    expect(result.enemyDamage).toBe(0);
    expect(result.state.playerHp).toBe(20);
    expect(result.state.playerStatusEffects.some(status => status.type === 'agile')).toBe(false);
    expect(result.messages.some(message => message.includes('敏捷闪避'))).toBe(true);
    expect(result.enemySteps.some(step => step.fxEvents?.some(event => event.type === 'dodge' && event.target === 'player'))).toBe(true);
  });

  it('麻痹命中时敌人出牌失效并触发特效事件', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // roll < chance, 麻痹命中
    const enemyCard = {
      id: 'enemy_attack',
      name: '敌方攻击',
      cost: 1,
      type: 'attack' as const,
      effect: { damage: 6 },
      description: '',
    };
    const state = makeCombatState({
      enemy: makeEnemy({
        energy: 1,
        currentEnergy: 1,
        handSize: 1,
        drawPile: [enemyCard],
        hand: [],
        statusEffects: [{ type: 'paralyze', value: 1, remainingTurns: 1 }],
      }),
    });

    const result = endTurn(state);

    // 麻痹在敌人每牌判定中触发 fxEvent
    expect(result.enemySteps.some(step => step.fxEvents?.some(event => (
      event.type === 'paralyze' && event.target === 'enemy' && event.enemyId === state.enemy.instanceId
    )))).toBe(true);
    // 麻痹层数被消耗（1→0，状态被移除）
    expect(result.state.enemy.statusEffects.find(s => s.type === 'paralyze')).toBeUndefined();
  });

  it('敏捷不会在敌方回合结束时自然消失', () => {
    const state = makeCombatState({
      playerStatusEffects: [{ type: 'agile', value: 2, remainingTurns: 1 }],
      enemy: makeEnemy({ energy: 0, currentEnergy: 0, handSize: 0 }),
    });

    const result = endTurn(state);

    expect(result.state.playerStatusEffects).toContainEqual({ type: 'agile', value: 2, remainingTurns: 1 });
  });

  it('敏捷触发后只消耗1层', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const enemyCard = {
      id: 'enemy_attack',
      name: '敌方攻击',
      cost: 1,
      type: 'attack' as const,
      effect: { damage: 6 },
      description: '',
    };
    const state = makeCombatState({
      playerStatusEffects: [{ type: 'agile', value: 3, remainingTurns: 1 }],
      enemy: makeEnemy({ energy: 1, currentEnergy: 1, drawPile: [enemyCard], handSize: 1 }),
    });

    const result = endTurn(state);

    expect(result.state.playerStatusEffects).toContainEqual({ type: 'agile', value: 2, remainingTurns: 1 });
  });

  it('敏捷判定失败时受到伤害并消耗1层', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const enemyCard = {
      id: 'enemy_attack',
      name: '敌方攻击',
      cost: 1,
      type: 'attack' as const,
      effect: { damage: 6 },
      description: '',
    };
    const state = makeCombatState({
      playerStatusEffects: [{ type: 'agile', value: 1, remainingTurns: 1 }],
      enemy: makeEnemy({ energy: 1, currentEnergy: 1, drawPile: [enemyCard], handSize: 1 }),
    });

    const result = endTurn(state);

    expect(result.enemyDamage).toBe(6);
    expect(result.state.playerHp).toBe(14);
    expect(result.state.playerStatusEffects.some(status => status.type === 'agile')).toBe(false);
  });

  it('armorScale 按当前护甲追加伤害', () => {
    disableCrit();
    const card = makeAttackCard({ effect: { damage: 4, armorScale: 0.5 } });
    const state = makeCombatState({ playerArmor: 10, enemy: makeEnemy({ currentHp: 30 }) });

    const { result, newState } = executeBattleAction(makeAction({ card, characterId: 'taichimonk' }), state);

    expect(result.playerDamageDealt).toBe(9);
    expect(newState.enemy.currentHp).toBe(21);
  });

  it('带护甲的 armorScale 先获得护甲再追加伤害', () => {
    disableCrit();
    const card = makeAttackCard({ effect: { damage: 4, armor: 6, armorScale: 0.5 } });
    const state = makeCombatState({ playerArmor: 10, enemy: makeEnemy({ currentHp: 30 }) });

    const { result, newState } = executeBattleAction(makeAction({ card, characterId: 'taichimonk' }), state);

    expect(result.playerArmorGained).toBe(6);
    expect(result.playerDamageDealt).toBe(12);
    expect(newState.enemy.currentHp).toBe(18);
  });

  it('格斗大师多段攻击逐段获得连击并用于后续段数', () => {
    disableCrit();
    const card = makeAttackCard({ effect: { damage: 3, damageMultiplier: 2 } });
    const state = makeCombatState({
      enemy: makeEnemy({ currentHp: 30 }),
      playerStatusEffects: [{ type: 'combo', value: 2, remainingTurns: 1 }],
    });

    const { result, newState } = executeBattleAction(makeAction({ card, characterId: 'combatmaster' }), state);

    expect(result.playerDamageDealt).toBe(11);
    expect(newState.enemy.currentHp).toBe(19);
    expect(newState.playerStatusEffects).toContainEqual({ type: 'combo', value: 4, remainingTurns: 1 });
    expect(newState.playerAttackHits?.[state.enemy.instanceId]).toEqual([5, 6]);
  });

  it('格斗大师后续攻击吃已有连击并继续增加连击', () => {
    disableCrit();
    const card = makeAttackCard({ effect: { damage: 4 } });
    const state = makeCombatState({
      enemy: makeEnemy({ currentHp: 30 }),
      playerStatusEffects: [{ type: 'combo', value: 3, remainingTurns: 1 }],
    });

    const { result, newState } = executeBattleAction(makeAction({ card, characterId: 'combatmaster' }), state);

    expect(result.playerDamageDealt).toBe(7);
    expect(newState.enemy.currentHp).toBe(23);
    expect(newState.playerStatusEffects).toContainEqual({ type: 'combo', value: 4, remainingTurns: 1 });
  });

  it('非格斗大师多段攻击不重复吃强化层数', () => {
    disableCrit();
    const card = makeAttackCard({ effect: { damage: 3, damageMultiplier: 2 } });
    const state = makeCombatState({
      enemy: makeEnemy({ currentHp: 30 }),
      playerStatusEffects: [{ type: 'empower', value: 2, remainingTurns: 1 }],
    });

    const { result, newState } = executeBattleAction(makeAction({ card, characterId: 'generic' }), state);

    expect(result.playerDamageDealt).toBe(8);
    expect(newState.enemy.currentHp).toBe(22);
  });

  it('脆弱会提高玩家攻击伤害', () => {
    disableCrit();
    const card = makeAttackCard({ effect: { damage: 4 } });
    const state = makeCombatState({
      enemy: makeEnemy({ currentHp: 30, statusEffects: [{ type: 'fragile', value: 3, remainingTurns: 2 }] }),
    });

    const { result, newState } = executeBattleAction(makeAction({ card, characterId: 'generic' }), state);

    expect(result.playerDamageDealt).toBe(7);
    expect(newState.enemy.currentHp).toBe(23);
  });

  it('玩家回合结束清空连击状态', () => {
    const state = makeCombatState({
      playerStatusEffects: [{ type: 'combo', value: 4, remainingTurns: 1 }],
      enemy: makeEnemy({ energy: 0, currentEnergy: 0, handSize: 0 }),
    });

    const result = endTurn(state);

    expect(result.state.playerStatusEffects.some(status => status.type === 'combo')).toBe(false);
  });

  it('冻结判定失败时敌人正常行动并清除冻结层数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const enemyCard = {
      id: 'enemy_attack',
      name: '敌方攻击',
      cost: 1,
      type: 'attack' as const,
      effect: { damage: 6 },
      description: '',
    };
    const state = makeCombatState({
      enemy: makeEnemy({
        energy: 1,
        currentEnergy: 1,
        drawPile: [enemyCard],
        handSize: 1,
        statusEffects: [{ type: 'freeze', value: 50, remainingTurns: 1 }],
      }),
    });

    const result = endTurn(state);

    expect(result.freezeSkips).toBe(0);
    expect(result.state.enemy.statusEffects.find(status => status.type === 'freeze')).toBeUndefined();
    expect(result.enemyDamage).toBe(6);
  });

  it('冻结判定成功时敌人跳过行动并清除冻结层数', () => {
    const enemyCard = {
      id: 'enemy_attack',
      name: '敌方攻击',
      cost: 1,
      type: 'attack' as const,
      effect: { damage: 6 },
      description: '',
    };
    const oldInPlay = { ...enemyCard, id: 'old_in_play', name: '上回合攻击' };
    const state = makeCombatState({
      enemy: makeEnemy({
        energy: 1,
        currentEnergy: 1,
        drawPile: [enemyCard],
        discard: [],
        inPlay: [oldInPlay],
        handSize: 1,
        statusEffects: [{ type: 'freeze', value: 35, remainingTurns: 1 }],
      }),
    });

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = endTurn(state);

    expect(result.enemyDamage).toBe(0);
    expect(result.freezeSkips).toBe(1);
    expect(result.state.playerHp).toBe(20);
    expect(result.state.enemy.statusEffects.find(status => status.type === 'freeze')).toBeUndefined();
    expect(result.state.enemy.hand).toHaveLength(0);
    expect(result.state.enemy.discard.some(card => card.id === 'old_in_play')).toBe(true);
    expect(result.messages.some(message => message.includes('被冻结'))).toBe(true);
  });

  it('非行动怪会把上回合 inPlay 归入弃牌堆', () => {
    const enemyCard = {
      id: 'enemy_attack',
      name: '敌方攻击',
      cost: 1,
      type: 'attack' as const,
      effect: { damage: 6 },
      description: '',
    };
    const waitingInPlay = { ...enemyCard, id: 'waiting_in_play', name: '等待怪上回合攻击' };
    const state = makeCombatState({
      enemy: makeEnemy({ instanceId: 'acting', energy: 0, currentEnergy: 0, handSize: 0 }),
      extraEnemies: [makeEnemy({
        instanceId: 'waiting',
        energy: 0,
        currentEnergy: 0,
        handSize: 0,
        inPlay: [waitingInPlay],
        discard: [],
      })],
      currentEnemyIndex: 0,
    });

    const result = endTurn(state);
    const waitingEnemy = result.state.extraEnemies.find(enemy => enemy.instanceId === 'waiting');

    expect(waitingEnemy?.inPlay).toHaveLength(0);
    expect(waitingEnemy?.discard.some(card => card.id === 'waiting_in_play')).toBe(true);
  });

  it('冻结跳过行动时仍会衰减其他敌方状态', () => {
    const state = makeCombatState({
      enemy: makeEnemy({
        energy: 1,
        currentEnergy: 1,
        handSize: 1,
        statusEffects: [
          { type: 'freeze', value: 100, remainingTurns: 1 },
          { type: 'poison', value: 1, remainingTurns: 2 },
        ],
      }),
    });

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = endTurn(state);

    expect(result.state.enemy.statusEffects.find(status => status.type === 'freeze')).toBeUndefined();
    expect(result.state.enemy.statusEffects).toContainEqual({ type: 'poison', value: 1, remainingTurns: 1 });
  });
});

// ================================================================
// 测试：狂战士血怒/狂暴机制
// ================================================================
describe('狂战士血怒机制', () => {
  it('玩家出攻击牌立即累积怒气，未满100时不进入狂暴', () => {
    const state = makeCombatState({ ragePoints: 0 });
    const card = makeAttackCard({ effect: { damage: 6 } });
    const action = makeAction({ card, characterId: 'armorbreaker' });

    const { newState } = executeBattleAction(action, state);

    expect(newState.ragePoints).toBe(15);
    expect(newState.playerStatusEffects.find(s => s.type === 'berserk')).toBeUndefined();
  });

  it('玩家怒气满100时，本次攻击立即进入狂暴并享受吸血', () => {
    disableCrit();
    const state = makeCombatState({ ragePoints: 90, playerHp: 10, playerMaxHp: 20 });
    const card = makeAttackCard({ effect: { damage: 10 } });
    const action = makeAction({ card, characterId: 'armorbreaker' });

    const { newState, result } = executeBattleAction(action, state);

    // 90 + 15 = 105 >= 100，立即进入狂暴，怒气清零
    expect(newState.ragePoints).toBe(0);
    expect(newState.playerStatusEffects.find(s => s.type === 'berserk')).toBeDefined();
    // 本次攻击造成的伤害应立即触发30%吸血（10点伤害 -> 至少回3点血）
    expect(result.playerHealReceived).toBeGreaterThan(0);
    expect(newState.playerHp).toBeGreaterThan(10);
  });

  it('狂暴状态期间打出攻击牌不再累积怒气', () => {
    const state = makeCombatState({
      ragePoints: 50,
      playerStatusEffects: [{ type: 'berserk', value: 1, remainingTurns: 2 }],
    });
    const card = makeAttackCard({ effect: { damage: 6 } });
    const action = makeAction({ card, characterId: 'armorbreaker' });

    const { newState } = executeBattleAction(action, state);

    // 已处于狂暴状态，怒气不应变化
    expect(newState.ragePoints).toBe(50);
  });

  it('敌人攻击玩家后立即累积怒气（回合结束前）', () => {
    const enemyCard = {
      id: 'enemy_hit',
      name: '打击',
      cost: 1,
      type: 'attack' as const,
      effect: { damage: 6 },
      description: '',
    };
    const state = makeCombatState({
      ragePoints: 0,
      enemy: makeEnemy({
        energy: 1,
        currentEnergy: 1,
        handSize: 1,
        drawPile: [enemyCard],
      }),
    });

    const result = endTurn(state, 'zh', 'armorbreaker');

    expect(result.state.ragePoints).toBe(10);
  });

  it('敌人多次攻击使怒气累计满100时，立即进入狂暴并停止继续累积', () => {
    const enemyCard = {
      id: 'enemy_hit',
      name: '打击',
      cost: 0,
      type: 'attack' as const,
      effect: { damage: 1 },
      description: '',
    };
    const state = makeCombatState({
      ragePoints: 95,
      playerHp: 50,
      playerMaxHp: 50,
      enemy: makeEnemy({
        energy: 3,
        currentEnergy: 3,
        handSize: 3,
        drawPile: [enemyCard, enemyCard, enemyCard],
      }),
    });

    const result = endTurn(state, 'zh', 'armorbreaker');

    // 95 + 10(第一次受击) = 105 >= 100，立即进入狂暴并清零，后续受击不再累积
    expect(result.state.ragePoints).toBe(0);
    expect(result.state.playerStatusEffects.find(s => s.type === 'berserk')).toBeDefined();
  });

  it('狂暴状态结束后，怒气应从0/100重新开始（衰减逻辑不影响ragePoints字段本身）', () => {
    // 狂暴状态到期后由 decayStatusEffects 自然移除，ragePoints 在其存续期间已被清零锁定，
    // 状态移除后下一次受击/出牌会重新从0开始累积。
    const state = makeCombatState({
      ragePoints: 0,
      playerStatusEffects: [],
    });
    const card = makeAttackCard({ effect: { damage: 6 } });
    const action = makeAction({ card, characterId: 'armorbreaker' });

    const { newState } = executeBattleAction(action, state);

    expect(newState.ragePoints).toBe(15);
  });
});
