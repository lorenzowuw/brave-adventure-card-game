/**
 * 商店界面 - 购买卡牌、删除卡牌
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GACHA_COSTS, GACHA_MACHINE_RARITY_WEIGHTS, getGachaCost } from '../systems/RunManager';
import type { RarityColor, SkillCard } from '../types/game';
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

const TYPE_LABELS: Record<string, string> = {
  attack: '攻击', defense: '防御', heal: '回复',
  buff: '增益', debuff: '减益', economy: '经济', special: '特殊',
};

const RARITY_PRICE: Record<string, number> = {
  white: 1,
  green: 1.4,
  blue: 2,
  purple: 3,
  orange: 4.5,
  red: 6,
};

export function getShopPrice(card: SkillCard, areaDepth = 0, risk = 0): number {
  return Math.max(5, Math.round(7 * (RARITY_PRICE[card.rarity] ?? 1) * (1 + areaDepth * 0.15) * (1 + risk / 200)));
}

export function getDiscountedShopPrice(card: SkillCard, areaDepth = 0, risk = 0, discount = 0): number {
  return Math.max(0, Math.round(getShopPrice(card, areaDepth, risk) * (1 - discount / 100)));
}

export function getDeletePrice(_card?: SkillCard, areaDepth = 0): number {
  return 12 + Math.max(0, areaDepth) * 4;
}

function sortCardsByType(cards: SkillCard[]): SkillCard[] {
  return [...cards].sort((a, b) => {
    const typeDiff = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
    if (typeDiff !== 0) return typeDiff;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });
}

interface Props {
  gold: number;
  items: Array<SkillCard | null>;
  onBuy: (cardId: string, price: number) => void;
  deck: SkillCard[];
  onDelete: (cardId: string) => void;
  onLeave: () => void;
  areaDepth?: number;
  risk?: number;
  priceDiscount?: number;
  freeCardAvailable?: boolean;
  gachaDrawn?: number;
  onDrawGacha?: () => void;
}

const GACHA_FLASH_RARITIES = ['white', 'green', 'blue', 'purple', 'orange', 'red'] as const;
const GACHA_PARTICLES = Array.from({ length: 14 }, (_, index) => index);
const GACHA_REEL_SYMBOLS = ['✦', '✧', '◆', '◇', '★', '✺'];
const GACHA_ROLL_MS = 1200;
const GACHA_REVEAL_MS = 2800;
const GACHA_FAIL_RESET_MS = 2200;

const RARITY_ORDER: RarityColor[] = ['white', 'green', 'blue', 'purple', 'orange', 'red'];
const GACHA_WEIGHTS_FOR_DISPLAY: Array<{ key: RarityColor; weight: number }> = RARITY_ORDER.map((key) => ({
  key,
  weight: GACHA_MACHINE_RARITY_WEIGHTS[key],
}));

function GachaProbTable({ t, areaDepth, gachaDrawn }: { t: (key: string) => string; areaDepth: number; gachaDrawn: number }) {
  const minIndex = gachaDrawn === GACHA_COSTS.length - 1 ? RARITY_ORDER.indexOf('blue') : Math.max(0, areaDepth - 1);
  const maxIndex = Math.min(RARITY_ORDER.length - 1, areaDepth + 2);
  const visibleWeights = GACHA_WEIGHTS_FOR_DISPLAY.filter((item) => {
    const rarityIndex = RARITY_ORDER.indexOf(item.key);
    return rarityIndex >= minIndex && rarityIndex <= maxIndex;
  });
  const total = visibleWeights.reduce((sum, item) => sum + item.weight, 0);
  return (
    <div className="gacha-prob-table">
      <strong>{t('shop.gachaProbTitle')}</strong>
      {visibleWeights.map(item => (
        <div key={item.key} className="gacha-prob-row">
          <span className={`gacha-prob-rarity rarity-${item.key}`}>{t(`shop.gachaProb.${item.key}`)}</span>
          <span className="gacha-prob-pct">{((item.weight / total) * 100).toFixed(1)}%</span>
        </div>
      ))}
      <div className="gacha-prob-pity">{t('shop.gachaPityNote')}</div>
    </div>
  );
}

export function ShopView({ gold, items, deck, onBuy, onDelete, onLeave, areaDepth = 0, risk = 0, priceDiscount = 0, freeCardAvailable = false, gachaDrawn = 0, onDrawGacha }: Props) {
  const { t } = useTranslation();
  const sortedDeck = sortCardsByType(deck);
  const [gachaState, setGachaState] = useState<'idle' | 'rolling' | 'reveal'>('idle');
  const [flashIndex, setFlashIndex] = useState(0);
  const [revealedCard, setRevealedCard] = useState<SkillCard | null>(null);
  const [showProbTable, setShowProbTable] = useState(false);
  const rollTimerRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const failResetTimerRef = useRef<number | null>(null);
  const beforeDrawDeckSizeRef = useRef(deck.length);
  const gachaCost = getGachaCost(gachaDrawn, areaDepth, risk);
  const canDrawGacha = Boolean(onDrawGacha) && gachaDrawn < GACHA_COSTS.length && gold >= gachaCost && gachaState === 'idle';

  useEffect(() => {
    if (gachaState !== 'rolling') return;
    const interval = window.setInterval(() => setFlashIndex((value) => value + 1), 90);
    return () => window.clearInterval(interval);
  }, [gachaState]);

  useEffect(() => () => {
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
    if (failResetTimerRef.current !== null) window.clearTimeout(failResetTimerRef.current);
  }, []);

  useEffect(() => {
    if (gachaState !== 'rolling') return;
    if (deck.length <= beforeDrawDeckSizeRef.current) return;
    const newCard = deck[deck.length - 1];
    if (!newCard) return;
    if (failResetTimerRef.current !== null) window.clearTimeout(failResetTimerRef.current);
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);

    setRevealedCard(newCard);
    setGachaState('reveal');
    revealTimerRef.current = window.setTimeout(() => setGachaState('idle'), GACHA_REVEAL_MS);
  }, [deck, gachaState]);

  function handleDrawGacha() {
    if (!canDrawGacha || !onDrawGacha) return;
    beforeDrawDeckSizeRef.current = deck.length;
    setRevealedCard(null);
    setGachaState('rolling');
    rollTimerRef.current = window.setTimeout(() => onDrawGacha(), GACHA_ROLL_MS);
    failResetTimerRef.current = window.setTimeout(() => {
      setRevealedCard(null);
      setGachaState('idle');
    }, GACHA_FAIL_RESET_MS);
  }

  return (
    <div className="screen-center shop-view">
      <div className="shop-card">
        <header className="shop-header">
          <span className="shop-icon">🏪</span>
          <div>
            <h2>{t('shop.title')}</h2>
            <p>{t('shop.welcome')}</p>
          </div>
          <strong>💰 {gold}</strong>
        </header>

        <div className="shop-items">
          {items.map((item, index) => {
            if (!item) return <div key={`empty-${index}`} className="shop-item-card shop-item-empty" aria-hidden="true" />;
            const price = freeCardAvailable ? 0 : getDiscountedShopPrice(item, areaDepth, risk, priceDiscount);
            const canAfford = gold >= price;
            return (
              <div key={item.id} className="shop-item-card">
                <CardComponent card={item} size="small" />
                <button
                  className="shop-buy-btn"
                  disabled={!canAfford}
                  onClick={() => onBuy(item.id, price)}
                  type="button"
                >
                  {freeCardAvailable
                    ? t('shop.freeBuy')
                    : canAfford
                      ? `${t('shop.buy')} ${price}💰`
                      : `${t('shop.noGold')} ${price}💰`}
                </button>
              </div>
            );
          })}
          {items.every(item => !item) && <p className="shop-empty">{t('shop.noItems')}</p>}
        </div>

        <div className={`shop-gacha-section shop-gacha-${gachaState}`}>
          <div className="gacha-spark-layer" aria-hidden="true">
            {GACHA_PARTICLES.map((index) => <span key={index} style={{ '--spark-i': index } as CSSProperties}>✦</span>)}
          </div>
          <div className="shop-gacha-info">
            <h3>🎰 {t('shop.gachaTitle')}</h3>
            <p>{t('shop.gachaHint')}</p>
            {gachaDrawn < GACHA_COSTS.length && (
              <p className="gacha-pity-hint">✨ {t('shop.gachaPity')}</p>
            )}
            <button
              type="button"
              className="gacha-prob-toggle"
              onClick={() => setShowProbTable(prev => !prev)}
            >
              {showProbTable ? '−' : '?'} {t('shop.gachaProbTitle')}
            </button>
            {showProbTable && <GachaProbTable t={t} areaDepth={areaDepth} gachaDrawn={gachaDrawn} />}
          </div>
          <div className={`gacha-machine gacha-${gachaState} rarity-${GACHA_FLASH_RARITIES[flashIndex % GACHA_FLASH_RARITIES.length]}`}>
            <div className="gacha-orbit" aria-hidden="true" />
            <div className="gacha-reel" aria-hidden="true">
              {GACHA_REEL_SYMBOLS.map((symbol, index) => <span key={`${symbol}-${index}`} style={{ '--symbol-i': index } as CSSProperties}>{symbol}</span>)}
            </div>
            {gachaState === 'reveal' && revealedCard ? (
              <div className={`gacha-card-reveal rarity-${revealedCard.rarity}`}>
                <span className="gacha-reveal-title">{t('shop.gachaReveal')}</span>
                <CardComponent card={revealedCard} size="small" />
              </div>
            ) : (
              <div className="gacha-placeholder">
                <span>{gachaState === 'rolling' ? '✨' : '🎁'}</span>
                <strong>{gachaState === 'rolling' ? t('shop.gachaRolling') : t('shop.gachaIdle')}</strong>
              </div>
            )}
          </div>
          <button className="shop-gacha-btn" disabled={!canDrawGacha} onClick={handleDrawGacha} type="button">
            {gachaDrawn >= GACHA_COSTS.length
              ? t('shop.gachaDone')
              : gold >= gachaCost
                ? `${t('shop.gachaDraw')} ${gachaCost}💰 (${gachaDrawn}/${GACHA_COSTS.length})`
                : `${t('shop.noGold')} ${gachaCost}💰`}
          </button>
        </div>

        <div className="shop-delete-list">
          <h3>{t('shop.deleteTitle')} ({t('shop.deleteCost')} {getDeletePrice(undefined, areaDepth)}💰)</h3>
          <div className="shop-delete-grid">
            {sortedDeck.map((card, index) => {
              const deletePrice = getDeletePrice(card, areaDepth);
              const hasEnoughGold = gold >= deletePrice;
              const canDelete = hasEnoughGold && deck.length > 1;
              return (
                <div key={`${card.id}-${index}`} className="shop-delete-card-wrap">
                  <CardComponent
                    card={card}
                    size="small"
                    disabled={!canDelete}
                    disabledReason={!hasEnoughGold ? `${t('shop.noGold')} ${deletePrice}💰` : deck.length <= 1 ? t('shop.keepOneCard') : undefined}
                    onClick={() => onDelete(card.id)}
                  />
                </div>
              );
            })}
            {deck.length === 0 && <p className="shop-empty">{t('shop.emptyDeck')}</p>}
          </div>
        </div>

        <div className="shop-actions">
          <button className="btn-leave" onClick={onLeave} type="button">
            {t('shop.leave')}
          </button>
        </div>
      </div>
    </div>
  );
}
