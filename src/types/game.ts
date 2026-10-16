// ============================================================
// 《勇者大冒险》- 核心类型定义
// 数据驱动：所有角色/卡牌/敌人/地图为 JSON 配置
// ============================================================

// —— 稀有度体系 ——
export type RarityColor = 'white' | 'green' | 'blue' | 'purple' | 'orange' | 'red';

export const RARITY_ORDER: Record<RarityColor, number> = {
  white: 0,
  green: 1,
  blue: 2,
  purple: 3,
  orange: 4,
  red: 5,
};

// —— 角色系统 ——
export type CharacterClass =
  | 'ironwall'       // 铁壁守卫
  | 'shadowblade'    // 影刃刺客
  | 'lifesage'       // 生命贤者
  | 'taichimonk'     // 太极武僧
  | 'holylight'      // 圣光战士
  | 'wealthmerchant' // 游侠商人
  | 'undeadpriest'   // 亡灵祭司
  | 'armorbreaker'   // 狂战士
  | 'elementmage'    // 元素法师
  | 'omnisage'       // 全能贤者
  | 'combatmaster'   // 格斗大师
  | 'frostpriest'    // 冰霜祭司
  | 'thornguardian' // 荆棘守卫
  | 'devourer'      // 吞噬者
  | 'generic'       // 通用卡
  | 'developer';     // 开发者角色

export type RoleTag = 'tank' | 'damage' | 'healer' | 'support' | 'economy' | 'control';

export interface ActiveSkill {
  name: string;
  name_en?: string;
  description: string;
  description_en?: string;
}

export interface CharacterConfig {
  id: CharacterClass;
  name: string;
  name_en?: string;
  title: string;
  title_en?: string;
  role: RoleTag[];
  baseHp: number;
  baseEnergy: number;
  description: string;
  description_en?: string;
  passiveName: string;
  passiveName_en?: string;
  passiveDescription: string;
  passiveDescription_en?: string;
  unlockCondition: 'starter' | 'boss1' | 'boss2' | 'boss3' | 'boss4' | 'boss5' | 'devmode';
  mainColor: string;
  activeSkill?: ActiveSkill;
}

// —— 技能卡牌系统 ——
export type SkillType = 'attack' | 'defense' | 'heal' | 'buff' | 'debuff' | 'economy' | 'special';

export interface SkillEffect {
  damage?: number;
  heal?: number;
  armor?: number;
  drawCards?: number;
  energyGain?: number;
  maxEnergyGain?: number;
  applyStatus?: StatusEffect;
  damageMultiplier?: number;
  goldCost?: number;
  goldGain?: number;
  immediateGold?: number;
  maxHpGain?: number;
  healPercent?: number;
  postCombatHeal?: number;
  rewardChoiceBonus?: number;
  shopPriceDiscount?: number;
  restHealPercentBonus?: number;
  riskChange?: number;
  nextShopCardFree?: boolean;
  damageToAll?: number;
  executeThreshold?: number;
  /** 灼烧目标蓝量/能量：怪打玩家扣 playerEnergy，玩家打怪扣 currentEnergy */
  manaBurn?: number;
  /** 给自己回蓝/能量 */
  manaGain?: number;
  /** 向对方弃牌堆注入废牌污染牌库 */
  injectCard?: { card: 'jam'; count: number };
  /** 连击终结技：本回合打出combo后额外伤害 */
  comboFinisher?: number;
  /** 引爆：对目标立即结算所有持续伤害（灼烧/中毒/流血） */
  detonate?: number;
  /** 获得敏捷层数（每层持续1回合，累计叠加提升闪避率） */
  agileGain?: number;
  /** 获得圣光蓄能层数（用于 radiGain 翻倍等效果） */
  radianceGain?: number;
  /** 圣光爆发：消耗所有 radiGain 层数，每层造成等量伤害 */
  radianceBurst?: number;
  /** 圣光裁决：消耗所有圣光，每层获得强化并对敌人施加虚弱 */
  radianceJudgment?: number;
  /** 反击强化：使本回合/下回合反击伤害加成 */
  retaliateBoost?: number;
  /** 穷追猛打：对负面状态敌人额外伤害百分比 */
  ravenous?: number;
  /** 回响：给自己施加 echo 层数（接下来的牌额外触发一次），持续1回合 */
  echoGain?: number;
  /** 护甲转伤：每点护甲额外造成伤害的比例 */
  armorScale?: number;
  /** 脆弱转伤：每层脆弱额外造成伤害的值 */
  fragileScale?: number;
  /** 灼烧转伤：每层灼烧额外造成伤害的值 */
  burnScale?: number;
  /** 火焰审判：消耗目标全部灼烧，每层额外伤害 */
  consumeBurnDamage?: number;
  /** 麻痹转伤：每层麻痹额外造成伤害的值 */
  paralyzeScale?: number;
  /** 虚弱转护甲：目标每层虚弱获得护甲的值 */
  weakArmorScale?: number;
  /** 目标有虚弱时抽牌 */
  drawIfWeak?: number;
  /** 本回合结束时保留护甲百分比 */
  retainArmorPercent?: number;
  /** 目标有麻痹时抽牌 */
  drawIfParalyzed?: number;
  /** 目标有麻痹时获得能量 */
  energyIfParalyzed?: number;
  /** 目标无麻痹时施加麻痹 */
  paralyzeIfNone?: number;
  /** 目标有麻痹时消耗麻痹层数 */
  consumeParalyze?: number;
  /** 血量消耗：使用此卡先自伤 */
  hpCost?: number;
  /** 狂暴额外伤害（狂战士）：处于 berserk 状态时，此攻击额外造成的伤害 */
  berserkDamage?: number;
}

export type StatusTarget = 'enemy' | 'player';

export type StatusEffectType =
  | 'burn'
  | 'poison'
  | 'bleed'
  | 'fragile'
  | 'weak'
  | 'paralyze'
  | 'empower'
  | 'regen'
  | 'armor'
  | 'agile'
  | 'taunt'
  | 'stun'
  | 'freeze'
  | 'echo'
  | 'combo'
  | 'berserk';

export interface StatusEffect {
  type: StatusEffectType;
  value: number;
  duration: number;
  target?: StatusTarget;
}

export interface SkillCard {
  id: string;
  name: string;
  tier: number;
  rarity: RarityColor;
  cost: number;
  type: SkillType;
  effect: SkillEffect;
  description: string;
  description_en?: string;
  upgradeTo: string | null;
  characterBind: CharacterClass;
  flavorText: string;
  name_en?: string;
  flavorText_en?: string;
  tags?: string[];
}

// —— 敌人系统 ——
export type EnemyTier = 'normal' | 'elite' | 'boss';

// 怪物卡牌：复用玩家 SkillEffect 结构，怪物自己的牌组单位
export interface EnemyCard {
  id: string;
  name: string;
  name_en?: string;
  cost: number;                 // 蓝量消耗（>=1，避免 0 费死循环）
  type: SkillType;              // 复用 attack/defense/heal/buff/debuff/special
  effect: SkillEffect;          // 复用 damage/armor/heal/applyStatus/damageToAll
  description: string;
  description_en?: string;
}

export interface EnemyConfig {
  id: string;
  name: string;
  name_en?: string;
  tier: EnemyTier;
  hp: number;
  energy: number;                // 每回合回满的蓝量上限
  handSize?: number;             // 每回合抽到的手牌目标数（缺省由 energy 推算）
  description: string;
  deck: EnemyCard[];             // 怪物初始牌库（开战洗入抽牌堆）
  rewards: {
    exp: number;
    gold: number;
    cardRarity: RarityColor;
  };
  area: AreaId;
  traits?: string[];
  weaknesses?: string[];
  resistances?: string[];
  traitHints?: string[];
}

// —— 区域/地图系统 ——
export type AreaId =
  | 'forest'
  | 'ruins'
  | 'flame'
  | 'frost'
  | 'chaos';

export const AREA_NAMES: Record<AreaId, string> = {
  forest: '迷雾森林',
  ruins: '古城遗迹',
  flame: '烈焰之地',
  frost: '冰封神殿',
  chaos: '混沌深渊',
};

export interface AreaConfig {
  id: AreaId;
  name: string;
  bossId: string;
  bossNumber: 1 | 2 | 3;
  minEnemyTier: EnemyTier;
  maxEnemyTier: EnemyTier;
}

export interface MapNode {
  type: 'battle' | 'elite' | 'boss' | 'shop' | 'event' | 'rest' | 'reward' | 'skill_altar' | 'burn_altar';
  id: string;
  label: string;
  enemies?: string[];
  /** 可达的下一层节点 id 列表，为空表示可连接所有下一层节点 */
  nextNodes?: string[];
}

export interface MapLayer {
  nodes: MapNode[];
}

export interface MapConfig {
  id: string;
  areaId: AreaId;
  layers: MapLayer[];
  boss: MapNode;
}

// —— 事件系统 ——
export interface EventChoice {
  id: string;
  label: string;
  label_en?: string;
  description: string;
  description_en?: string;
  effects: {
    goldChange?: number;
    hpChange?: number;
    cardReward?: string;
    cardRewardPool?: 'class' | 'generic' | 'any';
    cardRewardRarity?: RarityColor;
    removeRandomBasicCard?: boolean;
    upgradeRandomCard?: boolean;
    upgradeBasicOnly?: boolean;
    temporaryArmor?: number;
    maxHpChange?: number;
    maxEnergyChange?: number;
    riskChange?: number;
    handLimitChange?: number;
    drawPerTurnChange?: number;
  };
  outcomeText: string;
  outcomeText_en?: string;
}

export interface GameEvent {
  id: string;
  title: string;
  title_en?: string;
  description: string;
  description_en?: string;
  choices: EventChoice[];
  areaId?: AreaId;
  scope?: 'area' | 'generic';
  weight?: number;
  rarity?: string;
  /**
   * 事件等级，影响按层深的出现概率（缺省视为 normal）：
   * - normal：权重恒定
   * - advanced：橙卡/永久强化事件，中后段逐渐出现
   * - elite：红卡事件，约第三层才开始出现，深层概率也保持较低
   */
  tier?: 'normal' | 'advanced' | 'elite';
}

// —— 祝福系统 ——
export interface Blessing {
  id: string;
  name: string;
  name_en?: string;
  description: string;
  description_en?: string;
  effect: SkillEffect;
  duration: 'battle' | 'run';
}

// —— 游戏运行时状态 ——
export interface CombatState {
  fxEvents?: CombatFxEvent[];
  playerHp: number;
  playerMaxHp: number;
  playerEnergy: number;
  playerMaxEnergy: number;
  playerArmor: number;
  enemy: EnemyInstance;
  extraEnemies: EnemyInstance[];
  defeatedEnemies: EnemyInstance[];
  currentEnemyIndex: number;
  hand: SkillCard[];
  deck: SkillCard[];
  discard: SkillCard[];
  exhausted: SkillCard[];
  /** 本回合已打出、尚未进弃牌堆的牌，下回合玩家行动开始时并入 discard */
  playerInPlay: SkillCard[];
  newlyDrawnIndexes: number[];
  /** 每次实际抽到牌时递增，用于 UI 区分相同手牌数量/索引的抽牌动画 */
  drawEventId?: number;
  blessings: Blessing[];
  turnNumber: number;
  playedCardTypesThisTurn: SkillType[];
  playerStatusEffects: AppliedStatusEffect[];
  handLimit: number;
  drawPerTurn: number;
  consecutiveAttacks?: number;
  /** 圣光祭司：圣光蓄能层数 */
  radianceStacks?: number;
  /** 狂战士：怒气点数 */
  ragePoints?: number;
  /** 荆棘守卫：本回合反击强化累计加成（百分比，回合结束清零） */
  playerRetaliateBonus?: number;
  /** 玩家本次出牌每段实际造成的生命伤害，用于 UI 分段掉血回放 */
  playerAttackHits?: Record<string, number[]>;
  lastEnemyAction?: {
    enemyId: string;
    attackedPlayer: boolean;
    damagedPlayer: boolean;
    shieldedPlayer: boolean;
    brokePlayerArmor?: boolean;
    affectedSelf: boolean;
    actionKey?: string;
    hits?: number;
    fxEvents?: CombatFxEvent[];
  };
}

export interface EnemyInstance extends EnemyConfig {
  instanceId: string;
  currentHp: number;
  currentEnergy: number;        // 当前蓝量（每个怪自己回合开始时回满 = energy）
  armor: number;
  statusEffects: AppliedStatusEffect[];
  /** 抽牌堆（开战由 deck 洗牌而来；空时把 discard 洗回） */
  drawPile: EnemyCard[];
  /** 手牌（每回合抽到 handSize 张，从中随机出得起的牌） */
  hand: EnemyCard[];
  /** 弃牌堆（出过的牌进入此处） */
  discard: EnemyCard[];
  /** 本回合已打出、尚未进弃牌堆的牌，下回合该怪行动开始时并入 discard */
  inPlay: EnemyCard[];
  /** 每回合抽牌目标数（实例化时由 config.handSize 或 energy 推算） */
  handSize: number;
}

/** 怪物回合逐张出牌的单帧快照，供 UI 按时间回放 */
export interface CombatFxEvent {
  id: string;
  target: 'player' | 'enemy';
  enemyId?: string;
  type: StatusEffectType | 'dodge';
  phase: 'applied' | 'triggered' | 'tick';
}

export interface EnemyTurnStep {
  combat: CombatState;          // 该帧结算后的完整战斗快照
  reveal: {
    enemyId: string;
    enemyName: string;
    enemyName_en?: string;
    cardName: string;
    cardName_en?: string;
    cardType: SkillType;
    card?: EnemyCard;             // 完整怪牌，供中部舞台正面渲染配图
    damage?: number;
    armor?: number;
    heal?: number;
    statusType?: StatusEffectType;
    /** 多段攻击打击次数（用于逐段重放受击特效） */
    hits?: number;
  } | null;                     // null = 起手状态结算帧 / 被控帧，无卡牌弹窗
  message: string;              // 该帧对应的事件记录文字
  fxEvents?: CombatFxEvent[];
}

export interface AppliedStatusEffect {
  type: StatusEffect['type'];
  value: number;
  remainingTurns: number;
}

export interface PlayerProgress {
  level: number;
  exp: number;
  skillSlots: number;
  passiveSlots: number;
  hpMultiplier: number;
  energyMultiplier: number;
  handSize: number;
  handLimit: number;
  drawPerTurn: number;
  bonusMaxHp?: number;
  bonusMaxEnergy?: number;
}

export interface RunState {
  character: CharacterConfig;
  progress: PlayerProgress;
  combat: CombatState | null;
  gold: number;
  deck: SkillCard[];
  currentHp: number;
  currentMaxHp: number;
  risk: number;
  undeadKillCount: number;
  cardsPlayedCount: number;
  discoveredCards: string[];
  discoveredEnemies: string[];
  discoveredEnemyCards: string[];
  discoveredCombos: string[];
  mapPosition: { layer: number; nodeIndex: number };
  /** 已访问过的节点 id 路径，用于分支地图判断可见节点 */
  path: string[];
  currentArea: AreaId;
  currentMap: MapConfig;
  chosenBlessings: Blessing[];
  rewardChoices: SkillCard[];
  upgradeChoices: SkillCard[];
  rewardAfter?: 'layer_transition';
  lastExpGain?: {
    fromExp: number;
    toExp: number;
    fromLevel: number;
    toLevel: number;
    playOnMap: boolean;
  };
  bossRetryHp?: number;
  defeatedEnemyTier?: 'normal' | 'elite' | 'boss';
  /** 训练场标记：不解锁玩家卡牌图鉴，仅解锁木桩打出的敌方卡牌 */
  isTraining?: boolean;
  activeEvent: GameEvent | null;
  shopItems: Array<SkillCard | null>;
  gachaDrawn: number;
  pendingBlessings: Blessing[];
  phase: 'exploration' | 'combat' | 'reward' | 'event' | 'shop' | 'rest' | 'upgrade' | 'burn' | 'layer_transition' | 'victory' | 'defeat';
  message: string;
}

// —— 历史记录 ——
export interface RunHistoryEntry {
  characterId: CharacterClass;
  characterName: string;
  victory: boolean;
  areaReached: AreaId;
  areaReachedName: string;
  level: number;
  gold: number;
  deck: string[];         // card ids
  cardsPlayedCount: number;
  timestamp: number;
  bossKills: number;
}

// —— 全局解锁进度 ——
export interface GlobalUnlocks {
  unlockedCharacters: CharacterClass[];
  unlockedBlessings: string[];
  maxLevel: number;
  achievements: string[];
  discoveredCards: string[];
  discoveredEnemies: string[];
  discoveredEnemyCards: string[];
  discoveredCombos: string[];
  totalRuns: number;
  totalVictories: number;
  totalBossKills: number;
  runHistory: RunHistoryEntry[];
}

// —— 配置 ——
export interface GameConstants {
  baseHandSize: number;
  maxHandSize: number;
  baseEnergyPerTurn: number;
  maxEnergy: number;
  startingGold: number;
  shopPriceMultiplier: number;
  levelExpCurve: number[];
  levelBonuses: LevelBonus[];
}

export interface LevelBonus {
  hpBonus: number;
  energyBonus: number;
  unlocksSlot: boolean;
  skillUpgrade: boolean;
  passiveSlot: boolean;
}

// ============================================================
// 向后兼容类型（与原 gameSystems.ts / App.tsx 兼容）
// ============================================================

export type OldResourceKey =
  | 'hp'
  | 'maxHp'
  | 'stamina'
  | 'maxStamina'
  | 'food'
  | 'wood'
  | 'metal'
  | 'pelt'
  | 'herb'
  | 'bone'
  | 'parts'
  | 'poison'
  | 'silk';

export type OldResourceBag = Record<OldResourceKey, number>;
export type ResourceBag = OldResourceBag;
export type ResourceKey = OldResourceKey;

export type OldCardType = 'weapon' | 'tool' | 'consumable' | 'trap' | 'armor' | 'skill';
export type OldCardEffect = 'attack' | 'gather' | 'healHp' | 'healStamina' | 'special' | 'defense' | 'skipCombat' | 'scout';
export type OldRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CardDefinition {
  id: string;
  name: string;
  type: OldCardType;
  effect: OldCardEffect;
  value: number;
  description: string;
  tags: string[];
  rarity: OldRarity;
  starter: boolean;
  icon: string;
}

export interface CardInstance extends CardDefinition {
  instanceId: string;
}

export type OldEncounterType = 'combat' | 'gather';

export interface EncounterDefinition {
  id: string;
  name: string;
  type: OldEncounterType;
  hp: number;
  attack: number;
  tags: string[];
  weaknessTags: string[];
  rewards: Partial<Record<OldResourceKey, number>>;
  description: string;
  icon: string;
}

export interface ActiveEncounter extends EncounterDefinition {
  currentHp: number;
  maxHp: number;
}

export interface EventOption {
  id: string;
  label: string;
  description: string;
  requires?: Partial<Record<OldResourceKey, number>>;
  resourceChanges: Partial<Record<OldResourceKey, number>>;
  cardRewards?: string[];
  message: string;
}

export interface StoryEvent {
  id: string;
  title: string;
  description: string;
  options: EventOption[];
}

export type OldEquipmentSlot = 'weapon' | 'armor' | 'tool';
export type OldEquipmentBonusType = 'attack' | 'defense' | 'gather';

export interface EquipmentItem {
  id: string;
  name: string;
  slot: OldEquipmentSlot;
  bonusType: OldEquipmentBonusType;
  bonus: number;
  durability: number;
  description: string;
}

export interface EquippedItem extends EquipmentItem {
  currentDurability: number;
}

export type EquipmentState = Record<OldEquipmentSlot, EquippedItem | null>;
export type OldTurnPhase = 'draw' | 'action' | 'end' | 'advance';
export type OldScene = 'board' | 'camp';

export interface GameMessage {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'danger';
}

export interface GameState {
  scene: OldScene;
  resources: OldResourceBag;
  equipment: EquipmentState;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  exhausted: CardInstance[];
  currentEncounter: ActiveEncounter | null;
  pendingEvent: StoryEvent | null;
  rewardChoices: CardDefinition[];
  phase: OldTurnPhase;
  actionsLeft: number;
  progress: number;
  runNumber: number;
  nextNodePreview: string | null;
  message: GameMessage;
}

export interface ConstantsConfig {
  areaName: string;
  maxProgress: number;
  drawCount: number;
  maxHandSize: number;
  actionsPerTurn: number;
  initialResources: OldResourceBag;
  camp: {
    healFoodCost: number;
    healAmount: number;
    repairWoodCost: number;
    repairAmount: number;
  };
}

export interface SaveData {
  version: 1;
  savedAt: string;
  state: GameState;
}
