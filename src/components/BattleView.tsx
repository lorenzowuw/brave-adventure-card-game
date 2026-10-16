/**
 * 战斗界面 - 敌人信息 + 手牌 + 操作区
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { AppliedStatusEffect, CharacterConfig, CombatFxEvent, CombatState, EnemyCard, EnemyInstance, EnemyTurnStep, SkillCard } from '../types/game';
import { StatusBar } from './StatusBar';
import { CardComponent, getEffectText, getTooltipStyle } from './CardComponent';
import { BattleTutorial } from './BattleTutorial';
import { useTranslation } from '../i18n';
import { useLocalize } from '../i18n/data';
import { asset } from '../utils/assetUrl';
import { isDamageSkill } from '../utils/card';
import { AGILE_DODGE_CHANCE, DEVOUDER_CHARACTER_ID, DEVOUDER_PASSIVE_EXECUTE_THRESHOLD, getStatusValue } from '../systems/BattleSystem';
import { WEALTH_ACTIVE_ENERGY_COST, WEALTH_ACTIVE_MAX_GOLD_COST } from '../systems/RunManager';

type IntentType = 'attack' | 'defense' | 'skill';
type IntentSummary = {
  primary: IntentType | 'unknown';
  probabilities: Record<IntentType, number>;
  availableCount: number;
};

function getEnemyIntent(enemy: EnemyInstance): IntentSummary {
  const sourceHand = (enemy.hand?.length ?? 0) > 0
    ? enemy.hand
    : (enemy.drawPile ?? []).slice(0, Math.max(1, enemy.handSize ?? 1));
  const affordable = sourceHand.filter(card => card.cost <= enemy.currentEnergy);
  const cards = affordable.length > 0 ? affordable : sourceHand;
  const counts: Record<IntentType, number> = { attack: 0, defense: 0, skill: 0 };

  for (const card of cards) {
    if (card.effect.damage || card.effect.damageToAll) counts.attack += 1;
    else if (card.effect.armor) counts.defense += 1;
    else counts.skill += 1;
  }

  const total = counts.attack + counts.defense + counts.skill;
  if (total === 0) return { primary: 'unknown', probabilities: { attack: 0, defense: 0, skill: 0 }, availableCount: 0 };
  const attackPct = Math.floor((counts.attack / total) * 100);
  const defensePct = Math.floor((counts.defense / total) * 100);
  const probabilities = {
    attack: attackPct,
    defense: defensePct,
    skill: Math.max(0, 100 - attackPct - defensePct),
  };
  const primary = (Object.entries(counts) as Array<[IntentType, number]>).reduce<IntentType>(
    (best, [type, count]) => count > counts[best] ? type : best,
    'attack',
  );

  return { primary, probabilities, availableCount: affordable.length };
}

const INTENT_ICONS: Record<IntentType | 'unknown', string> = {
  attack: '⚔️',
  defense: '🛡️',
  skill: '✦',
  unknown: '?',
};

function EnemyIntentBadge({ enemy, turnNumber }: { enemy: EnemyInstance; turnNumber: number }) {
  const { t } = useTranslation();
  // 意图只在回合开始时计算一次，敌人本回合出牌导致手牌变化不重新计算，直到下一回合才刷新
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const intent = useMemo(() => getEnemyIntent(enemy), [enemy.instanceId, turnNumber]);
  const label = intent.primary === 'unknown' ? t('enemy.intent.unknown') : t(`enemy.intent.${intent.primary}`);
  const tooltip = intent.primary === 'unknown'
    ? t('enemy.intent.unknownTooltip')
    : t('enemy.intent.tooltip', {
      attack: intent.probabilities.attack,
      defense: intent.probabilities.defense,
      skill: intent.probabilities.skill,
    });

  return (
    <div className="enemy-intent-badge" title={tooltip}>
      <span className="intent-main">{INTENT_ICONS[intent.primary]} {label}</span>
      {intent.primary !== 'unknown' && (
        <span className="intent-prob-row">
          <span>{INTENT_ICONS.attack} {intent.probabilities.attack}%</span>
          <span>{INTENT_ICONS.defense} {intent.probabilities.defense}%</span>
          <span>{INTENT_ICONS.skill} {intent.probabilities.skill}%</span>
        </span>
      )}
    </div>
  );
}

/** Boss 使用精细手绘（assets/bosses/），其余怪统一用 assets/encounters/{id}.png */
const BOSS_IMAGES: Record<string, string> = {
  boss_tree_king: asset('assets/bosses/tree_king.png'),
  boss_ruins_watcher: asset('assets/bosses/ruins_watcher.png'),
  boss_flame_lord: asset('assets/bosses/flame_lord.png'),
  boss_frost_dragon: asset('assets/bosses/frost_dragon.png'),
  boss_chaos_lord: asset('assets/bosses/chaos_lord.png'),
};

function getEnemyImage(id: string): string {
  return BOSS_IMAGES[id] ?? asset(`assets/encounters/${id}.png`);
}

interface Props {
  combat: CombatState;
  character: CharacterConfig;
  level: number;
  exp: number;
  expNext: number;
  gold: number;
  onPlayCard: (handIndex: number, targetId: string) => void;
  onEndTurn: () => void;
  onActiveSkill?: (targetId: string) => void;
  locked?: boolean;
  enemyReveal?: EnemyTurnStep['reveal'];
}

function getStatusTooltip(effect: AppliedStatusEffect, t: (key: string, params?: Record<string, string | number>) => string): string {
  const chance = effect.type === 'agile' ? AGILE_DODGE_CHANCE : 0;
  return t('status.tooltip.' + effect.type, { stacks: effect.value, turns: effect.remainingTurns, chance });
}


function StatusFxLayer({ events, target, enemyId }: { events: CombatFxEvent[]; target: 'player' | 'enemy'; enemyId?: string }) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const visibleEvents = events.filter(event => event.target === target && (!enemyId || event.enemyId === enemyId) && !hidden.has(event.id));
  if (visibleEvents.length === 0) return null;

  return (
    <div className="status-fx-layer" aria-hidden="true">
      {visibleEvents.map(event => (
        <span
          key={event.id}
          className={`status-fx-burst fx-${event.type}`}
          onAnimationEnd={() => setHidden(prev => {
            const next = new Set(prev);
            next.add(event.id);
            return next;
          })}
        />
      ))}
    </div>
  );
}

function getStatusText(effect: AppliedStatusEffect, t: (key: string, params?: Record<string, string | number>) => string): string {
  const name = t('status.' + effect.type);
  // 冻结/麻痹/敏捷/回响/连击是层数消耗型状态，不显示回合数，只显示层数
  const stackOnly = effect.type === 'freeze' || effect.type === 'paralyze' || effect.type === 'agile' || effect.type === 'echo' || effect.type === 'combo';
  if (stackOnly) {
    return `${name} ${effect.value}${t('status.stacks')}`;
  }
  // 狂暴只显示回合数（层数无意义）
  if (effect.type === 'berserk') {
    return `${name} ${effect.remainingTurns}${t('battle.turns')}`;
  }
  if (effect.type === 'armor') {
    return `${name} ${effect.value}% · ${effect.remainingTurns}${t('battle.turns')}`;
  }
  return `${name} ${effect.value}${t('status.stacks')} · ${effect.remainingTurns}${t('battle.turns')}`;
}

function StatusList({ effects, emptyText, radiance = 0, rage = 0, showRage = false, fxEvents = [] }: { effects: AppliedStatusEffect[]; emptyText: string; radiance?: number; rage?: number; showRage?: boolean; fxEvents?: CombatFxEvent[] }) {
  const { t } = useTranslation();
  const isBerserk = effects.some(e => e.type === 'berserk');
  // 狂战士狂暴期间怒气条由狂暴药丸取代；非狂暴时即使怒气为0也显示怒气条
  const renderRage = showRage && !isBerserk;
  if (effects.length === 0 && radiance <= 0 && !renderRage) return <div className="status-empty">{emptyText}</div>;
  const radianceText = `${t('status.radiance')} ${radiance}${t('status.stacks')}`;
  const radianceTooltip = t('status.tooltip.radiance', { stacks: radiance });
  const rageText = `${t('status.rage')} ${rage}/100`;
  const rageTooltip = t('status.tooltip.rage', { stacks: rage });
  return (
    <div className="battle-status-list">
      {renderRage && (
        <span className="battle-status status-rage">
          {rageText}
          <span className="battle-status-tooltip">{rageTooltip}</span>
        </span>
      )}
      {radiance > 0 && (
        <span className="battle-status status-radiance">
          {radianceText}
          <span className="battle-status-tooltip">{radianceTooltip}</span>
        </span>
      )}
      {effects.map((effect, idx) => {
        const triggered = fxEvents.some(event => event.type === effect.type || (event.type === 'dodge' && effect.type === 'agile'));
        return (
          <span className={`battle-status status-${effect.type}${triggered ? ' status-fx-triggered' : ''}`} key={`${effect.type}-${effect.value}-${effect.remainingTurns}-${idx}`}>
            {getStatusText(effect, t)}
            <span className="battle-status-tooltip">{getStatusTooltip(effect, t)}</span>
          </span>
        );
      })}
    </div>
  );
}

/** 多段攻击每段打击特效的间隔（ms） */
const MULTI_HIT_INTERVAL_MS = 180;
const PLAYER_DRAW_REVEAL_MS = 130;
const HAND_SHIFT_ANIMATION_MS = 260;

/** 怪牌专属配图：/assets/skill_icons/enemy/{cardId}.svg */
function getEnemyCardIcon(cardId: string): string {
  return asset(`assets/skill_icons/enemy/${cardId}.svg`);
}

/** 把 EnemyCard 适配成 CardComponent/getEffectText 可用的最小 SkillCard 形态 */
function enemyCardToSkill(card: EnemyCard): SkillCard {
  return {
    id: card.id,
    name: card.name,
    name_en: card.name_en,
    tier: 1,
    rarity: 'white',
    cost: card.cost,
    type: card.type,
    effect: card.effect,
    description: card.description,
    description_en: card.description_en,
    upgradeTo: null,
    characterBind: 'generic',
    flavorText: '',
  } as SkillCard;
}

/** 中部舞台：怪牌正面渲染，UI 与玩家牌一致（费用/名字/效果），红框区分来向，hover 浮空展示效果 */
function EnemyCardFace({ card }: { card: EnemyCard }) {
  const { t, lang } = useTranslation();
  const loc = useLocalize();
  const skill = enemyCardToSkill(card);
  const effectText = getEffectText(skill, t, lang, true);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties | null>(null);

  const showTooltip = () => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipStyle(getTooltipStyle(rect));
  };
  const hideTooltip = () => setTooltipStyle(null);

  return (
    <div
      ref={cardRef}
      className="rpg-card enemy-face-card"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      tabIndex={0}
    >
      <div className="card-rarity-shine" style={{ background: 'linear-gradient(135deg, #e74c3c22, transparent, #e74c3c11)' }} />
      <span className="card-cost">{card.cost}⚡</span>
      <div className="card-art-area">
        <img
          src={getEnemyCardIcon(card.id)}
          alt={loc.n(skill)}
          className="card-skill-icon"
          onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
        />
      </div>
      <strong className="card-name">{loc.n(skill)}</strong>
      <p className="card-desc">{effectText}</p>
      {tooltipStyle && createPortal(
        <div className="card-tooltip" role="tooltip" style={tooltipStyle}>
          <strong>{loc.n(skill)}</strong>
          <span>{effectText}</span>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** 牌堆缩略：用怪牌背叠放渲染——横向(牌库/弃牌堆)或纵向(手牌) */
function PileBacks({ count, orientation }: { count: number; orientation: 'h' | 'v' }) {
  const shown = Math.min(5, count);
  return (
    <div className={`pile-backs ${orientation === 'v' ? 'pile-backs-v' : 'pile-backs-h'}`}>
      {Array.from({ length: shown }).map((_, i) => (
        <img
          key={i}
          src={asset('assets/skill_icons/enemy/card_back.svg')}
          alt=""
          className="pile-back-card"
          style={{ '--pile-i': i } as CSSProperties}
          onError={(ev) => { (ev.target as HTMLImageElement).style.visibility = 'hidden'; }}
        />
      ))}
    </div>
  );
}

function hasAttackEffect(card: SkillCard): boolean {
  return isDamageSkill(card);
}

function hasDefenseEffect(card: SkillCard): boolean {
  return Boolean(card.effect.armor);
}

function estimatePlayerCardDamage(card: SkillCard, characterId?: string, playerStatusEffects: AppliedStatusEffect[] = []): number {
  const hits = Math.max(1, card.effect.damageMultiplier ?? 1);
  const baseDamage = card.effect.damage ?? 0;
  const comboStacks = characterId === 'combatmaster' ? getStatusValue(playerStatusEffects, 'combo') : 0;
  const hitDamage = baseDamage * hits + (comboStacks * hits) + (characterId === 'combatmaster' ? Math.max(0, hits - 1) * hits / 2 : 0);
  return Math.max(0, hitDamage + (card.effect.damageToAll ?? 0));
}

const enemyShakeAnimations = new WeakMap<HTMLElement, Animation>();

function replayAnimation(element: HTMLElement | null, className: string, duration = 420) {
  if (!element) return;
  if (className === 'combatant-shake' && element.classList.contains('enemy-card')) {
    enemyShakeAnimations.get(element)?.cancel();
    const scale = getComputedStyle(element).getPropertyValue('--enemy-scale').trim() || '1';
    const shakeDuration = Math.min(duration, 240);
    const animation = element.animate(
      [
        { transform: `translateX(0) scale(${scale})` },
        { transform: `translateX(-3px) scale(${scale})`, offset: 0.16 },
        { transform: `translateX(3px) scale(${scale})`, offset: 0.32 },
        { transform: `translateX(-2px) scale(${scale})`, offset: 0.48 },
        { transform: `translateX(2px) scale(${scale})`, offset: 0.64 },
        { transform: `translateX(-1px) scale(${scale})`, offset: 0.8 },
        { transform: `translateX(0) scale(${scale})` },
      ],
      { duration: shakeDuration, easing: 'ease-out' },
    );
    enemyShakeAnimations.set(element, animation);
    animation.addEventListener('finish', () => {
      if (enemyShakeAnimations.get(element) === animation) enemyShakeAnimations.delete(element);
    }, { once: true });
    return;
  }
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), duration);
}

export function BattleView({ combat, character, level, exp, expNext, gold, onPlayCard, onEndTurn, onActiveSkill, locked, enemyReveal }: Props) {
  const { t, lang } = useTranslation();
  const loc = useLocalize();
  const allEnemies = [combat.enemy, ...(combat.extraEnemies ?? [])];
  const [dyingEnemies, setDyingEnemies] = useState<EnemyInstance[]>([]);
  const aliveEnemies = allEnemies.filter(e => e.currentHp > 0);
  const visibleEnemies = [
    ...allEnemies.filter(e => e.currentHp > 0 || !combat.defeatedEnemies.some(defeated => defeated.instanceId === e.instanceId)),
    ...dyingEnemies.filter(dying => !allEnemies.some(enemy => enemy.instanceId === dying.instanceId)),
  ];
  const [selectedTargetId, setSelectedTargetId] = useState(aliveEnemies[0]?.instanceId ?? combat.enemy.instanceId);
  const playerCardRef = useRef<HTMLDivElement | null>(null);
  const enemyCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // 跟踪上一帧 HP 用于受伤抖动检测
  const prevPlayerHpRef = useRef(combat.playerHp);
  const prevEnemyHpRef = useRef<Record<string, number>>({});
  // 血条分段掉落：动画期间覆盖显示值
  const [hpDisplayOverrides, setHpDisplayOverrides] = useState<Record<string, number>>({});
  const hpAnimTimersRef = useRef<number[]>([]);
  // 怪物牌堆统计（单怪场景取当前行动/首个怪），随回放快照动态更新
  const primaryEnemy = aliveEnemies[0];
  const enemyDrawCount = primaryEnemy?.drawPile?.length ?? 0;
  const enemyHandCount = primaryEnemy?.hand?.length ?? 0;
  const enemyDiscardCount = primaryEnemy?.discard?.length ?? 0;
  // 中部对战舞台：本回合双方打出的牌正面停留展示
  const [centerCards, setCenterCards] = useState<{ key: string; side: 'player' | 'enemy'; card: SkillCard | EnemyCard }[]>([]);
  const centerSeqRef = useRef(0);
  // 麻痹延迟动画：有麻痹时出牌动画延迟到知晓是否失效后再播
  const pendingParalyzePlayRef = useRef<{ centerKey: string; card: SkillCard; attack: boolean; defense: boolean; snapshot: { instanceId: string; armor: number }[] } | null>(null);
  const prevPlayerArmorRef = useRef(combat.playerArmor);
  const prevEnemyArmorRef = useRef<Record<string, number>>({});
  const [playerArmorDelta, setPlayerArmorDelta] = useState<'gain' | 'loss' | null>(null);
  const [enemyArmorDelta, setEnemyArmorDelta] = useState<Record<string, 'gain' | 'loss'>>({});
  const previousHandRef = useRef<SkillCard[]>(combat.hand);
  const initialHandRevealRef = useRef(combat.hand.length > 0);
  const revealingHandRef = useRef(false);
  const revealedDrawKeyRef = useRef('');
  const handCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const handCardRectsRef = useRef<DOMRect[]>([]);
  const previousVisibleHandCountRef = useRef(0);
  const handShiftTimersRef = useRef<number[]>([]);
  const [visibleHandCount, setVisibleHandCount] = useState(() => (combat.hand.length > 0 ? 0 : combat.hand.length));
  const [revealingDrawnIndexes, setRevealingDrawnIndexes] = useState<number[]>([]);
  const [skillTipVisible, setSkillTipVisible] = useState(false);
  const [playedOverflowOpen, setPlayedOverflowOpen] = useState(false);
  const drawSourceEmpty = combat.deck.length + combat.discard.length === 0;

  // 清理 HP 分段动画定时器
  useEffect(() => () => {
    hpAnimTimersRef.current.forEach(id => window.clearTimeout(id));
    hpAnimTimersRef.current = [];
    handShiftTimersRef.current.forEach(id => window.clearTimeout(id));
    handShiftTimersRef.current = [];
  }, []);
  useEffect(() => {
    if (!aliveEnemies.some(enemy => enemy.instanceId === selectedTargetId)) {
      setSelectedTargetId(aliveEnemies[0]?.instanceId ?? combat.enemy.instanceId);
    }
  }, [aliveEnemies.map(enemy => enemy.instanceId).join('|'), selectedTargetId, combat.enemy.instanceId]);

  useEffect(() => {
    const nextDyingEnemies = combat.defeatedEnemies.filter(defeated => allEnemies.every(enemy => enemy.instanceId !== defeated.instanceId));
    if (nextDyingEnemies.length === 0) return;
    setDyingEnemies(prev => {
      const knownIds = new Set(prev.map(enemy => enemy.instanceId));
      const added = nextDyingEnemies.filter(enemy => !knownIds.has(enemy.instanceId));
      return added.length > 0 ? [...prev, ...added] : prev;
    });
    const timer = window.setTimeout(() => {
      const removeIds = new Set(nextDyingEnemies.map(enemy => enemy.instanceId));
      setDyingEnemies(prev => prev.filter(enemy => !removeIds.has(enemy.instanceId)));
    }, 760);
    return () => window.clearTimeout(timer);
  }, [combat.defeatedEnemies, allEnemies.map(enemy => enemy.instanceId).join('|')]);

  useEffect(() => {
    const previousArmor = prevPlayerArmorRef.current;
    if (combat.playerArmor === previousArmor) return;
    setPlayerArmorDelta(combat.playerArmor > previousArmor ? 'gain' : 'loss');
    prevPlayerArmorRef.current = combat.playerArmor;
    const timer = window.setTimeout(() => setPlayerArmorDelta(null), 520);
    return () => window.clearTimeout(timer);
  }, [combat.playerArmor]);

  useEffect(() => {
    const nextDelta: Record<string, 'gain' | 'loss'> = {};
    visibleEnemies.forEach((enemy) => {
      const previousArmor = prevEnemyArmorRef.current[enemy.instanceId] ?? enemy.armor;
      if (enemy.armor !== previousArmor) {
        nextDelta[enemy.instanceId] = enemy.armor > previousArmor ? 'gain' : 'loss';
      }
      prevEnemyArmorRef.current[enemy.instanceId] = enemy.armor;
    });
    if (Object.keys(nextDelta).length === 0) return;
    setEnemyArmorDelta(prev => ({ ...prev, ...nextDelta }));
    const timer = window.setTimeout(() => {
      setEnemyArmorDelta(prev => {
        const next = { ...prev };
        Object.keys(nextDelta).forEach(id => { delete next[id]; });
        return next;
      });
    }, 520);
    return () => window.clearTimeout(timer);
  }, [visibleEnemies.map(enemy => `${enemy.instanceId}:${enemy.armor}`).join('|')]);

  useLayoutEffect(() => {
    handShiftTimersRef.current.forEach(id => window.clearTimeout(id));
    handShiftTimersRef.current = [];

    handCardRefs.current.forEach(element => {
      element?.classList.remove('hand-card-shift');
      element?.style.removeProperty('--hand-shift-x');
    });

    const nextRects: DOMRect[] = [];
    const handIsGrowing = visibleHandCount > previousVisibleHandCountRef.current;

    for (let index = 0; index < visibleHandCount; index += 1) {
      const element = handCardRefs.current[index];
      if (!element) continue;

      const nextRect = element.getBoundingClientRect();
      const previousRect = handCardRectsRef.current[index];
      nextRects[index] = nextRect;

      if (!handIsGrowing || !previousRect) continue;

      const deltaX = previousRect.left - nextRect.left;
      if (Math.abs(deltaX) < 1) continue;

      element.style.setProperty('--hand-shift-x', `${deltaX}px`);
      element.classList.add('hand-card-shift');
      handShiftTimersRef.current.push(window.setTimeout(() => {
        element.classList.remove('hand-card-shift');
        element.style.removeProperty('--hand-shift-x');
      }, HAND_SHIFT_ANIMATION_MS));
    }

    handCardRectsRef.current = nextRects;
    previousVisibleHandCountRef.current = visibleHandCount;
  }, [visibleHandCount]);

  useEffect(() => {
    if (combat.turnNumber === 0) revealedDrawKeyRef.current = '';
  }, [combat.enemy.instanceId, combat.turnNumber]);

  useEffect(() => {
    const previousHand = previousHandRef.current;
    const revealInitialHand = initialHandRevealRef.current && combat.hand.length > 0;
    const previousStillInHand = previousHand.every((card, index) => combat.hand[index] === card);
    const drawKey = combat.newlyDrawnIndexes.length > 0
      ? `${combat.drawEventId ?? 0}:${combat.hand.length}:${combat.newlyDrawnIndexes.join(',')}`
      : '';
    const shouldRevealNewDraw = drawKey !== '' && drawKey !== revealedDrawKeyRef.current;
    const revealIndexes = shouldRevealNewDraw
      ? combat.newlyDrawnIndexes
      : revealInitialHand
        ? combat.hand.map((_, index) => index)
        : [];

    previousHandRef.current = combat.hand;

    if (revealIndexes.length === 0) {
      if (!revealingHandRef.current) setVisibleHandCount(combat.hand.length);
      setRevealingDrawnIndexes([]);
      return;
    }

    if (!shouldRevealNewDraw && !revealInitialHand && previousHand.length > 0 && (!previousStillInHand || combat.hand.length <= previousHand.length)) {
      if (!revealingHandRef.current) setVisibleHandCount(combat.hand.length);
      setRevealingDrawnIndexes([]);
      return;
    }

    if (shouldRevealNewDraw) revealedDrawKeyRef.current = drawKey;

    const firstNewIndex = Math.min(...revealIndexes);
    let nextVisibleCount = Math.min(firstNewIndex, combat.hand.length);
    revealingHandRef.current = true;
    setVisibleHandCount(nextVisibleCount);
    setRevealingDrawnIndexes([]);

    const timers = revealIndexes.map((revealedIndex, order) => window.setTimeout(() => {
      nextVisibleCount = Math.min(nextVisibleCount + 1, combat.hand.length);
      setVisibleHandCount(nextVisibleCount);
      setRevealingDrawnIndexes([revealedIndex]);
      if (nextVisibleCount >= combat.hand.length) {
        revealingHandRef.current = false;
        if (revealInitialHand) initialHandRevealRef.current = false;
        window.setTimeout(() => setRevealingDrawnIndexes([]), 680);
      }
    }, order * PLAYER_DRAW_REVEAL_MS));

    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [combat.hand, combat.newlyDrawnIndexes, combat.drawEventId]);

  const playCardWithEffect = (handIndex: number, card: SkillCard) => {
    if (locked) return;
    // 有麻痹时出牌可能失效，动作动画延迟到知晓结果后再播
    const playerParalyzed = (combat.playerStatusEffects ?? []).some(s => s.type === 'paralyze');
    const centerKey = `p-${centerSeqRef.current++}`;
    if (playerParalyzed) {
      pendingParalyzePlayRef.current = {
        centerKey,
        card,
        attack: hasAttackEffect(card),
        defense: hasDefenseEffect(card),
        snapshot: (card.effect.damageToAll ? aliveEnemies : aliveEnemies.filter(enemy => enemy.instanceId === selectedTargetId))
          .map(enemy => ({ instanceId: enemy.instanceId, armor: enemy.armor })),
      };
    } else {
      pendingParalyzePlayRef.current = null;
    }
    if (hasAttackEffect(card) && !playerParalyzed) {
      replayAnimation(playerCardRef.current, 'player-attack-lunge');
      const targets = card.effect.damageToAll ? aliveEnemies : aliveEnemies.filter(enemy => enemy.instanceId === selectedTargetId);
      // 多段攻击：按 damageMultiplier 逐次重放打击特效 + 抖动 + 血条分段掉落
      const hits = Math.max(1, card.effect.damageMultiplier ?? 1);
      targets.forEach(enemy => {
        if (hits > 1) {
          const startHp = enemy.currentHp;
          const endHp = enemy.currentHp - Math.max(0, estimatePlayerCardDamage(card, character.id, combat.playerStatusEffects) - enemy.armor);
          const totalDrop = Math.max(0, startHp - endHp);
          if (totalDrop > 0) {
            const timers: number[] = [];
            let cumulativeDamage = 0;
            for (let h = 0; h < hits; h += 1) {
              const estimatedHitDamage = Math.max(0, (card.effect.damage ?? 0) + (character.id === 'combatmaster' ? getStatusValue(combat.playerStatusEffects, 'combo') + h : 0));
              const hitDamage = h === hits - 1 ? totalDrop - cumulativeDamage : Math.min(estimatedHitDamage, totalDrop - cumulativeDamage);
              cumulativeDamage += hitDamage;
              const intermediateHp = Math.max(0, startHp - cumulativeDamage);
              timers.push(window.setTimeout(() => {
                setHpDisplayOverrides(prev => ({ ...prev, [enemy.instanceId]: intermediateHp }));
              }, h * MULTI_HIT_INTERVAL_MS));
            }
            timers.push(window.setTimeout(() => {
              setHpDisplayOverrides(prev => {
                const next = { ...prev };
                delete next[enemy.instanceId];
                return next;
              });
            }, hits * MULTI_HIT_INTERVAL_MS + 320));
            hpAnimTimersRef.current.push(...timers);
          }
        }
      });
      targets.forEach(enemy => {
        for (let h = 0; h < hits; h += 1) {
          const timer = window.setTimeout(() => {
            const targetElement = enemyCardRefs.current[enemy.instanceId];
            const estimatedDamage = estimatePlayerCardDamage(card, character.id, combat.playerStatusEffects);
            if (enemy.armor > 0) replayAnimation(targetElement, 'enemy-shield-flash');
            if (estimatedDamage > enemy.armor) replayAnimation(targetElement, 'enemy-hit-flash');
            replayAnimation(targetElement, 'combatant-shake', 240);
          }, h * MULTI_HIT_INTERVAL_MS);
          hpAnimTimersRef.current.push(timer);
        }
      });
    }
    if (hasDefenseEffect(card) && !playerParalyzed) replayAnimation(playerCardRef.current, 'player-shield-flash');
    // 玩家出牌滑入中部舞台停留展示
    setCenterCards(prev => [...prev, { key: centerKey, side: 'player', card }]);
    onPlayCard(handIndex, selectedTargetId);
  };

  // 麻痹延迟动画：出牌后根据是否失效决定是否播放动作动画
  useEffect(() => {
    const pending = pendingParalyzePlayRef.current;
    if (!pending) return;
    const fizzled = (combat.fxEvents ?? []).some(e => e.type === 'paralyze' && e.phase === 'triggered' && e.target === 'player');
    pendingParalyzePlayRef.current = null;
    if (fizzled) {
      setCenterCards(prev => prev.filter(item => item.key !== pending.centerKey));
      return; // 失效：只播麻痹特效（由 fxEvents 监听处理）
    }
    if (pending.attack) {
      replayAnimation(playerCardRef.current, 'player-attack-lunge');
      const hits = Math.max(1, pending.card.effect.damageMultiplier ?? 1);
      pending.snapshot.forEach(t => {
        const el = enemyCardRefs.current[t.instanceId];
        if (!el) return;
        for (let h = 0; h < hits; h += 1) {
          const timer = window.setTimeout(() => {
            if (t.armor > 0) replayAnimation(el, 'enemy-shield-flash');
            else replayAnimation(el, 'enemy-hit-flash');
            replayAnimation(el, 'combatant-shake', 240);
          }, h * MULTI_HIT_INTERVAL_MS);
          hpAnimTimersRef.current.push(timer);
        }
      });
    }
    if (pending.defense) replayAnimation(playerCardRef.current, 'player-shield-flash');
  }, [combat.fxEvents, combat.hand.length, combat.discard.length, combat.playerEnergy]);

  useEffect(() => {
    pendingParalyzePlayRef.current = null;
  }, [combat.turnNumber]);

  useEffect(() => {
    const action = combat.lastEnemyAction;
    if (!action) return;
    const timeoutIds: number[] = [];
    const frameId = window.requestAnimationFrame(() => {
      const enemyElement = enemyCardRefs.current[action.enemyId];
      if (action.attackedPlayer) {
        replayAnimation(enemyElement, 'enemy-attack-lunge');
        // 多段攻击：按 hits 逐次重放受击特效 + 抖动 + 血条分段掉落
        const hits = Math.max(1, action.hits ?? 1);
        if (hits > 1) {
          const preHp = prevPlayerHpRef.current;
          const postHp = combat.playerHp;
          const totalDrop = preHp - postHp;
          if (totalDrop > 0) {
            const perHit = Math.round(totalDrop / hits);
            for (let h = 0; h < hits; h += 1) {
              const intermediateHp = Math.max(0, preHp - perHit * (h + 1));
              timeoutIds.push(window.setTimeout(() => {
                setHpDisplayOverrides(prev => ({ ...prev, player: intermediateHp }));
              }, h * MULTI_HIT_INTERVAL_MS));
            }
            timeoutIds.push(window.setTimeout(() => {
              setHpDisplayOverrides(prev => {
                const next = { ...prev };
                delete next.player;
                return next;
              });
            }, hits * MULTI_HIT_INTERVAL_MS + 320));
          }
        }
        for (let h = 0; h < hits; h += 1) {
          timeoutIds.push(window.setTimeout(
            () => {
              if (action.shieldedPlayer) replayAnimation(playerCardRef.current, 'player-shield-flash');
              if (action.damagedPlayer) replayAnimation(playerCardRef.current, 'player-hit-flash');
              // 迅捷闪避：怪物攻击动作照常播，但玩家未受击/未格挡时不抖动
              if (action.damagedPlayer || action.shieldedPlayer) replayAnimation(playerCardRef.current, 'combatant-shake');
            },
            h * MULTI_HIT_INTERVAL_MS,
          ));
        }
      }
      if (action.affectedSelf) replayAnimation(enemyElement, 'enemy-skill-flash');
    });
    return () => {
      window.cancelAnimationFrame(frameId);
      timeoutIds.forEach(id => window.clearTimeout(id));
    };
  }, [
    combat.lastEnemyAction?.actionKey,
    combat.lastEnemyAction?.enemyId,
    combat.lastEnemyAction?.attackedPlayer,
    combat.lastEnemyAction?.damagedPlayer,
    combat.lastEnemyAction?.shieldedPlayer,
    combat.lastEnemyAction?.affectedSelf,
    combat.lastEnemyAction?.hits,
  ]);

  // 状态伤害 / 非多段攻击受伤抖动（多段攻击已在上方 hits 循环中处理）
  useEffect(() => {
    const fxEvents = combat.fxEvents ?? combat.lastEnemyAction?.fxEvents ?? [];
    const tickEvents = fxEvents.filter(e => e.phase === 'tick');
    // 状态 tick 按类型逐次抖动（如灼烧+毒 = 两下快抖）
    tickEvents.forEach((event, idx) => {
      const target = event.target === 'player'
        ? playerCardRef.current
        : enemyCardRefs.current[event.enemyId ?? ''];
      if (target) {
        window.setTimeout(() => replayAnimation(target, 'combatant-shake'), idx * 80);
      }
    });
    // 麻痹触发：对被麻痹方播放一次抖动
    const paralyzeTriggers = fxEvents.filter(e => e.phase === 'triggered' && e.type === 'paralyze');
    paralyzeTriggers.forEach(event => {
      const target = event.target === 'player'
        ? playerCardRef.current
        : enemyCardRefs.current[event.enemyId ?? ''];
      if (target) replayAnimation(target, 'combatant-shake', 320);
    });
    // 非多段玩家受伤
    const prevPlayerHp = prevPlayerHpRef.current;
    if (combat.playerHp < prevPlayerHp && tickEvents.length === 0) {
      replayAnimation(playerCardRef.current, 'combatant-shake');
    }
    prevPlayerHpRef.current = combat.playerHp;
    // 非多段敌人受伤
    aliveEnemies.forEach(e => {
      const prevHp = prevEnemyHpRef.current[e.instanceId];
      if (prevHp !== undefined && e.currentHp < prevHp) {
        replayAnimation(enemyCardRefs.current[e.instanceId], 'combatant-shake');
      }
      prevEnemyHpRef.current[e.instanceId] = e.currentHp;
    });
  }, [combat.playerHp, combat.fxEvents, combat.lastEnemyAction?.fxEvents, aliveEnemies.map(e => `${e.instanceId}:${e.currentHp}`).join('|')]);

  // 敌方回合开始（locked: false→true）→ 只清空敌方上回合打出的牌；玩家牌保留，供敌方回合内查看。
  // 注意：此 effect 必须声明在「怪出牌入场」effect 之前。回放首帧时 locked 跳变与首张 reveal
  // 会在同一次 render 中同时触发，React 按声明顺序执行——先清场、后入场，才不会把第一张牌误清空。
  const prevLockedRef = useRef(locked);
  useEffect(() => {
    if (locked && !prevLockedRef.current) {
      setCenterCards(prev => prev.filter(item => item.side !== 'enemy'));
    }
    prevLockedRef.current = locked;
  }, [locked]);

  // 怪出牌：每次揭示带 card 的新一帧，把怪牌推入中部舞台正面展示
  useEffect(() => {
    if (enemyReveal?.card) {
      setCenterCards(prev => [...prev, { key: `e-${centerSeqRef.current++}`, side: 'enemy', card: enemyReveal.card! }]);
    }
  }, [enemyReveal]);

  // 玩家回合开始（turnNumber 变化）→ 只清空玩家上回合打出的牌；敌方牌保留，供玩家查看其上回合动作
  useEffect(() => {
    setCenterCards(prev => prev.filter(item => item.side !== 'player'));
  }, [combat.turnNumber]);

  const playerPlayedCards = centerCards.filter(item => item.side === 'player');
  const playerHpPct = combat.playerMaxHp > 0 ? Math.max(0, Math.min(100, ((hpDisplayOverrides.player ?? combat.playerHp) / combat.playerMaxHp) * 100)) : 0;
  const playerArmorPct = combat.playerMaxHp > 0 ? Math.max(0, Math.min(100, (combat.playerArmor / combat.playerMaxHp) * 100)) : 0;
  const playerEnergyPct = combat.playerMaxEnergy > 0 ? Math.max(0, Math.min(100, (combat.playerEnergy / combat.playerMaxEnergy) * 100)) : 0;
  const fxEvents = combat.fxEvents ?? combat.lastEnemyAction?.fxEvents ?? [];

  return (
    <div className="battle-view">
      <StatusBar
        gold={gold}
        level={level}
        exp={exp}
        expNext={expNext}
      />

      <div className="battle-stage-area">
        {/* 并排布局：玩家牌 | 玩家 | 怪物 | 怪牌+牌堆 */}
        <div className="battle-arena-row">
          {/* 左：玩家打出的牌 */}
          <div className="played-cards-column played-player" aria-label={t('battle.centerStage')}>
            {playerPlayedCards.slice(0, 9).map(item => (
              <div key={item.key} className="center-card player">
                <CardComponent card={item.card as SkillCard} size="small" />
              </div>
            ))}
            {playerPlayedCards.length > 9 && (
              <button className="played-overflow-btn" type="button" onClick={() => setPlayedOverflowOpen(true)}>
                {t('battle.playedOverflow', { count: playerPlayedCards.length })}
              </button>
            )}
          </div>

          {/* 中组：玩家 + 怪物 并排居中 */}
          <div className="battle-center-stage">
          <div className="player-card combatant-card" ref={playerCardRef}>
            <StatusFxLayer events={fxEvents} target="player" />
            <div
              className="player-sprite"
              title={lang === 'en' && character.passiveDescription_en ? character.passiveDescription_en : character.passiveDescription}
            >
              {character.id === 'developer' ? (
                <div className="player-stickman-dev" />
              ) : (
                <img src={asset(`assets/characters/${character.id}.png`)} alt={loc.n(character)} className="player-sprite-img" />
              )}
            </div>
            <strong
              className="player-name"
              title={lang === 'en' && character.passiveDescription_en ? character.passiveDescription_en : character.passiveDescription}
            >
              {loc.n(character)}<span>Lv.{level}</span>
            </strong>
            <div className="player-passive-badge">
              <span className="player-passive-icon">✨</span>
              <span className="player-passive-name">{lang === 'en' && character.passiveName_en ? character.passiveName_en : character.passiveName}</span>
              <span className="player-passive-tooltip">{lang === 'en' && character.passiveDescription_en ? character.passiveDescription_en : character.passiveDescription}</span>
            </div>
            <StatusList effects={combat.playerStatusEffects} emptyText={t('battle.emptyStatus')} radiance={combat.radianceStacks ?? 0} rage={combat.ragePoints ?? 0} showRage={character.id === 'armorbreaker'} fxEvents={fxEvents.filter(event => event.target === 'player')} />
          </div>

          {/* 右中：怪物 */}
          <div className="enemy-combatants">
          {(() => {
          const multipleEnemies = visibleEnemies.length > 1;
          const actingIndex = aliveEnemies.length > 0 ? combat.currentEnemyIndex % aliveEnemies.length : 0;
          return visibleEnemies.map((e, idx) => {
            const eHpPct = Math.max(0, ((hpDisplayOverrides[e.instanceId] ?? e.currentHp) / e.hp) * 100);
            const eArmorPct = e.hp > 0 ? Math.max(0, Math.min(100, (e.armor / e.hp) * 100)) : 0;
            const eArmorDelta = enemyArmorDelta[e.instanceId];
            const eEnergyPct = e.energy > 0 ? Math.max(0, Math.min(100, (e.currentEnergy / e.energy) * 100)) : 0;
            const isSelected = selectedTargetId === e.instanceId;
            const isDefeated = e.currentHp <= 0;
            const aliveIndex = aliveEnemies.findIndex(enemy => enemy.instanceId === e.instanceId);
            const isActing = !isDefeated && multipleEnemies && aliveIndex === actingIndex;
            const isWaiting = !isDefeated && multipleEnemies && aliveIndex !== actingIndex;
          return (
            <div
              key={e.instanceId}
              ref={(element) => { enemyCardRefs.current[e.instanceId] = element; }}
              className={`enemy-card combatant-card${isSelected ? ' enemy-active enemy-selected' : ''}${isActing ? ' enemy-acting' : ''}${isWaiting ? ' enemy-waiting' : ''}${isDefeated ? ' enemy-defeated' : ''}`}
              style={{ '--enemy-enter-delay': `${idx * 80}ms` } as CSSProperties}
              onClick={() => setSelectedTargetId(e.instanceId)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setSelectedTargetId(e.instanceId);
              }}
            >
              <StatusFxLayer events={fxEvents} target="enemy" enemyId={e.instanceId} />
              <div className="enemy-sprite">
                <img
                  src={getEnemyImage(e.id)}
                  alt={loc.n(e)}
                  className="enemy-sprite-img"
                  onError={(ev) => {
                    const img = ev.target as HTMLImageElement;
                    img.style.display = 'none';
                    const fallback = img.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = '';
                  }}
                />
                <span className="enemy-sprite-fallback" style={{ fontSize: 48, display: 'none' }}>👾</span>
              </div>
              <strong className="enemy-name">
                {loc.n(e)}
                <span className="enemy-level">{t('battle.level')}.{e.tier === 'normal' ? 1 : e.tier === 'elite' ? 2 : 3}</span>
              </strong>
              <EnemyIntentBadge enemy={e} turnNumber={combat.turnNumber} />
              <div className="enemy-hp-row">
                <div className="enemy-hp-bar">
                  <div className="enemy-hp-fill" style={{ width: `${eHpPct}%` }} />
                  {e.armor > 0 && <div className={`enemy-hp-armor-fill${eArmorDelta ? ` armor-${eArmorDelta}` : ''}`} style={{ width: `${eArmorPct}%` }} />}
                  {character.id === DEVOUDER_CHARACTER_ID && !isDefeated && (
                    <div
                      className="enemy-execute-marker"
                      style={{ left: `${DEVOUDER_PASSIVE_EXECUTE_THRESHOLD * 100}%` }}
                    />
                  )}
                </div>
                <small className="enemy-hp-text">❤️ {hpDisplayOverrides[e.instanceId] ?? e.currentHp}/{e.hp}</small>
              </div>
              <div className="enemy-energy-row">
                <div className="enemy-energy-bar">
                  <div className="enemy-energy-fill" style={{ width: `${eEnergyPct}%` }} />
                </div>
                <div className="enemy-energy-tags">
                  <small className="enemy-energy-text">⚡ {e.currentEnergy}/{e.energy}</small>
                  {e.armor > 0 && <small className="enemy-armor-text">🛡️ {e.armor}</small>}
                </div>
              </div>
              <StatusList effects={e.statusEffects} emptyText={t('battle.emptyEnemyStatus')} fxEvents={fxEvents.filter(event => event.target === 'enemy' && event.enemyId === e.instanceId)} />
              {isActing && (
                <span className="enemy-turn-badge enemy-turn-acting">{t('enemy.acting')}</span>
              )}
              {isWaiting && (
                <span className="enemy-turn-badge enemy-turn-waiting">{t('enemy.waiting')}</span>
              )}
            </div>
          );
          });
          })()}
          </div>
          </div>

          {/* 怪物右侧：牌堆统计(紧贴怪) + 怪打出的牌(再往右) */}
          <div className="enemy-right-panel">
            {primaryEnemy && (
              <div className="enemy-pile-stats">
                {/* 手牌：竖向置顶 */}
                <div className="pile-group pile-hand">
                  <span className="pile-label">{t('battle.hand')} {enemyHandCount}</span>
                  <PileBacks count={enemyHandCount} orientation="v" />
                </div>
                {/* 牌库 + 弃牌堆：横向并排，白色虚线框 */}
                <div className="pile-row">
                  <div className="pile-group pile-frame">
                    <span className="pile-label">{t('battle.deck')} {enemyDrawCount}</span>
                    <PileBacks count={enemyDrawCount} orientation="h" />
                  </div>
                  <div className="pile-group pile-frame">
                    <span className="pile-label">{t('battle.discard')} {enemyDiscardCount}</span>
                    <PileBacks count={enemyDiscardCount} orientation="h" />
                  </div>
                </div>
              </div>
            )}
            <div className="played-cards-column played-enemy">
              {centerCards.filter(item => item.side === 'enemy').map(item => (
                <div key={item.key} className="center-card enemy">
                  <EnemyCardFace card={item.card as EnemyCard} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="player-card-bottom-stats">
        <div className="player-bars-stack">
          <div className="player-hp-row">
            <div className="player-hp-bar">
              <div className="player-hp-fill" style={{ width: `${playerHpPct}%` }} />
              {combat.playerArmor > 0 && <div className={`player-hp-armor-fill${playerArmorDelta ? ` armor-${playerArmorDelta}` : ''}`} style={{ width: `${playerArmorPct}%` }} />}
            </div>
            <span className="player-hp-text">❤️ {hpDisplayOverrides.player ?? combat.playerHp}/{combat.playerMaxHp}</span>
            {combat.playerArmor > 0 && <span className={`player-mini-stat player-armor-stat${playerArmorDelta ? ` armor-${playerArmorDelta}` : ''}`}>🛡️ {combat.playerArmor}</span>}
          </div>
          <div className="player-energy-row">
            <div className="player-energy-bar">
              <div className="player-energy-fill" style={{ width: `${playerEnergyPct}%` }} />
            </div>
            <span className="player-mini-stat player-energy-stat">⚡ {combat.playerEnergy}/{combat.playerMaxEnergy}</span>
          </div>
        </div>
      </div>

      <div className="battle-hand-area">
        <div className="hand-label">
          <span className="hand-meta-left">{t('battle.hand')} {combat.hand.length}/{combat.handLimit}</span>
          <span className="hand-meta-right">
            {t('battle.deck')} {combat.deck.length} | {t('battle.discard')} {combat.discard.length}
            {drawSourceEmpty && <span className="empty-draw-warning" title={t('battle.noCardsToDraw')}>{t('battle.noCardsShort')}</span>}
          </span>
        </div>
        <div className="hand-cards">
          {combat.hand.slice(0, visibleHandCount).map((card, index) => {
            const energyDisabled = card.cost > combat.playerEnergy;
            const goldDisabled = (card.effect.goldCost ?? 0) > gold;
            const disabled = energyDisabled || goldDisabled || locked;
            const disabledReason = energyDisabled
              ? t('notice.noEnergy')
              : goldDisabled
                ? t('notice.noGold')
                : locked
                  ? t('battle.enemyTurn')
                  : undefined;
            const isNewlyDrawn = revealingDrawnIndexes.includes(index);
            return (
              <div
                key={`${card.id}-${index}`}
                ref={(element) => { handCardRefs.current[index] = element; }}
                className={isNewlyDrawn ? 'draw-card-enter' : 'hand-card-stable'}
              >
                <CardComponent
                  card={card}
                  size="battle"
                  disabled={disabled}
                  disabledReason={disabledReason}
                  onClick={() => playCardWithEffect(index, card)}
                />
              </div>
            );
          })}
          {combat.hand.length === 0 && (
            <div className="empty-hand">{t('battle.handEmpty')}</div>
          )}
        </div>
        <div className="battle-actions">
          {character.activeSkill && onActiveSkill && (() => {
            const isWealthSkill = character.id === 'wealthmerchant';
            const wealthGoldCost = Math.min(gold, WEALTH_ACTIVE_MAX_GOLD_COST);
            const skillDisabled = locked || (isWealthSkill && (gold <= 0 || combat.playerEnergy < WEALTH_ACTIVE_ENERGY_COST));
            const skillName = lang === 'en' && character.activeSkill.name_en ? character.activeSkill.name_en : character.activeSkill.name;
            const skillDescription = lang === 'en' && character.activeSkill.description_en ? character.activeSkill.description_en : character.activeSkill.description;
            const skillCostText = isWealthSkill
              ? t('activeSkill.costGoldAndEnergy', { gold: wealthGoldCost, energy: WEALTH_ACTIVE_ENERGY_COST })
              : '';
            return (
              <button
                className="btn-active-skill"
                onClick={() => onActiveSkill(selectedTargetId)}
                type="button"
                disabled={skillDisabled}
                aria-describedby="active-skill-tooltip"
                onMouseEnter={() => setSkillTipVisible(true)}
                onMouseLeave={() => setSkillTipVisible(false)}
              >
                <span className="active-skill-name">💰 主动技能 · {skillName}</span>
                <span className="active-skill-tooltip" id="active-skill-tooltip" role="tooltip" style={{ opacity: skillTipVisible ? 1 : 0, visibility: skillTipVisible ? 'visible' : 'hidden', transform: skillTipVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(4px)' }}>
                  {skillDescription}{skillCostText ? `\n${skillCostText}` : ''}
                </span>
              </button>
            );
          })()}
          <button className="btn-end-turn" onClick={onEndTurn} type="button" disabled={locked}>
            {locked ? t('battle.enemyTurn') : t('battle.endTurn')}
          </button>
        </div>
      </div>
      {playedOverflowOpen && createPortal(
        <div className="played-overflow-overlay" onClick={() => setPlayedOverflowOpen(false)} role="dialog" aria-modal="true">
          <div className="played-overflow-modal" onClick={e => e.stopPropagation()}>
            <div className="played-overflow-header">
              <h3>{t('battle.playedThisTurn', { count: playerPlayedCards.length })}</h3>
              <button type="button" className="played-overflow-close" onClick={() => setPlayedOverflowOpen(false)}>✕</button>
            </div>
            <div className="played-overflow-grid">
              {playerPlayedCards.map(item => (
                <div key={item.key} className="center-card player">
                  <CardComponent card={item.card as SkillCard} size="small" />
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
