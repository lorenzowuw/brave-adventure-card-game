/**
 * 历史记录 - 展示所有冒险记录，点击可查看详情
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { RunHistoryEntry, GlobalUnlocks } from '../types/game';
import { useTranslation } from '../i18n';
import { characterData, skillData } from '../utils/DataLoader';
import { asset } from '../utils/assetUrl';

const allSkills = skillData as any[];
const allCharacters = characterData as Array<{ id: string; name: string; name_en?: string }>;

function getCharacterName(characterId: string, lang: string): string {
  const character = allCharacters.find(char => char.id === characterId);
  if (!character) return characterId;
  return lang === 'en' && character.name_en ? character.name_en : character.name;
}

interface Props {
  open: boolean;
  onClose: () => void;
  unlocks: GlobalUnlocks;
}

const AREA_ICONS: Record<string, string> = {
  forest: '🌲', ruins: '🏛️', flame: '🔥', frost: '❄️', chaos: '🌑',
};
function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function HistoryView({ open, onClose, unlocks }: Props) {
  const { t, lang } = useTranslation();
  const [selectedEntry, setSelectedEntry] = useState<RunHistoryEntry | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTopRef = useRef(0);

  useLayoutEffect(() => {
    if (open && !selectedEntry && listRef.current) {
      listRef.current.scrollTop = savedScrollTopRef.current;
    }
  }, [open, selectedEntry]);

  if (!open) return null;

  const history = unlocks.runHistory ?? [];
  const wins = history.filter(h => h.victory);
  const charMap = new Map<string, { wins: number; total: number }>();
  for (const h of history) {
    if (!charMap.has(h.characterId)) charMap.set(h.characterId, { wins: 0, total: 0 });
    const entry = charMap.get(h.characterId)!;
    entry.total++;
    if (h.victory) entry.wins++;
  }

  // Detail view
  if (selectedEntry) {
    const entry = selectedEntry;
    const cardNames = entry.deck.slice(0, 50).map(cardId => {
      const skill = allSkills.find((s: any) => s.id === cardId);
      return skill ? (lang === 'en' && skill.name_en ? skill.name_en : skill.name) : cardId;
    });
    // Count unique cards
    const cardCounts = cardNames.reduce<Record<string, number>>((acc, name) => {
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {});
    const uniqueCards = Object.entries(cardCounts).sort(([,a], [,b]) => b - a);

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="history-panel history-detail-panel" onClick={e => e.stopPropagation()}>
          <div className="history-header">
            <button className="history-back-btn" onClick={() => setSelectedEntry(null)} type="button">← {t('history.back')}</button>
            <h2>📜 {t('history.detail')}</h2>
            <button className="manual-close-btn" onClick={onClose} type="button">×</button>
          </div>

          <div className="detail-hero-section">
            <img
              src={asset(`assets/characters/${entry.characterId}.png`)}
              alt=""
              className="detail-hero-img"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="detail-hero-info">
              <span className="detail-hero-name">{getCharacterName(entry.characterId, lang)}</span>
              <span className={`detail-result-tag ${entry.victory ? 'tag-win' : 'tag-lose'}`}>
                {entry.victory ? (lang === 'en' ? 'CLEAR' : '通关') : (lang === 'en' ? 'DEFEATED' : '败北')}
              </span>
            </div>
          </div>

          <div className="detail-stats-grid">
            <div className="detail-stat">
              <span className="detail-stat-label">{t('history.area')}</span>
              <span className="detail-stat-value">{AREA_ICONS[entry.areaReached]} {t('area.' + entry.areaReached)}</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-label">{t('history.level')}</span>
              <span className="detail-stat-value">{entry.level}</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-label">{t('history.gold')}</span>
              <span className="detail-stat-value detail-gold">💰{entry.gold}</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-label">{t('history.cards')}</span>
              <span className="detail-stat-value">{entry.deck.length}</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-label">{t('history.bossKills')}</span>
              <span className="detail-stat-value">{entry.bossKills}</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-label">{t('history.time')}</span>
              <span className="detail-stat-value">{formatTime(entry.timestamp)}</span>
            </div>
          </div>

          <div className="detail-deck-section">
            <h3>{t('history.deck', { count: entry.deck.length })}</h3>
            <div className="detail-deck-grid">
              {uniqueCards.map(([name, count]) => (
                <div key={name} className="detail-deck-card">
                  <span className="detail-deck-name">{name}</span>
                  {count > 1 && <span className="detail-deck-count">×{count}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="detail-result-line">
            {entry.victory
              ? `✨ ${t('history.win')}`
              : `💀 ${t('history.lose', { area: t('area.' + entry.areaReached) })}`}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <h2>📜 {t('history.title')}</h2>
          <span className="history-summary">
            {t('history.runs', { total: history.length, wins: wins.length })}
          </span>
          <button className="manual-close-btn" onClick={onClose} type="button">×</button>
        </div>

        {history.length === 0 && (
          <div className="history-empty">
            {t('history.empty')}
          </div>
        )}

        {charMap.size > 0 && (
          <div className="history-char-grid">
            {[...charMap.entries()].map(([charId, stats]) => (
              <div key={charId} className={`history-char-card ${stats.wins > 0 ? 'has-win' : ''}`}>
                <span className="history-char-icon">
                  <img src={asset(`assets/characters/${charId}.png`)} alt="" className="history-char-img"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </span>
                <span className="history-char-name">{getCharacterName(charId, lang)}</span>
                <span className="history-char-stats">
                  {stats.wins}/{stats.total}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="history-list" ref={listRef}>
          {history.slice(0, 30).map((entry, idx) => (
            <div
              key={`${entry.timestamp}-${idx}`}
              className={`history-entry ${entry.victory ? 'victory' : 'defeat'}`}
              onClick={() => {
                savedScrollTopRef.current = listRef.current?.scrollTop ?? 0;
                setSelectedEntry(entry);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  savedScrollTopRef.current = listRef.current?.scrollTop ?? 0;
                  setSelectedEntry(entry);
                }
              }}
            >
              <span className="history-result">{entry.victory ? '🏆' : '💀'}</span>
              <span className="history-char">{getCharacterName(entry.characterId, lang)}</span>
              <span className="history-area">{AREA_ICONS[entry.areaReached] ?? ''} {t('area.' + entry.areaReached)}</span>
              <span className="history-level">Lv.{entry.level}</span>
              <span className="history-gold">💰{entry.gold}</span>
              <span className="history-deck-count">{t('history.cardCount', { count: entry.deck.length })}</span>
              <span className="history-time">{formatTime(entry.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
