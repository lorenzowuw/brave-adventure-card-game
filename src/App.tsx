/**
 * 《勇者大冒险》- 主应用
 * 状态机路由：select → exploration → combat/event/shop/rest → victory/defeat
 * 遵循 game-vibe patterns.md 场景架构模式
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { CharacterConfig, RunState, GameEvent, Blessing, SkillCard, GlobalUnlocks, AreaId, EnemyTurnStep } from './types/game';
import { skillData, characterData } from './utils/DataLoader';

const allSkills = skillData as any[];
const ENEMY_CARD_PLAYBACK_MS = 500;
const ENEMY_DEATH_ANIMATION_MS = 760;

function getAliveCombatEnemyIds(run: RunState | null): string[] {
  const combat = run?.combat;
  if (!combat) return [];
  return [combat.enemy, ...(combat.extraEnemies ?? [])]
    .filter(enemy => enemy.currentHp > 0)
    .map(enemy => enemy.instanceId);
}

function markCombatEnemiesDefeated(run: RunState, enemyIds: string[]): RunState {
  if (!run.combat) return run;
  const defeatedIds = new Set(enemyIds);
  const markEnemy = (enemy: typeof run.combat.enemy) => defeatedIds.has(enemy.instanceId)
    ? { ...enemy, currentHp: 0 }
    : enemy;

  return {
    ...run,
    combat: {
      ...run.combat,
      enemy: markEnemy(run.combat.enemy),
      extraEnemies: run.combat.extraEnemies.map(markEnemy),
      newlyDrawnIndexes: [],
    },
  };
}

function shuffle<T>(items: T[]): T[] {
  const r = [...items];
  for (let i = r.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = r[i]; r[i] = r[j]; r[j] = t;
  }
  return r;
}
import {
  createInitialRunState,
  createTrainingRun,
  enterNode,
  advanceToNextLayer,
  confirmLayerTransition,
  playSkillCard,
  endCombatTurn,
  restHeal,
  chooseBlessing,
  chooseRewardCard,
  buyCard,
  drawGachaCard,
  deleteCard,
  applyEventChoice,
  getUpgradeCost,
  upgradeCard,
  skipUpgrade,
  burnCard,
  skipBurn,
  useActiveSkill,
  getGlobalUnlocks,
  saveGlobalUnlocks,
  unlockAllContent,
  recordRunEnd,
  getRandomBlessings,
  getRestHealPreview,
  getBlessingEffectTotal,
  getLevelProgress,
  loadGame,
} from './systems/RunManager';
import type { SaveSlot } from './systems/RunManager';

import { CharacterSelect } from './components/CharacterSelect';
import { MapView } from './components/MapView';
import { BattleView } from './components/BattleView';
import { BattleTutorial } from './components/BattleTutorial';
import { CardComponent } from './components/CardComponent';
import { EventView } from './components/EventView';
import { NodeTransition } from './components/NodeTransition';
import { RestView } from './components/RestView';
import { getDeletePrice, getDiscountedShopPrice, ShopView } from './components/ShopView';
import { ResultScreen } from './components/ResultScreen';
import { GameManual } from './components/GameManual';
import { DeckView } from './components/DeckView';
import { SaveView } from './components/SaveView';
import { CardCodexView } from './components/CardCodexView';
import { EnemyCardCodexView } from './components/EnemyCardCodexView';
import { HistoryView } from './components/HistoryView';
import { AnnouncementBoard } from './components/AnnouncementBoard';
import { useTranslation } from './i18n';

type Screen = 'select' | 'exploration' | 'combat' | 'reward' | 'event' | 'shop' | 'rest' | 'upgrade' | 'burn' | 'layer_transition' | 'training_done' | 'victory' | 'defeat';

interface AppState {
  screen: Screen;
  run: RunState | null;
  character: CharacterConfig | null;
  unlocks: GlobalUnlocks;
  event: GameEvent | null;
  shopItems: Array<SkillCard | null>;
  blessings: Blessing[];
  message: string;
  pendingBattleResult: { finalRun: RunState; defeatedEnemyIds: string[] } | null;
}

const initialAppState: AppState = {
  screen: 'select',
  run: null,
  character: null,
  unlocks: getGlobalUnlocks(),
  event: null,
  shopItems: [],
  blessings: [],
  message: '',
  pendingBattleResult: null,
};

export function App() {
  const [app, setApp] = useState<AppState>(initialAppState);
  const [manualOpen, setManualOpen] = useState(false);
  const [deckViewOpen, setDeckViewOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [codexOpen, setCodexOpen] = useState(false);
  const [codexTab, setCodexTab] = useState<'card' | 'enemy'>('card');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [eventLogs, setEventLogs] = useState<string[]>([]);
  const [healUsed, setHealUsed] = useState(false);
  const [enemyPlayback, setEnemyPlayback] = useState<{ steps: EnemyTurnStep[]; finalRun: RunState; index: number } | null>(null);
  const [nodeTransition, setNodeTransition] = useState<{ fromRun: RunState; toRun: RunState; selectedNodeId: string } | null>(null);
  const pendingNodeTransitionRef = useRef<{ fromRun: RunState; selectedNodeId: string } | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const prevScreenRef = useRef<AppState['screen']>('select');
  const noticeTimerRef = useRef<number | null>(null);
  const eventLogListRef = useRef<HTMLDivElement | null>(null);
  const prevRunRef = useRef<RunState | null>(null);
  const healUsedRef = useRef(false);
  const devCloseCountRef = useRef(0);
  const [devMode, setDevMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => {
    try { return !window.localStorage.getItem('card-quest-tutorial-done'); } catch { return true; }
  });
  const [tutorialStep, setTutorialStep] = useState<0 | 1>(0);
  const { t, toggleLang, lang } = useTranslation();

  const completeBattleTutorial = useCallback(() => {
    setShowTutorial(false);
    try { window.localStorage.setItem('card-quest-tutorial-done', '1'); } catch { /* ignore */ }
  }, []);

  const handleTutorialCardPlayed = useCallback(() => {
    if (showTutorial) setTutorialStep(1);
  }, [showTutorial]);

  const handleTutorialEndTurn = useCallback(() => {
    if (showTutorial && tutorialStep === 1) completeBattleTutorial();
  }, [completeBattleTutorial, showTutorial, tutorialStep]);

  const langBtn = (
    <button className="lang-toggle-btn" onClick={toggleLang} type="button">
      {lang === 'zh' ? 'EN' : '中'}
    </button>
  );

  const manual = (
    <GameManual
      open={manualOpen}
      onOpen={() => setManualOpen(true)}
      onClose={() => {
        setManualOpen(false);
        devCloseCountRef.current += 1;
        if (!devMode && devCloseCountRef.current >= 5) {
          setDevMode(true);
          showNotice('开发者模式已开启！');
        }
      }}
    />
  );

  // —— 渲染 ——
  const { screen, run, character, unlocks, event, shopItems, blessings, message, pendingBattleResult } = app;

  function showNotice(text: string) {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setNotice(text);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 2400);
  }

  function diffCards(prevDeck: SkillCard[], nextDeck: SkillCard[]) {
    const remainingNext = [...nextDeck];
    const removed: SkillCard[] = [];

    prevDeck.forEach(prevCard => {
      const index = remainingNext.findIndex(nextCard => nextCard.id === prevCard.id);
      if (index >= 0) {
        remainingNext.splice(index, 1);
        return;
      }
      removed.push(prevCard);
    });

    return { added: remainingNext, removed };
  }

  function formatCardNames(cards: SkillCard[]): string {
    return cards.map(card => card.name).join('、');
  }

  function withLogEmoji(log: string): string {
    if (/^[\p{Extended_Pictographic}]/u.test(log)) return log;
    if (/训练场|木人桩|Training Yard|dummy/.test(log)) return `🎯 ${log}`;
    if (/选择了.+冒险开始|Selected .+adventure begins/i.test(log)) return `🚀 ${log}`;
    if (/通关|cleared|勇者/.test(log)) return `🏆 ${log}`;
    if (/倒下|失败|冒险到此结束|defeat|fell|Defeat/.test(log)) return `💀 ${log}`;
    if (/Boss|首领|准备进入下一区域|下一区域|穿越了|来到/.test(log)) return `👑 ${log}`;
    if (/获得卡牌/.test(log)) return `🎴 ${log}`;
    if (/焚卡炉|焚毁|Burned/.test(log)) return `🔥 ${log}`;
    if (/失去卡牌|删除了|移除了/.test(log)) return `🗑️ ${log}`;
    if (/升级卡牌|升级为|升级恢复|Level up|upgraded/.test(log)) return `⬆️ ${log}`;
    if (/获得金币/.test(log)) return `💰 ${log}`;
    if (/失去金币|花费|消耗 \d+ 金币|支付/.test(log)) return `💸 ${log}`;
    if (/获得 \d+ 经验|获得 \d+ EXP|Gained \d+ EXP|胜利|Victory/.test(log)) return `⭐ ${log}`;
    if (/遭遇了|Encountered/.test(log)) return `⚔️ ${log}`;
    if (/祝福|Blessing|获得了祝福|Obtained blessing/.test(log)) return `✨ ${log}`;
    if (/抽卡|神秘抽卡|命运|gacha|Mystery draw/.test(log)) return `🎰 ${log}`;
    if (/商店|购买|购买了|游商|Welcome|Shop|Merchant|Purchased/.test(log)) return `🏪 ${log}`;
    if (/祭坛|altar|Altar/.test(log)) return `🔮 ${log}`;
    if (/休息|营地|Rested|Camp/.test(log)) return `🏕️ ${log}`;
    if (/事件|神秘|低语|幻象|裂隙|泉水|神像/.test(log)) return `❓ ${log}`;
    return log;
  }

  function getCardChangeNotice(prevRun: RunState, nextRun: RunState, t: (key: string, params?: Record<string, string | number>) => string): string {
    const cardChangePhases: RunState['phase'][] = ['reward', 'shop', 'event', 'upgrade', 'burn'];
    if (!cardChangePhases.includes(prevRun.phase)) return '';

    const { added, removed } = diffCards(prevRun.deck, nextRun.deck);
    const upgraded = removed.find(removedCard => added.some(addedCard => addedCard.id === removedCard.upgradeTo));
    if (upgraded) {
      const upgradedTo = added.find(card => card.id === upgraded.upgradeTo);
      return upgradedTo ? t('log.cardUpgrade', { from: upgraded.name, to: upgradedTo.name }) : '';
    }

    const parts: string[] = [];
    if (added.length > 0) parts.push(t('log.cardGain', { names: formatCardNames(added) }));
    if (removed.length > 0) parts.push(t('log.cardLoss', { names: formatCardNames(removed) }));

    return parts.join('，');
  }

  function getRunChangeLogs(prevRun: RunState, nextRun: RunState, t: (key: string, params?: Record<string, string | number>) => string): string[] {
    const logs: string[] = [];
    const isEventChoice = prevRun.phase === 'event';
    const cardNotice = isEventChoice ? '' : getCardChangeNotice(prevRun, nextRun, t);
    const goldDelta = nextRun.gold - prevRun.gold;

    if (cardNotice) logs.push(cardNotice);
    if (goldDelta > 0) logs.push(t('log.goldGain', { value: goldDelta }));
    if (goldDelta < 0) logs.push(t('log.goldLoss', { value: Math.abs(goldDelta) }));
    if (nextRun.message && nextRun.message !== prevRun.message) {
      logs.push(...nextRun.message.split('\n').filter(Boolean));
    }

    return logs;
  }

  useEffect(() => {
    healUsedRef.current = healUsed;
  }, [healUsed]);

  useEffect(() => {
    const prevRun = prevRunRef.current;
    if (prevRun && run) {
      const logs = getRunChangeLogs(prevRun, run, t);
      const cardNotice = getCardChangeNotice(prevRun, run, t);
      if (logs.length > 0) {
        setEventLogs(prev => [...prev, ...logs.map(withLogEmoji)].slice(-80));
      }
      if (cardNotice) {
        showNotice(cardNotice);
      }
    }
    prevRunRef.current = run;
  }, [run]);

  useEffect(() => {
    if (eventLogListRef.current) {
      eventLogListRef.current.scrollTop = eventLogListRef.current.scrollHeight;
    }
  }, [eventLogs]);

  useEffect(() => () => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
  }, []);

  // 节点完成过渡动画
  useEffect(() => {
    const prev = prevScreenRef.current;
    const curr = app.screen;
    prevScreenRef.current = curr;
    const pending = pendingNodeTransitionRef.current;
    const nodeActivities: AppState['screen'][] = ['combat', 'event', 'shop', 'rest', 'upgrade', 'burn', 'reward', 'layer_transition'];

    if (
      curr === 'exploration'
      && nodeActivities.includes(prev)
      && app.run
      && pending
      && pending.fromRun.currentMap.id === app.run.currentMap.id
      && app.run.mapPosition.layer === pending.fromRun.mapPosition.layer + 1
      && app.run.path.includes(pending.selectedNodeId)
    ) {
      setNodeTransition({ ...pending, toRun: app.run });
      pendingNodeTransitionRef.current = null;
      return;
    }

    if (curr === 'exploration') {
      pendingNodeTransitionRef.current = null;
      return;
    }

    if (curr !== prev) {
      setNodeTransition(null);
      if (!nodeActivities.includes(curr)) pendingNodeTransitionRef.current = null;
    }
  }, [app.screen, app.run]);

  const noticeLayer = notice && !codexOpen ? <div className="game-notice">{notice}</div> : null;
  const eventLogPanel = run ? (
    <aside className="event-log-panel">
      <h3>{t('log.title')}</h3>
      <div className="event-log-list" ref={eventLogListRef}>
        {eventLogs.map((log, index) => <p key={`${index}-${log}`}>{log}</p>)}
        {eventLogs.length === 0 && <p>{t('log.empty')}</p>}
      </div>
    </aside>
  ) : null;

  const deckBtn = run && run.deck.length > 0 && (screen === 'exploration' || screen === 'combat' || screen === 'event') ? (
    <>
      <button className="deckview-open-btn top-tool-btn" onClick={() => setDeckViewOpen(true)} type="button">
        📜 {t('btn.deck', { count: run.deck.length })}
      </button>
      <DeckView
        deck={run.deck}
        gold={run.gold}
        open={deckViewOpen}
        onClose={() => setDeckViewOpen(false)}
      />
    </>
  ) : null;

  const codexBtn = (
    <button className="codex-open-btn top-tool-btn" onClick={() => setCodexOpen(true)} type="button">
      📖 {t('btn.codex')}
    </button>
  );

  const codexDiscovered = run
    ? Array.from(new Set([...unlocks.discoveredCards, ...run.discoveredCards]))
    : unlocks.discoveredCards;
  const enemyCodexDiscovered = run
    ? Array.from(new Set([...(unlocks.discoveredEnemyCards ?? []), ...(run.discoveredEnemyCards ?? [])]))
    : (unlocks.discoveredEnemyCards ?? []);

  const codexTabSwitcher = (
    <div className="codex-tab-switcher">
      <button
        className={`codex-tab-btn${codexTab === 'card' ? ' codex-tab-active' : ''}`}
        onClick={() => setCodexTab('card')}
        type="button"
      >📖 {t('codex.tab.card')}</button>
      <button
        className={`codex-tab-btn${codexTab === 'enemy' ? ' codex-tab-active' : ''}`}
        onClick={() => setCodexTab('enemy')}
        type="button"
      >👾 {t('codex.tab.enemy')}</button>
    </div>
  );

  const codexView = codexTab === 'card' ? (
    <CardCodexView
      open={codexOpen}
      onClose={() => setCodexOpen(false)}
      discoveredCards={codexDiscovered}
      tabSlot={codexTabSwitcher}
    />
  ) : (
    <EnemyCardCodexView
      open={codexOpen}
      onClose={() => setCodexOpen(false)}
      discoveredEnemyCards={enemyCodexDiscovered}
      tabSlot={codexTabSwitcher}
    />
  );

  const historyBtn = (
    <button className="history-open-btn top-tool-btn" onClick={() => setHistoryOpen(true)} type="button">
      📜 {t('btn.history')}
    </button>
  );

  const historyView = (
    <HistoryView
      open={historyOpen}
      onClose={() => setHistoryOpen(false)}
      unlocks={unlocks}
    />
  );

  const announcementBtn = (
    <button className="announcement-open-btn top-tool-btn" onClick={() => setAnnouncementOpen(true)} type="button">
      📢 公告
    </button>
  );

  const announcementView = (
    <AnnouncementBoard
      open={announcementOpen}
      onClose={() => setAnnouncementOpen(false)}
    />
  );

  const saveBtn = (
    <button className="save-open-btn top-tool-btn" onClick={() => setSaveOpen(true)} type="button">
      💾 {t('btn.save')}
    </button>
  );

  // —— 训练场 ——
  const [trainingOpen, setTrainingOpen] = useState(false);
  const visibleCharacters = characterData.filter(char => devMode || char.id !== 'developer');
  const handleStartTraining = useCallback((char: CharacterConfig) => {
    const run = createTrainingRun(char.id);
    setEventLogs([withLogEmoji(t('training.enterLog'))]);
    setApp(prev => ({ ...prev, screen: 'combat', character: char, run, message: run.message }));
    setTrainingOpen(false);
  }, [t]);

  // —— 角色选择 ——
  const handleUnlockAllContent = useCallback(() => {
    if (!window.confirm(t('confirm.unlockAll'))) return;
    const nextUnlocks = unlockAllContent(getGlobalUnlocks());
    saveGlobalUnlocks(nextUnlocks);
    setApp(prev => ({ ...prev, unlocks: nextUnlocks }));
    showNotice(t('notice.unlockAllDone'));
  }, [t]);

  const handleSelectCharacter = useCallback((char: CharacterConfig, startArea?: AreaId) => {
    const run = createInitialRunState(char.id, startArea);
    const charName = lang === 'en' && char.name_en ? char.name_en : char.name;
    const startMessage = t('log.selectCharacter', { name: charName });
    setEventLogs([withLogEmoji(startMessage)]);

    setApp(prev => ({
      ...prev,
      screen: 'exploration',
      character: char,
      run,
      message: startMessage,
    }));
  }, [lang, t]);

  // —— 进入节点 ——
  const handleEnterNode = useCallback((nodeId: string) => {
    setApp(prev => {
      if (!prev.run) return prev;
      pendingNodeTransitionRef.current = { fromRun: prev.run, selectedNodeId: nodeId };
      setNodeTransition(null);
      const next = enterNode(prev.run, nodeId);

      if (next.phase === 'combat' && next.combat) {
        return { ...prev, run: next, screen: 'combat', message: next.message };
      }
      if (next.phase === 'event' && next.activeEvent) {
        return { ...prev, run: next, screen: 'event', event: next.activeEvent, message: next.message };
      }
      if (next.phase === 'shop' && prev.character) {
        const areaDepth = ['forest', 'ruins', 'flame', 'frost', 'chaos'].indexOf(next.currentArea);
        const rarityOrder = ['white', 'green', 'blue', 'purple', 'orange', 'red'];
        const minRarity = Math.max(0, areaDepth - 1);
        const maxRarity = Math.min(rarityOrder.length - 1, areaDepth + 2);
        const allGenerics = allSkills.filter(s =>
          ['basic_meditate','generic_energy_potion','generic_max_hp_up','generic_shield_potion','generic_draw_potion'].includes(s.id)
        );
        const classCards = allSkills.filter(s => {
          const rarityIndex = rarityOrder.indexOf(s.rarity);
          return s.characterBind === prev.character!.id && rarityIndex >= minRarity && rarityIndex <= maxRarity;
        });
        const shuffledG = shuffle(allGenerics);
        const shuffledC = shuffle(classCards);
        const genericsCount = Math.min(allGenerics.length, Math.max(1, Math.floor(Math.random() * 2) + 1));
        const pool = [
          ...shuffledG.slice(0, genericsCount),
          ...shuffledC.slice(0, 6 - genericsCount),
        ];
        const runWithShopItems = { ...next, shopItems: pool };
        return { ...prev, run: runWithShopItems, screen: 'shop', shopItems: pool, message: next.message };
      }
      if (next.phase === 'rest') {
        const blessings = getRandomBlessings(3, next);
        const runWithBlessings = { ...next, pendingBlessings: blessings };
        setHealUsed(false);
        return { ...prev, run: runWithBlessings, screen: 'rest', blessings, message: next.message };
      }
      if (next.phase === 'reward') {
        return { ...prev, run: next, screen: 'reward', message: next.message };
      }
      if (next.phase === 'victory') {
        recordRunEnd(true, next);
        return { ...prev, run: next, screen: 'victory', unlocks: getGlobalUnlocks(), message: next.message };
      }

      return { ...prev, run: next, screen: next.phase, message: next.message };
    });
  }, []);

  // —— 出牌 ——
  const handlePlayCard = useCallback((handIndex: number, targetId: string) => {
    if (pendingBattleResult) return;
    setApp(prev => {
      if (!prev.run || prev.screen !== 'combat') return prev;
      const aliveBefore = getAliveCombatEnemyIds(prev.run);
      const next = playSkillCard(prev.run, handIndex, targetId);
      if (next.phase === 'reward' || next.phase === 'victory') {
        const aliveAfter = getAliveCombatEnemyIds(next);
        const defeatedEnemyIds = aliveBefore.filter(id => !aliveAfter.includes(id));
        if (defeatedEnemyIds.length > 0) {
          const previewRun = markCombatEnemiesDefeated(prev.run, defeatedEnemyIds);
          return { ...prev, run: previewRun, message: next.message, pendingBattleResult: { finalRun: next, defeatedEnemyIds } };
        }
      }
      if (next.phase === 'reward') {
        return { ...prev, run: next, screen: 'reward', message: next.message, pendingBattleResult: null };
      }
      if (next.phase === 'victory') {
        recordRunEnd(true, next);
        return { ...prev, run: next, screen: 'victory', unlocks: getGlobalUnlocks(), message: next.message, pendingBattleResult: null };
      }
      if (next.phase !== 'combat') {
        return { ...prev, run: next, screen: next.phase, message: next.message, pendingBattleResult: null };
      }
      return { ...prev, run: next, message: next.message, pendingBattleResult: null };
    });
    handleTutorialCardPlayed();
  }, [handleTutorialCardPlayed, pendingBattleResult]);

  // —— 主动技能 ——
  const handleActiveSkill = useCallback((targetId: string) => {
    if (pendingBattleResult) return;
    setApp(prev => {
      if (!prev.run || prev.screen !== 'combat') return prev;
      const aliveBefore = getAliveCombatEnemyIds(prev.run);
      const next = useActiveSkill(prev.run, targetId);
      if (next.phase === 'reward' || next.phase === 'victory') {
        const aliveAfter = getAliveCombatEnemyIds(next);
        const defeatedEnemyIds = aliveBefore.filter(id => !aliveAfter.includes(id));
        if (defeatedEnemyIds.length > 0) {
          const previewRun = markCombatEnemiesDefeated(prev.run, defeatedEnemyIds);
          return { ...prev, run: previewRun, message: next.message, pendingBattleResult: { finalRun: next, defeatedEnemyIds } };
        }
      }
      if (next.phase === 'reward') {
        return { ...prev, run: next, screen: 'reward', message: next.message, pendingBattleResult: null };
      }
      if (next.phase === 'victory') {
        recordRunEnd(true, next);
        return { ...prev, run: next, screen: 'victory', unlocks: getGlobalUnlocks(), message: next.message, pendingBattleResult: null };
      }
      if (next.phase !== 'combat') {
        return { ...prev, run: next, screen: next.phase, message: next.message, pendingBattleResult: null };
      }
      return { ...prev, run: next, message: next.message, pendingBattleResult: null };
    });
  }, [pendingBattleResult]);

  // 把回合结算后的最终 RunState 路由到对应屏幕（回放结束或无回放时调用）
  const routeFinalRun = useCallback((prev: AppState, next: RunState): AppState => {
    if (next.currentMap?.boss?.id === 'dummy' && next.phase !== 'combat') {
      return { ...prev, run: next, screen: 'training_done', message: next.message, pendingBattleResult: null };
    }
    if (next.phase === 'defeat') {
      recordRunEnd(false, next);
      return { ...prev, run: next, screen: 'defeat', message: next.message, pendingBattleResult: null };
    }
    if (next.phase === 'victory') {
      recordRunEnd(true, next);
      return { ...prev, run: next, screen: 'victory', unlocks: getGlobalUnlocks(), message: next.message, pendingBattleResult: null };
    }
    if (next.phase !== 'combat') {
      return { ...prev, run: next, screen: next.phase, message: next.message, pendingBattleResult: null };
    }
    return { ...prev, run: next, message: next.message, pendingBattleResult: null };
  }, []);

  // —— 结束回合 ——
  // 注意：endCombatTurn 含随机（怪出牌/被动），必须在 setApp 更新器之外调用一次，
  // 避免 StrictMode 下更新器双调用导致随机结果不一致。
  const handleEndTurn = useCallback(() => {
    if (!app.run || app.screen !== 'combat' || enemyPlayback || pendingBattleResult) return;
    handleTutorialEndTurn();
    const { run: finalRun, enemySteps } = endCombatTurn(app.run);
    // 训练场：看到木桩打出的牌即刻解锁敌方图鉴（玩家卡牌不解锁）
    if (finalRun.isTraining) {
      const cur = getGlobalUnlocks();
      const seen = Array.from(new Set([...(cur.discoveredEnemyCards ?? []), ...(finalRun.discoveredEnemyCards ?? [])]));
      if (seen.length !== (cur.discoveredEnemyCards ?? []).length) {
        saveGlobalUnlocks({ ...cur, discoveredEnemyCards: seen });
        setApp(prev => prev.unlocks ? { ...prev, unlocks: { ...prev.unlocks, discoveredEnemyCards: seen } } : prev);
      }
    }
    // 无可播帧（怪没出牌/无状态变化）→ 直接套用最终状态
    if (enemySteps.length === 0 || !app.run.combat) {
      setApp(prev => routeFinalRun(prev, finalRun));
      return;
    }
    // 启动逐张回放：先显示第 0 帧，最终状态留到回放结束套用
    const first = enemySteps[0];
    setApp(prev => prev.run ? { ...prev, run: { ...prev.run, combat: first.combat } } : prev);
    setEnemyPlayback({ steps: enemySteps, finalRun, index: 0 });
  }, [app.run, app.screen, enemyPlayback, pendingBattleResult, handleTutorialEndTurn, routeFinalRun]);

  useEffect(() => {
    if (!pendingBattleResult) return;
    const timer = window.setTimeout(() => {
      setApp(prev => prev.pendingBattleResult ? routeFinalRun(prev, prev.pendingBattleResult.finalRun) : prev);
    }, ENEMY_DEATH_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [pendingBattleResult, routeFinalRun]);

  // 逐张出牌回放调度：每 800ms 推进一帧，结束后套用最终 RunState
  useEffect(() => {
    if (!enemyPlayback) return;
    playbackTimerRef.current = window.setTimeout(() => {
      const nextIndex = enemyPlayback.index + 1;
      if (nextIndex >= enemyPlayback.steps.length) {
        // 回放完毕：套用最终状态（可能切到 defeat/victory/reward 等屏）
        setApp(prev => routeFinalRun(prev, enemyPlayback.finalRun));
        setEnemyPlayback(null);
        return;
      }
      const step = enemyPlayback.steps[nextIndex];
      setApp(prev => prev.run ? { ...prev, run: { ...prev.run, combat: step.combat } } : prev);
      setEnemyPlayback(pb => pb ? { ...pb, index: nextIndex } : null);
    }, ENEMY_CARD_PLAYBACK_MS);
    return () => {
      if (playbackTimerRef.current !== null) window.clearTimeout(playbackTimerRef.current);
    };
  }, [enemyPlayback, routeFinalRun]);

  // —— 事件选择 ——
  const handleEventChoice = useCallback((choiceId: string) => {
    setApp(prev => {
      if (!prev.run || !prev.event) return prev;
      const choice = prev.event.choices.find(c => c.id === choiceId);
      if (!choice) return prev;

      const choiceDesc = lang === 'en' && choice.description_en ? choice.description_en : choice.description;
      const run = applyEventChoice(prev.run, prev.event, choiceId);
      const segments = [`❓ ${lang === 'en' ? 'You chose' : '你选择了'}：${choiceDesc}`];
      if (run.message) segments.push(run.message);
      const message = segments.join('\n');
      return { ...prev, run: { ...run, message }, screen: run.phase, event: null, message };
    });
  }, []);

  // —— 商店 ——
  const handleBuy = useCallback((cardId: string, price: number) => {
    setApp(prev => {
      if (!prev.run) return prev;
      const card = prev.shopItems.find(i => i?.id === cardId);
      if (!card) return prev;
      const areaDepth = ['forest', 'ruins', 'flame', 'frost', 'chaos'].indexOf(prev.run.currentArea);
      const discount = getBlessingEffectTotal(prev.run, 'shopPriceDiscount');
      const actualPrice = price === 0 ? 0 : getDiscountedShopPrice(card, areaDepth, prev.run.risk, discount);
      if (prev.run.gold < actualPrice) return prev;
      const run = buyCard(prev.run, card, actualPrice);
      const shopItems = prev.shopItems.map(item => item?.id === cardId ? null : item);

      return {
        ...prev,
        run: { ...run, shopItems },
        shopItems,
        message: run.message,
      };
    });
  }, []);

  const handleDrawGacha = useCallback(() => {
    setApp(prev => {
      if (!prev.run) return prev;
      const beforeDeckSize = prev.run.deck.length;
      const run = drawGachaCard(prev.run);
      return {
        ...prev,
        run,
        message: run.deck.length > beforeDeckSize ? run.message : t('shop.gachaFailed'),
      };
    });
  }, [t]);

  const handleDeleteCard = useCallback((cardId: string) => {
    setApp(prev => {
      if (!prev.run) return prev;
      const card = prev.run.deck.find(item => item.id === cardId);
      if (!card) return prev;
      const areaDepth = ['forest', 'ruins', 'flame', 'frost', 'chaos'].indexOf(prev.run.currentArea);
      const price = getDeletePrice(card, areaDepth);
      if (prev.run.gold < price) return prev;
      const run = deleteCard(prev.run, cardId, price);
      return {
        ...prev,
        run,
        message: run.message,
      };
    });
  }, []);

  const handleLeaveShop = useCallback(() => {
    setApp(prev => {
      if (!prev.run) return prev;
      const next = advanceToNextLayer(prev.run);
      return { ...prev, run: next, screen: next.phase, message: next.message };
    });
  }, []);

  const handleContinueLayerTransition = useCallback(() => {
    setApp(prev => {
      if (!prev.run) return prev;
      const next = confirmLayerTransition(prev.run);
      return { ...prev, run: next, screen: next.phase, message: next.message };
    });
  }, []);

  // —— 休息 ——
  const handleHeal = useCallback(() => {
    setApp(prev => {
      if (!prev.run || healUsedRef.current) return prev;
      const run = restHeal(prev.run);
      setHealUsed(true);
      return {
        ...prev,
        run,
        message: run.message,
      };
    });
  }, []);

  const handleChooseBlessing = useCallback((id: string) => {
    setApp(prev => {
      if (!prev.run) return prev;
      const blessing = blessings.find(item => item.id === id) ?? prev.run.pendingBlessings.find(item => item.id === id);
      const blessingName = (lang === 'en' && blessing?.name_en ? blessing.name_en : blessing?.name) ?? id;
      const run = chooseBlessing(prev.run, id);
      const runWithoutPendingBlessings = { ...run, pendingBlessings: [], message: `${t('log.chooseBlessing', { name: blessingName })}${run.message}` };
      return {
        ...prev,
        run: runWithoutPendingBlessings,
        screen: 'rest',
        blessings: [],
        message: run.message,
      };
    });
  }, [blessings, lang, t]);

  const handleLeaveRest = useCallback(() => {
    setApp(prev => {
      if (!prev.run) return prev;
      const next = advanceToNextLayer(prev.run);
      setHealUsed(false);
      return { ...prev, run: next, screen: next.phase, blessings: [], message: next.message };
    });
  }, []);

  // —— 重新开始 ——
  const handleRestart = useCallback(() => {
    setHealUsed(false);
    setNotice('');
    setEventLogs([]);
    prevRunRef.current = null;
    setApp({
      ...initialAppState,
      unlocks: getGlobalUnlocks(),
    });
  }, []);

  const handleRetryBoss = useCallback(() => {
    setApp(prev => {
      if (!prev.run) return prev;
      const map = prev.run.currentMap;
      const layer = map.layers[prev.run.mapPosition.layer];
      const node = layer?.nodes[prev.run.mapPosition.nodeIndex] ?? map.boss;
      const hpBeforeFight = prev.run.bossRetryHp ?? prev.run.currentMaxHp;
      const next = enterNode({ ...prev.run, currentHp: hpBeforeFight, bossRetryHp: hpBeforeFight }, node.id);
      if (next.phase === 'combat' && next.combat) {
        return { ...prev, run: next, screen: 'combat', message: next.message };
      }
      return prev;
    });
  }, []);

  const handleLoadSave = useCallback((slot: SaveSlot) => {
    const r = slot.runState;
    const isCombat = Boolean(r.combat);
    // 恢复商店/祝福上下文
    let restoredShopItems: Array<SkillCard | null> = [];
    let restoredBlessings: Blessing[] = [];
    let restoredEvent: GameEvent | null = r.activeEvent ?? null;

    if (r.phase === 'shop') {
      restoredShopItems = r.shopItems ?? [];
    }
    if (r.phase === 'rest') {
      restoredBlessings = r.pendingBlessings?.length ? r.pendingBlessings : getRandomBlessings(3, r);
    }

    setApp({
      screen: isCombat ? 'combat' : r.phase as Screen,
      run: r,
      character: r.character,
      unlocks: getGlobalUnlocks(),
      event: restoredEvent,
      shopItems: restoredShopItems,
      blessings: restoredBlessings,
      message: t('save.loaded'),
      pendingBattleResult: null,
    });
    setSaveOpen(false);
  }, [t]);

  const savePanel = saveOpen ? (
    <SaveView
      open={saveOpen}
      run={run}
      character={character}
      unlocks={unlocks}
      onLoad={handleLoadSave}
      onUnlockAllContent={handleUnlockAllContent}
      onClose={() => setSaveOpen(false)}
    />
  ) : null;

  const handleAbandonRun = useCallback(() => {
    if (!app.run || pendingBattleResult) return;
    if (!window.confirm(t('confirm.abandon'))) return;

    const nextRun = {
      ...app.run,
      combat: null,
      phase: 'defeat' as const,
      message: t('notice.runAbandoned'),
    };
    recordRunEnd(false, nextRun);
    setApp(prev => ({
      ...prev,
      run: nextRun,
      screen: 'defeat',
      message: nextRun.message,
    }));
  }, [app.run, pendingBattleResult, t]);

  const abandonBtn = run && screen !== 'select' && screen !== 'victory' && screen !== 'defeat' ? (
    <button className="abandon-run-btn top-tool-btn" onClick={handleAbandonRun} type="button" disabled={pendingBattleResult !== null}>
      🏳️ {t('btn.abandon')}
    </button>
  ) : null;

  const isTrainingCombat = run?.combat?.enemy.id === 'training_dummy' && screen === 'combat';
  const trainingReturnBtn = isTrainingCombat ? (
    <button className="training-return-btn" onClick={handleRestart} type="button">
      🏠 {t('btn.returnHome')}
    </button>
  ) : null;

  const utilityBar = (
    <div className="utility-bar">
      {manual}
      {historyBtn}
      {codexBtn}
      {saveBtn}
      {abandonBtn}
      {screen === 'select' && (
        <button className="utility-btn" onClick={() => setTrainingOpen(prev => !prev)} type="button">🎯 {t('training.btn')}</button>
      )}
    </div>
  );

  // 角色选择
  if (screen === 'select') {
    return (
      <>
        {noticeLayer}
        {langBtn}
        {historyView}
        {announcementView}
        {codexView}
        {savePanel}
        {trainingOpen && (
          <div className="training-panel modal-overlay" onClick={() => setTrainingOpen(false)}>
            <div className="training-panel-inner" onClick={e => e.stopPropagation()}>
              <h3>🎯 {t('training.panel.title')}</h3>
              <p>{t('training.panel.desc')}</p>
              <div className="training-chars">
                {visibleCharacters.map(char => (
                  <button key={char.id} className="training-char-btn" onClick={() => handleStartTraining(char)} type="button">{lang === 'en' && char.name_en ? char.name_en : char.name}</button>
                ))}
              </div>
              <button className="training-close-btn" onClick={() => setTrainingOpen(false)} type="button">{t('training.panel.close')}</button>
            </div>
          </div>
        )}
        <CharacterSelect unlocks={unlocks} onSelect={handleSelectCharacter} devMode={devMode} headerSlot={utilityBar} />
      </>
    );
  }

  // 结算
  if (screen === 'victory' || screen === 'defeat') {
    const isBossDefeat = run?.defeatedEnemyTier === 'elite' || run?.defeatedEnemyTier === 'boss';
    return (
      <>
        {manual}
        {langBtn}
        {historyBtn}
        {historyView}
        {announcementBtn}
        {announcementView}
        <ResultScreen
          victory={screen === 'victory'}
          level={run?.progress.level ?? 1}
          gold={run?.gold ?? 0}
          areaName={run?.currentArea ?? ''}
          onRestart={handleRestart}
          onRetry={screen === 'defeat' && isBossDefeat ? handleRetryBoss : undefined}
        />
      </>
    );
  }

  // 战斗中
  if (screen === 'combat' && run?.combat) {
    const { level, exp } = run.progress;
    const expNext = getLevelProgress(exp).expForNext;
    return (
      <>
        {manual}
        {langBtn}
        {noticeLayer}
        {eventLogPanel}
        {deckBtn}
        {codexBtn}
        {codexView}
        {saveBtn}
        {abandonBtn}
        {trainingReturnBtn}
        {savePanel}
        <BattleView
          combat={run.combat}
          character={run.character}
          level={level}
          exp={exp}
          expNext={expNext}
          gold={run.gold}
          onPlayCard={handlePlayCard}
          onEndTurn={handleEndTurn}
          onActiveSkill={run.character.activeSkill ? handleActiveSkill : undefined}
          locked={enemyPlayback !== null || pendingBattleResult !== null}
          enemyReveal={enemyPlayback ? enemyPlayback.steps[enemyPlayback.index]?.reveal ?? null : null}
        />
        {showTutorial && (
          <BattleTutorial
            step={tutorialStep}
            onSkip={completeBattleTutorial}
          />
        )}
        {event && <EventView event={event} gold={run.gold} currentHp={run.currentHp} maxHp={run.currentMaxHp} currentEnergy={run.combat?.playerEnergy} maxEnergy={run.combat?.playerMaxEnergy} onChoose={handleEventChoice} />}
      </>
    );
  }

  // 奖励
  if (screen === 'reward' && run) {
    return (
      <>
        {manual}
        {langBtn}
        {noticeLayer}
        {eventLogPanel}
        <div className="screen-center reward-view">
        <div className="reward-card">
          <h2>{t('reward.title')}</h2>
          <p>{message}</p>
          <div className="reward-options">
            {run.rewardChoices.map((card, index) => (
              <div className="reward-card-enter" key={card.id} style={{ '--reward-card-delay': `${index * 90}ms` } as React.CSSProperties}>
                <CardComponent card={card} size="large" onClick={() => {
                setApp(prev => {
                  if (!prev.run) return prev;
                  const next = chooseRewardCard(prev.run, card.id);
                  if (next.phase === 'victory') recordRunEnd(true, next);
                  return { ...prev, run: next, screen: next.phase, message: next.message, unlocks: next.phase === 'victory' ? getGlobalUnlocks() : prev.unlocks };
                });
              }} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => {
            setApp(prev => {
              if (!prev.run) return prev;
              const next = chooseRewardCard(prev.run, null);
              if (next.phase === 'victory') recordRunEnd(true, next);
              return { ...prev, run: next, screen: next.phase, message: next.message, unlocks: next.phase === 'victory' ? getGlobalUnlocks() : prev.unlocks };
            });
          }}>{t('reward.skip')}</button>
        </div>
      </div>
      </>
    );
  }

  // 事件
  if (screen === 'event' && event) {
    return (
      <>
        {manual}
        {langBtn}
        {noticeLayer}
        {eventLogPanel}
        {deckBtn}
        <EventView event={event} gold={run?.gold ?? 0} currentHp={run?.currentHp} maxHp={run?.currentMaxHp} onChoose={handleEventChoice} />
      </>
    );
  }

  // 技能升级祭坛
  if (screen === 'upgrade' && run) {
    const cards = run.upgradeChoices ?? [];
    return (
      <>
        {manual}
        {langBtn}
        {noticeLayer}
        {eventLogPanel}
        <div className="screen-center upgrade-view">
        <div className="upgrade-panel">
          <div className="upgrade-header">
            <span className="upgrade-icon">🔥</span>
            <div className="upgrade-heading">
              <h2>{t('upgrade.title')}</h2>
              <p className="upgrade-message">{message}</p>
            </div>
            <div className="upgrade-gold-pill">💰 {run.gold}</div>
          </div>
          <div className="upgrade-compare-list">
            {cards.map((card, index) => {
              const upgraded = skillData.find(item => item.id === card.upgradeTo);
              const upgradeCost = getUpgradeCost(card);
              if (!upgraded) return null;
              return (
                <div key={card.id} className="upgrade-compare-row" style={{ '--upgrade-row-delay': `${index * 80}ms` } as React.CSSProperties}>
                  <div className="upgrade-card-side">
                    <CardComponent card={card} size="compare" />
                  </div>
                  <div className="upgrade-arrow-row">
                    <span className="upgrade-arrow">→</span>
                    <small>{t('upgrade.cost', { value: upgradeCost })}</small>
                  </div>
                  <div className="upgrade-card-side upgraded">
                    <CardComponent card={upgraded} size="compare" />
                  </div>
                  <button
                    className="upgrade-confirm-btn"
                    disabled={run.gold < upgradeCost}
                    onClick={() => {
                      setApp(prev => {
                        if (!prev.run) return prev;
                        const next = upgradeCard(prev.run, card.id);
                        return { ...prev, run: next, screen: next.phase, message: next.message };
                      });
                    }}
                    type="button"
                  >{t('upgrade.upgrade')}</button>
                </div>
              );
            })}
            {cards.length === 0 && <p className="upgrade-empty">{t('upgrade.noCards')}</p>}
          </div>
          <button className="upgrade-skip-btn" type="button" onClick={() => {
            setApp(prev => {
              if (!prev.run) return prev;
              const next = skipUpgrade(prev.run);
              return { ...prev, run: next, screen: next.phase, message: next.message };
            });
          }}>{t('upgrade.leave')}</button>
        </div>
      </div>
      </>
    );
  }

  // 焚卡炉
  if (screen === 'burn' && run) {
    return (
      <>
        {manual}
        {langBtn}
        {noticeLayer}
        {eventLogPanel}
        <div className="screen-center burn-view">
        <div className="burn-panel">
          <div className="burn-header">
            <span className="burn-icon">🔥</span>
            <div className="burn-heading">
              <h2>{t('burn.title')}</h2>
              <p className="burn-message">{message}</p>
            </div>
          </div>
          <div className="burn-card-options">
            {run.deck.map((card, index) => (
              <button className="burn-card-choice" key={`${card.id}-${index}`} disabled={run.deck.length <= 1} style={{ '--burn-card-delay': `${index * 35}ms` } as React.CSSProperties} onClick={() => {
                setApp(prev => {
                  if (!prev.run) return prev;
                  const next = burnCard(prev.run, index);
                  return { ...prev, run: next, screen: next.phase, message: next.message };
                });
              }} type="button">
                <CardComponent card={card} size="large" />
                <strong>{t('burn.burn', { name: card.name })}</strong>
              </button>
            ))}
          </div>
          <button className="burn-leave-btn" type="button" onClick={() => {
            setApp(prev => {
              if (!prev.run) return prev;
              const next = skipBurn(prev.run);
              return { ...prev, run: next, screen: next.phase, message: next.message };
            });
          }}>{t('burn.leave')}</button>
        </div>
      </div>
      </>
    );
  }

  // 商店
  if (screen === 'shop') {
    return (
      <>
        {manual}
        {langBtn}
        {noticeLayer}
        {eventLogPanel}
        <ShopView
        gold={run?.gold ?? 0}
        items={shopItems}
        deck={run?.deck ?? []}
        onBuy={handleBuy}
        onDelete={handleDeleteCard}
        onLeave={handleLeaveShop}
        areaDepth={run ? ['forest', 'ruins', 'flame', 'frost', 'chaos'].indexOf(run.currentArea) : 0}
        risk={run?.risk ?? 0}
        priceDiscount={run ? getBlessingEffectTotal(run, 'shopPriceDiscount') : 0}
        freeCardAvailable={Boolean(run?.chosenBlessings.some((blessing) => blessing.effect.nextShopCardFree))}
        gachaDrawn={run?.gachaDrawn ?? 0}
        onDrawGacha={handleDrawGacha}
      />
      </>
    );
  }

  // 休息
  if (screen === 'rest') {
    const healAmount = run ? getRestHealPreview(run) : 0;
    return (
      <>
        {manual}
        {langBtn}
        {noticeLayer}
        {eventLogPanel}
        <RestView
        healAmount={healAmount}
        blessings={blessings}
        onHeal={handleHeal}
        healUsed={healUsed}
        onChooseBlessing={handleChooseBlessing}
        onLeave={handleLeaveRest}
      />
      </>
    );
  }

  // 区域过渡
  if (screen === 'training_done' && run) {
    return (
      <>
        {manual}
        {langBtn}
        {noticeLayer}
        {eventLogPanel}
        <div className="screen-center layer-transition-view">
          <div className="layer-transition-card">
            <span className="layer-transition-icon">🎯</span>
            <h2>{t('training.done.title')}</h2>
            <p>{t('training.done.desc')}</p>
            <button type="button" onClick={handleRestart}>🏠 {t('btn.returnHome')}</button>
          </div>
        </div>
      </>
    );
  }

  if (screen === 'layer_transition' && run) {
    return (
      <>
        {manual}
        {langBtn}
        {noticeLayer}
        {eventLogPanel}
        <div className="screen-center layer-transition-view">
          <div className="layer-transition-card">
            <span className="layer-transition-icon">🏕️</span>
            <h2>{t('transition.title')}</h2>
            <p>{message}</p>
            <p>{t('transition.desc')}</p>
            <button type="button" onClick={handleContinueLayerTransition}>{t('transition.btn')}</button>
          </div>
        </div>
      </>
    );
  }

  // 地图探索
  if (screen === 'exploration' && run) {
    return (
      <>
        {manual}
        {langBtn}
        {noticeLayer}
        {eventLogPanel}
        {deckBtn}
        {codexBtn}
        {codexView}
        {saveBtn}
        {abandonBtn}
        {savePanel}
        {nodeTransition ? (
          <NodeTransition
            fromRun={nodeTransition.fromRun}
            toRun={nodeTransition.toRun}
            selectedNodeId={nodeTransition.selectedNodeId}
            onDone={() => setNodeTransition(null)}
          />
        ) : (
          <MapView state={run} onEnterNode={handleEnterNode} />
        )}
      </>
    );
  }

  // 兜底回选择
  return (
    <>
      {manual}
      {langBtn}
      <CharacterSelect unlocks={unlocks} onSelect={handleSelectCharacter} devMode={devMode} />
    </>
  );
}
