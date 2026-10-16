import { describe, it, expect } from 'vitest';
import {
  executeBattleAction,
  endTurn,
  type BattleAction,
} from './BattleSystem';
import { getStarterSkills } from './RunManager';
import type { CombatState, EnemyInstance, SkillCard } from '../types/game';
import type { CharacterClass } from '../types/game';

// ================================================================
// 简易战斗模拟器
// ================================================================

/** 洗牌 (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 抽牌 */
function draw(deck: SkillCard[], hand: SkillCard[], discard: SkillCard[], count: number, limit: number) {
  let d = [...deck];
  let h = [...hand];
  let disc = [...discard];
  let drawn = 0;
  for (let i = 0; i < count && h.length < limit; i++) {
    if (d.length === 0) {
      d = shuffle(disc);
      disc = [];
    }
    if (d.length === 0) break;
    h.push(d.shift()!);
    drawn++;
  }
  return { deck: d, hand: h, discard: disc, drawn };
}

function makeEnemy(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
  const damage = overrides.damage ?? 8;
  const smash = { id: 'dummy_smash', name: '猛击', cost: 1, type: 'attack' as const, effect: { damage }, description: `造成${damage}点伤害` };
  return {
    id: 'training_dummy',
    instanceId: 'dummy_1',
    name: '训练木桩',
    hp: 50,
    currentHp: 50,
    currentEnergy: 3,
    armor: 0,
    damage,
    energy: 3,
    tier: 'normal',
    statusEffects: [],
    description: '训练用木桩',
    deck: [smash],
    drawPile: [smash],
    hand: [],
    discard: [],
    inPlay: [],
    handSize: 3,
    rewards: { exp: 10, gold: 10, cardRarity: 'white' },
    area: 'forest',
    ...overrides,
  };
}

const ALL_CHARACTERS = [
  'ironwall', 'shadowblade', 'lifesage', 'taichimonk', 'holylight',
  'undeadpriest', 'armorbreaker', 'elementmage', 'omnisage',
  'combatmaster', 'frostpriest', 'thornguardian', 'wealthmerchant', 'devourer',
] as CharacterClass[];

const CHARACTER_LABEL: Record<string, string> = {
  ironwall: '铁壁守卫', shadowblade: '影刃刺客', lifesage: '生命贤者',
  taichimonk: '太极武僧', holylight: '圣光使者', undeadpriest: '亡灵祭司',
  armorbreaker: '狂战士', elementmage: '元素法师', omnisage: '博学士',
  combatmaster: '格斗大师', frostpriest: '冰霜祭司', thornguardian: '刺卫',
  wealthmerchant: '富商', devourer: '吞噬者',
};

interface SimOptions {
  enemyHp: number;
  enemyDamage: number;
  maxTurns: number;
  simulations: number;
  /** 0=随机, 1=仅攻击, 2=智能 */
  strategy: number;
}

interface SimResult {
  wins: number;
  totalTurns: number;
  totalCardsPlayed: number;
  finalPlayerHpList: number[];
  totalDamageDealt: number;
  enemyDefeatedTurns: number[];
}

function simulateCharacter(charId: CharacterClass, opts: SimOptions): SimResult {
  let wins = 0;
  let totalTurns = 0;
  let totalCardsPlayed = 0;
  const finalPlayerHpList: number[] = [];
  let totalDamageDealt = 0;
  const enemyDefeatedTurns: number[] = [];

  for (let sim = 0; sim < opts.simulations; sim++) {
    const starterDeck = getStarterSkills(charId);
    const deck = shuffle(starterDeck);
    const limit = 8;
    const baseMaxHp = 50;
    const maxEnergy = 5;

    // 初始抽牌
    const draw1 = draw(deck, [], [], limit, limit);
    let state: CombatState = {
      playerHp: baseMaxHp,
      playerMaxHp: baseMaxHp,
      playerEnergy: maxEnergy,
      playerMaxEnergy: maxEnergy,
      playerArmor: 0,
      playerStatusEffects: [],
      enemy: makeEnemy({ hp: opts.enemyHp, currentHp: opts.enemyHp, damage: opts.enemyDamage }),
      extraEnemies: [],
      currentEnemyIndex: 0,
      defeatedEnemies: [],
      hand: draw1.hand,
      deck: draw1.deck,
      discard: draw1.discard,
      exhausted: [],
      playerInPlay: [],
      handLimit: limit,
      drawPerTurn: 4,
      turnNumber: 0,
      playedCardTypesThisTurn: [],
      newlyDrawnIndexes: [],
    };
    let turn = 0;
    let cardsPlayed = 0;
    let damageDealt = 0;
    const maxTurns = opts.maxTurns;

    for (turn = 1; turn <= maxTurns; turn++) {
      state = { ...state, turnNumber: turn, playerEnergy: state.playerMaxEnergy,
        playedCardTypesThisTurn: [] };

      // ---- 玩家回合：出牌 ----
      let energy = state.playerMaxEnergy;

      while (true) {
        const hand = state.hand; // 直接引用 state.hand

        // 可选卡牌：0 cost到当前能量
        const playable = hand.filter(c => c.cost <= energy && c.cost >= 0);
        if (playable.length === 0) break;

        const hpRatio = state.playerHp / state.playerMaxHp;

        // AI选牌：按类型优先级
        let chosen: SkillCard | null = null;
        for (const c of playable) {
          const dmg = c.effect.damage ?? 0;
          const heal = c.effect.heal ?? 0;
          const armor = c.effect.armor ?? 0;
          if (dmg > 0 && c.type === 'attack') { chosen = c; break; }
          if (heal > 0 && hpRatio < 0.7) { chosen = c; break; }
          if (armor > 0 && (hpRatio < 0.5 || energy >= 3)) { chosen = c; break; }
          if (c.type !== 'defense') { chosen = c; break; }
        }
        if (!chosen) {
          // 选最便宜的
          chosen = playable.reduce((a, b) => a.cost <= b.cost ? a : b);
        }

        const handIdx = hand.indexOf(chosen);
        if (handIdx < 0) break;

        const targetEnemy = state.enemy.currentHp > 0 ? state.enemy : (state.extraEnemies?.[0] ?? state.enemy);
        const action: BattleAction = {
          card: JSON.parse(JSON.stringify(chosen)),
          targetId: targetEnemy.instanceId,
          handIndex: handIdx,
          blessingActive: false,
          goldAvailable: 999,
          passiveDamageBonus: 0,
          passiveFlatDamageBonus: 0,
          characterId: charId,
        };

        const { result, newState } = executeBattleAction(action, state);
        state = newState;
        energy = state.playerEnergy;
        damageDealt += result.playerDamageDealt;
        cardsPlayed++;

        const aliveEnemies = [state.enemy, ...(state.extraEnemies ?? [])].filter(e => e.currentHp > 0);
        if (aliveEnemies.length === 0) break;
      }

      // 出完牌 → 剩余手牌进弃牌堆
      const remainingHand = state.hand;
      state = {
        ...state,
        discard: [...state.discard, ...remainingHand],
        hand: [],
      };

      // ---- 结束回合（敌人行动） ----
      const endResult = endTurn(state, undefined, charId);
      state = endResult.state;

      if (state.playerHp <= 0) break;

      const aliveNow = [state.enemy, ...(state.extraEnemies ?? [])].filter(e => e.currentHp > 0);
      if (aliveNow.length === 0) {
        enemyDefeatedTurns.push(turn);
        break;
      }

      // ---- 抽牌 ----
      const drawResult = draw(state.deck, state.hand, state.discard, state.drawPerTurn, state.handLimit);
      state = { ...state, ...drawResult, newlyDrawnIndexes: [] };
    }

    const aliveNow = [state.enemy, ...(state.extraEnemies ?? [])].filter(e => e.currentHp > 0);
    if (state.playerHp > 0 && aliveNow.length === 0) wins++;

    totalTurns += Math.min(turn, maxTurns);
    totalCardsPlayed += cardsPlayed;
    finalPlayerHpList.push(state.playerHp);
    totalDamageDealt += damageDealt;
  }

  return { wins, totalTurns, totalCardsPlayed, finalPlayerHpList, totalDamageDealt, enemyDefeatedTurns };
}

// ================================================================
// 基准测试
// ================================================================

const SIM_COUNT = 300;  // 每个角色跑300场
const ENEMY_HP = 45;
const ENEMY_DMG = 6;
const MAX_TURNS = 30;

interface BenchmarkEntry {
  id: string;
  label: string;
  winRate: number;
  avgTurns: number;
  avgCardsPerTurn: number;
  avgFinalHp: number;
  avgDmgPerCombat: number;
  avgDefeatTurn: number;
  score: number;
}

describe('角色强度基准测试', () => {
  it('角色强度排行榜（300场/角色）', () => {
    // 用 45HP / 6DMG 木桩，避免所有角色超时全0分，确保排行榜能区分输出与生存表现。
    const results: BenchmarkEntry[] = ALL_CHARACTERS.map(charId => {
      const r = simulateCharacter(charId, {
        enemyHp: ENEMY_HP,
        enemyDamage: ENEMY_DMG,
        maxTurns: MAX_TURNS,
        simulations: SIM_COUNT,
        strategy: 1,
      });

      const winRate = r.wins / SIM_COUNT;
      const avgTurns = r.totalTurns / SIM_COUNT;
      const avgCardsPerTurn = r.totalCardsPlayed / Math.max(1, r.totalTurns);
      const avgFinalHp = r.finalPlayerHpList.reduce((a, b) => a + b, 0) / SIM_COUNT;
      const avgDmg = r.totalDamageDealt / SIM_COUNT;
      const avgDefeatTurn = r.enemyDefeatedTurns.length > 0
        ? r.enemyDefeatedTurns.reduce((a, b) => a + b, 0) / r.enemyDefeatedTurns.length
        : MAX_TURNS;

      const damageScore = Math.min(20, (avgDmg / ENEMY_HP) * 20);
      const survivalScore = Math.max(0, (avgFinalHp / 50) * 10);
      const speedScore = winRate > 0 ? Math.max(0, 10 - avgDefeatTurn * 0.5) : 0;
      const score = winRate * 60 + damageScore + survivalScore + speedScore;

      expect(r.totalTurns).toBeGreaterThan(0);
      return { id: charId, label: CHARACTER_LABEL[charId] || charId, winRate, avgTurns, avgCardsPerTurn, avgFinalHp, avgDmgPerCombat: avgDmg, avgDefeatTurn, score };
    });

    expect(new Set(results.map((item) => item.score.toFixed(1))).size).toBeGreaterThan(1);
    expect(results.some((item) => item.winRate > 0)).toBe(true);

    results.sort((a, b) => b.score - a.score);

    // 输出排行榜
    const table: string[] = [];
    table.push('\n========================================');
    table.push('  角色强度基准测试结果');
    table.push(`  木桩: HP=${ENEMY_HP} 攻击=${ENEMY_DMG} 模拟=${SIM_COUNT}场/角色`);
    table.push('========================================\n');
    table.push('  排名  角色             胜率    均伤     均回合  均血量  得分');
    table.push('  ─────────────────────────────────────────────────────────────');
    results.forEach((r, i) => {
      const rank = (i + 1).toString().padStart(2);
      const name = r.label.padEnd(10);
      const wr = (r.winRate * 100).toFixed(1).padStart(5) + '%';
      const dmg = r.avgDmgPerCombat.toFixed(1).padStart(7);
      const turns = r.avgTurns.toFixed(1).padStart(6);
      const hp = r.avgFinalHp.toFixed(1).padStart(6);
      const score = r.score.toFixed(1).padStart(6);
      table.push(`  ${rank}  ${name}  ${wr}  ${dmg}  ${turns}  ${hp}  ${score}`);
    });
    table.push('========================================\n');
    console.log(table.join('\n'));
  });
});
