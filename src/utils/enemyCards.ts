/**
 * 怪物卡牌聚合：从 enemyData 提取全部「唯一」怪牌，供怪物图鉴展示。
 * 去重规则：同 id 视为同一张牌（数据里 w_bite/w_bite2 等纯副本会归并为各自 id，
 * 但同一 id 在多个怪/牌组中只保留首次出现）。
 */
import { enemyData } from './DataLoader';
import type { EnemyCard, AreaId } from '../types/game';
import { asset } from './assetUrl';

export interface EnemyCardEntry {
  card: EnemyCard;
  /** 首次出现该牌的怪物 id */
  enemyId: string;
  /** 首次出现该牌的怪物名称 */
  enemyName: string;
  enemyName_en?: string;
  /** 所属区域 */
  area: AreaId;
  /** 同名同效的牌在该怪卡组内的份数（如「撕咬」×3） */
  count: number;
  /** 被合并的全部卡牌 id（解锁判定：任一 id 命中即视为已解锁） */
  cardIds: string[];
}

let cachedEntries: EnemyCardEntry[] | null = null;

/** 合并键：同名、同效果、同费用、同类型视为同一张牌 */
function mergeKey(card: EnemyCard): string {
  return `${card.name}|${JSON.stringify(card.effect)}|${card.cost}|${card.type}`;
}

/**
 * 聚合全部怪牌（结果缓存）：
 * - 同一怪卡组内同名同效的重复牌合并为一条，记录份数 count；
 * - 跨怪/跨牌组的同种牌按合并键全局去重（只保留首次出现）。
 */
export function getAllEnemyCards(): EnemyCardEntry[] {
  if (cachedEntries) return cachedEntries;

  const seenKeys = new Set<string>();
  const entries: EnemyCardEntry[] = [];

  for (const enemy of enemyData) {
    const grouped = new Map<string, { card: EnemyCard; ids: string[] }>();
    for (const card of enemy.deck) {
      const key = mergeKey(card);
      const existing = grouped.get(key);
      if (existing) {
        existing.ids.push(card.id);
      } else {
        grouped.set(key, { card, ids: [card.id] });
      }
    }

    for (const [key, group] of grouped) {
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      entries.push({
        card: group.card,
        enemyId: enemy.id,
        enemyName: enemy.name,
        enemyName_en: enemy.name_en,
        area: enemy.area,
        count: group.ids.length,
        cardIds: group.ids,
      });
    }
  }

  cachedEntries = entries;
  return entries;
}

/** 怪牌专属配图路径（与 BattleView 保持一致） */
export function getEnemyCardIcon(cardId: string): string {
  return asset(`assets/skill_icons/enemy/${cardId}.svg`);
}
