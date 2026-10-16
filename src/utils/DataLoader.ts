/**
 * 《勇者大冒险》- 数据加载器
 * 单⼀真相源：所有游戏内容从 JSON/CSV 加载，不硬编码
 */
import type { CharacterConfig } from '../types/game';
import characters from '../data/characters.json';
import skills from '../data/skills.json';
import enemies from '../data/enemies.json';
import areas from '../data/areas.json';
import maps from '../data/maps.json';
import events from '../data/events.json';
import blessings from '../data/blessings.json';

// 携带类型信息重新导出
export const characterData = characters as CharacterConfig[];
export const skillData = skills as any[];
export const enemyData = enemies as any[];
export const areaData = areas as any[];
export const mapData = maps as any[];
export const eventData = events as any[];
export const blessingData = blessings as any[];

/** CSV 解析器 */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(l => !l.startsWith('#'));
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] ?? '' }), {} as Record<string, string>);
  });
}

/** CSV → 数值对象 */
export function parseCsvNumbers(text: string): Record<string, number>[] {
  return parseCsv(text).map(row => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = Number(v) || 0;
    }
    return out;
  });
}
