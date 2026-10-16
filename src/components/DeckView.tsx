/**
 * 卡组查看面板 - 战斗中查看全部卡牌
 */
import type { SkillCard } from '../types/game';
import { CardComponent } from './CardComponent';
import { useTranslation } from '../i18n';

const TYPE_ORDER: Record<string, number> = {
  attack: 0,
  defense: 1,
  heal: 2,
  buff: 3,
  debuff: 4,
  economy: 5,
  special: 6,
};

function sortCardsByType(cards: Array<{ card: SkillCard; count: number }>): Array<{ card: SkillCard; count: number }> {
  return [...cards].sort((a, b) => {
    const typeDiff = (TYPE_ORDER[a.card.type] ?? 99) - (TYPE_ORDER[b.card.type] ?? 99);
    if (typeDiff !== 0) return typeDiff;
    return a.card.name.localeCompare(b.card.name);
  });
}

interface Props {
  deck: SkillCard[];
  gold: number;
  open: boolean;
  onClose: () => void;
}

export function DeckView({ deck, gold, open, onClose }: Props) {
  const { t, lang } = useTranslation();
  if (!open) return null;

  const counts = deck.reduce<Record<string, { card: SkillCard; count: number }>>((acc, card) => {
    if (acc[card.id]) {
      acc[card.id].count++;
    } else {
      acc[card.id] = { card, count: 1 };
    }
    return acc;
  }, {});

  const uniqueCards = sortCardsByType(Object.values(counts));

  return (
    <div className="modal-overlay deckview-overlay" onClick={onClose} role="presentation">
      <div
        className="deckview-panel"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="deckview-header">
          <div>
            <h2>{t('btn.deck', { count: deck.length })}</h2>
            <p>{t('deck.cards', { count: deck.length })} · {t('deck.types', { count: uniqueCards.length })} · 💰 {gold}</p>
          </div>
          <button className="manual-close-btn" onClick={onClose} type="button">×</button>
        </header>

        <div className="deckview-grid">
          {uniqueCards.map(({ card, count }) => (
            <div key={card.id} className="deckview-card-full">
              <CardComponent card={card} size="small" />
              <span className="deckview-type">{t('card.' + card.type)}</span>
              {count > 1 && <span className="deckview-count">×{count}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
