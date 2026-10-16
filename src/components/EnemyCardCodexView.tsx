import { useMemo, useState } from 'react';
import type { AreaId } from '../types/game';
import { AREA_NAMES } from '../types/game';
import { getAllEnemyCards, getEnemyCardIcon, type EnemyCardEntry } from '../utils/enemyCards';
import { useTranslation } from '../i18n';
import { useLocalize } from '../i18n/data';

interface Props {
  open: boolean;
  onClose: () => void;
  discoveredEnemyCards: string[];
  tabSlot?: React.ReactNode;
}

const AREA_NAMES_EN: Record<AreaId, string> = {
  forest: 'Misty Forest',
  ruins: 'Ancient Ruins',
  flame: 'Flame Lands',
  frost: 'Frost Temple',
  chaos: 'Chaos Abyss',
};

const AREA_ORDER: AreaId[] = ['forest', 'ruins', 'flame', 'frost', 'chaos'];

function getCardIcon(type: string): string {
  const icons: Record<string, string> = {
    attack: '⚔️', defense: '🛡️', heal: '💚', buff: '✨', debuff: '💀', special: '🔮',
  };
  return icons[type] ?? '❓';
}

export function EnemyCardCodexView({ open, onClose, discoveredEnemyCards, tabSlot }: Props) {
  const { t, lang } = useTranslation();
  const loc = useLocalize();
  const [areaFilter, setAreaFilter] = useState<'all' | AreaId>('all');
  const [searchText, setSearchText] = useState('');

  const allEntries = useMemo(() => getAllEnemyCards(), []);
  const discoveredSet = useMemo(() => new Set(discoveredEnemyCards), [discoveredEnemyCards]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      if (areaFilter !== 'all' && entry.area !== areaFilter) return false;
      if (!searchText) return true;
      const lower = searchText.toLowerCase();
      return entry.card.name.toLowerCase().includes(lower)
        || (entry.card.name_en ?? '').toLowerCase().includes(lower)
        || entry.card.id.toLowerCase().includes(lower);
    });
  }, [allEntries, areaFilter, searchText]);

  // 按怪物分组，保留 getAllEnemyCards 的怪物自然顺序（同怪的牌连续展示）
  const groups = useMemo(() => {
    const order: string[] = [];
    const byEnemy = new Map<string, EnemyCardEntry[]>();
    for (const entry of filteredEntries) {
      if (!byEnemy.has(entry.enemyId)) {
        byEnemy.set(entry.enemyId, []);
        order.push(entry.enemyId);
      }
      byEnemy.get(entry.enemyId)!.push(entry);
    }
    return order.map(enemyId => ({ enemyId, items: byEnemy.get(enemyId)! }));
  }, [filteredEntries]);

  if (!open) return null;

  const discoveredCount = allEntries.filter(e => e.cardIds.some(id => discoveredSet.has(id))).length;
  const totalCount = allEntries.length;
  const areaName = (area: AreaId) => lang === 'en' ? AREA_NAMES_EN[area] : AREA_NAMES[area];
  const areaOptions = [{ id: 'all' as const, name: t('enemyCodex.allAreas') }, ...AREA_ORDER.map(a => ({ id: a, name: areaName(a) }))];

  return (
    <div className="codex-overlay" onClick={onClose}>
      <div className="codex-panel" onClick={e => e.stopPropagation()}>
        <div className="codex-header">
          <h2>👾 {t('enemyCodex.title')}</h2>
          {tabSlot}
          <span className="codex-progress">
            {t('codex.progress', { discovered: discoveredCount, total: totalCount })} · {t('codex.totalCards', { count: filteredEntries.length })}
          </span>
          <button className="codex-close-btn" onClick={onClose} type="button">✕</button>
        </div>

        <div className="codex-filters">
          <input
            className="codex-search"
            type="text"
            placeholder={t('enemyCodex.search')}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <div className="codex-char-filter">
            <select value={areaFilter} onChange={e => setAreaFilter(e.target.value as 'all' | AreaId)}>
              {areaOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div className="enemy-codex-scroll">
        {groups.map(group => {
          const head = group.items[0];
          return (
            <div className="enemy-codex-group" key={group.enemyId}>
              <h3 className="enemy-codex-group-title">
                {loc.n({ name: head.enemyName, name_en: head.enemyName_en })}
                <span className="enemy-codex-group-area">{areaName(head.area)}</span>
              </h3>
              <div className="codex-grid">
                {group.items.map((entry: EnemyCardEntry) => {
                  const card = entry.card;
                  const isDiscovered = entry.cardIds.some(id => discoveredSet.has(id));
                  return (
                    <div
                      key={card.id}
                      className={`codex-card${isDiscovered ? '' : ' codex-card-undiscovered'}`}
                      style={{ '--codex-rarity': '#e74c3c' } as React.CSSProperties}
                    >
                      {isDiscovered ? (
                        <>
                          <div className="codex-card-header">
                            <span className="codex-card-cost">{card.cost}</span>
                            {entry.count > 1 && <span className="codex-card-copies">×{entry.count}</span>}
                            <span>{getCardIcon(card.type)}</span>
                          </div>
                          <div className="codex-card-art">
                            <img
                              src={getEnemyCardIcon(card.id)}
                              alt={loc.n(card)}
                              className="codex-card-img"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.style.display = 'none';
                                const icon = img.nextElementSibling as HTMLElement | null;
                                if (icon) icon.style.display = '';
                              }}
                            />
                            <span className="codex-card-icon" style={{ display: 'none' }}>{getCardIcon(card.type)}</span>
                          </div>
                          <div className="codex-card-name">{loc.n(card)}</div>
                          <div className="codex-card-desc">{loc.d(card)}</div>
                        </>
                      ) : (
                        <>
                          <div className="codex-card-header"><span className="codex-card-cost">?</span></div>
                          <div className="codex-card-art codex-card-art-locked"><span className="codex-card-icon">🔒</span></div>
                          <div className="codex-card-name">???</div>
                          <div className="codex-card-desc codex-card-desc-locked">{t('card.undiscovered')}</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {groups.length === 0 && <div className="codex-empty">{t('codex.empty')}</div>}
        </div>
      </div>
    </div>
  );
}
