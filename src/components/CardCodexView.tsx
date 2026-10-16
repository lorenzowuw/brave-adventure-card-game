import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { SkillCard, RarityColor } from '../types/game';
import { characterData, skillData } from '../utils/DataLoader';
import { useTranslation } from '../i18n';
import { useLocalize } from '../i18n/data';
import { asset } from '../utils/assetUrl';
import { buildUpgradeChain, getUnifiedCardDisplayName } from '../utils/card';

const allSkills = skillData as SkillCard[];
const visibleSkills = allSkills.filter(card => card.characterBind !== 'developer');

interface Props {
  open: boolean;
  onClose: () => void;
  discoveredCards: string[];
  tabSlot?: React.ReactNode;
}

const RARITY_COLORS: Record<string, string> = {
  white: '#b0b0b0',
  green: '#4ade80',
  blue: '#60a5fa',
  purple: '#c084fc',
  orange: '#fb923c',
  red: '#ef4444',
};

function getSkillIcon(type: string): string {
  const icons: Record<string, string> = {
    attack: '⚔️', defense: '🛡️', heal: '💚', buff: '✨', debuff: '💀', economy: '💰', special: '🔮',
  };
  return icons[type] ?? '❓';
}

// 卡牌专属配图，与 CardComponent 保持一致：id 专属 svg → 角色+类型 png 兜底
function getSkillImage(card: SkillCard): string {
  return asset(`assets/skill_icons/${card.id}.svg`);
}

function getFallbackSkillImage(card: SkillCard): string {
  const base = asset(`assets/skill_icons/${card.characterBind}`);
  const typeMap: Record<string, string> = {
    attack: `${base}_atk.png`,
    defense: `${base}_def.png`,
    heal: `${base}_heal.png`,
    buff: `${base}_buff.png`,
    debuff: `${base}_debuff.png`,
    special: `${base}_special.png`,
    economy: `${base}_atk.png`,
  };
  return typeMap[card.type] ?? `${base}.png`;
}

function getEffectSummary(card: SkillCard, lang: string): string {
  return lang === 'en' && (card as any).description_en ? (card as any).description_en : card.description;
}

function getCardRootIds(): Set<string> {
  const upgradedIds = new Set(visibleSkills.map(card => card.upgradeTo).filter(Boolean));
  return new Set(visibleSkills.filter(card => !upgradedIds.has(card.id)).map(card => card.id));
}

const RARITY_ORDER: RarityColor[] = ['white', 'green', 'blue', 'purple', 'orange', 'red'];

export function CardCodexView({ open, onClose, discoveredCards, tabSlot }: Props) {
  const { t } = useTranslation();
  const loc = useLocalize();
  const [rarityFilter, setRarityFilter] = useState<'all' | RarityColor>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTopRef = useRef(0);

  const rootIds = useMemo(() => getCardRootIds(), []);

  const unifiedName = (card: SkillCard): string => getUnifiedCardDisplayName(card, loc.lang);

  // 展示卡：默认每链根卡；选定稀有度时取该链中对应稀有度的那一阶（无则该链不展示）。
  // rootId/root 始终指向链首，保证点开详情时展示完整升级链、且名字统一。
  const displayCards = useMemo(() => {
    return visibleSkills
      .filter(card => rootIds.has(card.id))
      .map(root => {
        const shown = rarityFilter === 'all'
          ? root
          : buildUpgradeChain(root).find(c => c.rarity === rarityFilter) ?? null;
        return shown ? { shown, root, rootId: root.id } : null;
      })
      .filter((e): e is { shown: SkillCard; root: SkillCard; rootId: string } => e !== null)
      .filter(({ root }) => {
        if (!searchText) return true;
        const lower = searchText.toLowerCase();
        return root.name.toLowerCase().includes(lower)
          || ((root as any).name_en ?? '').toLowerCase().includes(lower)
          || root.id.toLowerCase().includes(lower);
      });
  }, [rarityFilter, rootIds, searchText]);

  // 按角色分组，保留 characterData 的角色顺序；组内保留数据(根卡)顺序，
  // 这样切换稀有度时卡片位置固定不跳动。
  const groups = useMemo(() => {
    const chars = (characterData as Array<{ id: string; name: string; name_en?: string }>).filter(char => char.id !== 'developer');
    const order = [...chars.map(c => c.id), 'generic'];
    const byChar = new Map<string, typeof displayCards>();
    for (const entry of displayCards) {
      const key = order.includes(entry.shown.characterBind) ? entry.shown.characterBind : 'generic';
      if (!byChar.has(key)) byChar.set(key, []);
      byChar.get(key)!.push(entry);
    }
    return order
      .filter(id => byChar.has(id))
      .map(id => {
        const c = chars.find(ch => ch.id === id);
        const name = c ? loc.n(c) : t('codex.generic');
        return { id, name, items: byChar.get(id)! };
      });
  }, [displayCards, loc, t]);

  useLayoutEffect(() => {
    if (selectedRootId !== null) return;
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    scrollElement.scrollTop = savedScrollTopRef.current;
  }, [selectedRootId]);

  if (!open) return null;

  const selectedRoot = selectedRootId ? visibleSkills.find(card => card.id === selectedRootId) : null;
  const selectedChain = selectedRoot ? buildUpgradeChain(selectedRoot) : [];
  const discoveredCount = visibleSkills.filter(c => discoveredCards.includes(c.id)).length;
  const totalCount = visibleSkills.length;

  return (
    <div className="codex-overlay" onClick={onClose}>
      <div className="codex-panel" onClick={e => e.stopPropagation()}>
        <div className="codex-header">
          <h2>📖 {t('codex.title')}</h2>
          {tabSlot}
          <span className="codex-progress">
            {t('codex.progress', { discovered: discoveredCount, total: totalCount })} · {t('codex.totalCards', { count: displayCards.length })}
          </span>
          <button className="codex-close-btn" onClick={onClose} type="button">✕</button>
        </div>

        {selectedRoot ? (
          <div className="codex-detail-view">
            <button className="codex-back-btn" onClick={() => setSelectedRootId(null)} type="button">← {t('history.back')}</button>
            <h3>{unifiedName(selectedRoot)} · {selectedChain.length}{loc.lang === 'en' ? ' stages' : '阶升级'}</h3>
            <div className="codex-upgrade-chain">
              {selectedChain.map(card => {
                const isDiscovered = discoveredCards.includes(card.id);
                return (
                  <div
                    className={`codex-chain-card${isDiscovered ? '' : ' codex-card-undiscovered'}`}
                    key={card.id}
                    style={{ '--codex-rarity': RARITY_COLORS[card.rarity] ?? '#b0b0b0' } as React.CSSProperties}
                  >
                    <div className="codex-chain-art">
                      {isDiscovered ? (
                        <img
                          src={getSkillImage(card)}
                          alt={unifiedName(card)}
                          className="codex-chain-img"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            const fallback = getFallbackSkillImage(card);
                            if (img.src.endsWith(fallback)) {
                              img.style.display = 'none';
                              return;
                            }
                            img.src = fallback;
                          }}
                        />
                      ) : (
                        <>
                          <span className="codex-chain-lock">🔒</span>
                          <span className="codex-card-icon">{getSkillIcon(card.type)}</span>
                        </>
                      )}
                    </div>
                    <strong>{isDiscovered ? unifiedName(card) : t('card.undiscovered')}</strong>
                    <span>{card.cost}⚡</span>
                    <p>{getEffectSummary(card, loc.lang)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="codex-filters">
              <input
                className="codex-search"
                type="text"
                placeholder={t('codex.search')}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
              <div className="codex-char-filter">
                <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value as 'all' | RarityColor)}>
                  <option value="all">{t('codex.filter.all')}</option>
                  {RARITY_ORDER.map(r => <option key={r} value={r}>{t('codex.filter.' + r)}</option>)}
                </select>
              </div>
            </div>

            <div className="enemy-codex-scroll" ref={scrollRef}>
              {groups.map(group => (
                <div className="enemy-codex-group" key={group.id}>
                  <h3 className="enemy-codex-group-title">{group.name}</h3>
                  <div className="codex-grid">
                    {group.items.map(({ shown: card, root, rootId }) => {
                      const isDiscovered = discoveredCards.includes(card.id);
                      return (
                        <button
                          key={rootId}
                          className={`codex-card${isDiscovered ? '' : ' codex-card-undiscovered'}`}
                          style={{ '--codex-rarity': RARITY_COLORS[card.rarity] ?? '#b0b0b0' } as React.CSSProperties}
                          onClick={() => {
                            savedScrollTopRef.current = scrollRef.current?.scrollTop ?? 0;
                            setSelectedRootId(rootId);
                          }}
                          type="button"
                        >
                          {isDiscovered ? (
                            <>
                              <div className="codex-card-header"><span className="codex-card-cost">{card.cost}</span><span>{getSkillIcon(card.type)}</span></div>
                              <div className="codex-card-art">
                                <img
                                  src={getSkillImage(card)}
                                  alt={unifiedName(card)}
                                  className="codex-card-img"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    const fallback = getFallbackSkillImage(card);
                                    if (img.src.endsWith(fallback)) {
                                      img.style.display = 'none';
                                      const icon = img.nextElementSibling as HTMLElement | null;
                                      if (icon) icon.style.display = '';
                                      return;
                                    }
                                    img.src = fallback;
                                  }}
                                />
                                <span className="codex-card-icon" style={{ display: 'none' }}>{getSkillIcon(card.type)}</span>
                              </div>
                              <div className="codex-card-name">{unifiedName(card)}</div>
                              <div className="codex-card-desc">{getEffectSummary(card, loc.lang)}</div>
                            </>
                          ) : (
                            <>
                              <div className="codex-card-header"><span className="codex-card-cost">{card.cost}</span><span>{getSkillIcon(card.type)}</span></div>
                              <div className="codex-card-art codex-card-art-locked"><span className="codex-card-icon">🔒</span></div>
                              <div className="codex-card-name">{t('card.undiscovered')}</div>
                              <div className="codex-card-desc codex-card-desc-locked">{getEffectSummary(card, loc.lang)}</div>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {groups.length === 0 && <div className="codex-empty">{t('codex.empty')}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
