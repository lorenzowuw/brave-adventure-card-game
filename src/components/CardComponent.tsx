/**
 * 卡牌组件 - 游戏中所有卡片的统⼀渲染
 * 数据驱动：所有样式从稀有度配置获取，不硬编码颜色
 */
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { SkillCard, RarityColor } from '../types/game';
import { useTranslation } from '../i18n';
import { useLocalize } from '../i18n/data';
import { asset } from '../utils/assetUrl';
import { getUnifiedCardDisplayName } from '../utils/card';

export const RARITY_COLORS: Record<RarityColor, string> = {
  white: '#AAAAAA',
  green: '#27AE60',
  blue: '#2980B9',
  purple: '#8E44AD',
  orange: '#E67E22',
  red: '#E74C3C',
};

export const RARITY_GRADIENTS: Record<RarityColor, string> = {
  white: 'linear-gradient(180deg, #f5f5f0, #e8e4dc)',
  green: 'linear-gradient(180deg, #e8f8e8, #c8e6c8)',
  blue: 'linear-gradient(180deg, #e3f0f8, #b8d6e8)',
  purple: 'linear-gradient(180deg, #f0e6f8, #d4b8e6)',
  orange: 'linear-gradient(180deg, #fef0e0, #f0c898)',
  red: 'linear-gradient(180deg, #fce4e4, #e8a0a0)',
};

// 技能 id 专属图 → 升级卡无专属 SVG 时回退到基础卡图 → 角色+类型图 → 角色默认图
const RARITY_SUFFIXES = ['white', 'green', 'blue', 'purple', 'orange', 'red'];

function getBaseCardId(cardId: string): string {
  const parts = cardId.split('_');
  while (parts.length > 1 && RARITY_SUFFIXES.includes(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.join('_');
}

function getSkillIcon(card: SkillCard): string {
  return asset(`assets/skill_icons/${card.id}.svg`);
}

function getFallbackSkillIcon(character: string, type: string): string {
  const base = asset(`assets/skill_icons/${character}`);
  const typeMap: Record<string, string> = {
    attack: `${base}_atk.png`,
    defense: `${base}_def.png`,
    heal: `${base}_heal.png`,
    buff: `${base}_buff.png`,
    debuff: `${base}_debuff.png`,
    special: `${base}_special.png`,
    economy: `${base}_atk.png`,
  };
  return typeMap[type] ?? `${base}.png`;
}


const CARD_TOOLTIP_OFFSET = 14;
const CARD_TOOLTIP_WIDTH = 300;
const CARD_TOOLTIP_MARGIN = 12;

export function getTooltipStyle(rect: DOMRect): CSSProperties {
  const fitsRight = rect.right + CARD_TOOLTIP_OFFSET + CARD_TOOLTIP_WIDTH + CARD_TOOLTIP_MARGIN <= window.innerWidth;
  const fitsLeft = rect.left - CARD_TOOLTIP_OFFSET - CARD_TOOLTIP_WIDTH - CARD_TOOLTIP_MARGIN >= 0;
  const left = fitsRight
    ? rect.right + CARD_TOOLTIP_OFFSET
    : fitsLeft
      ? rect.left - CARD_TOOLTIP_OFFSET - CARD_TOOLTIP_WIDTH
      : Math.min(
        window.innerWidth - CARD_TOOLTIP_WIDTH - CARD_TOOLTIP_MARGIN,
        Math.max(CARD_TOOLTIP_MARGIN, rect.left + rect.width / 2 - CARD_TOOLTIP_WIDTH / 2),
      );
  const top = Math.min(
    window.innerHeight - CARD_TOOLTIP_MARGIN,
    Math.max(CARD_TOOLTIP_MARGIN, rect.top + rect.height / 2),
  );

  return {
    left,
    top,
    transform: 'translateY(-50%)',
  };
}

export function getEffectText(
  card: SkillCard,
  t: (key: string, params?: Record<string, string | number>) => string,
  lang?: string,
  isEnemyCard?: boolean,
): string {
  const parts: string[] = [];
  const { effect } = card;

  if (effect.goldCost) parts.push(t('card.effect.goldCost', { value: effect.goldCost }));
  if (effect.damage) {
    let dmg = t('card.effect.damage', { value: effect.damage });
    if (effect.damageMultiplier && effect.damageMultiplier > 1) {
      dmg += t('card.effect.combo', { hits: effect.damageMultiplier });
    }
    parts.push(dmg);
  }
  if (effect.damageToAll) parts.push(t('card.effect.aoe', { value: effect.damageToAll }));
  if (effect.comboFinisher) parts.push(t('card.effect.comboFinisher', { value: effect.comboFinisher }));
  if (effect.detonate) parts.push(t('card.effect.detonate', { value: effect.detonate }));
  if (effect.agileGain) parts.push(t('card.effect.agileGain', { value: effect.agileGain }));
  if (effect.radianceGain) parts.push(t('card.effect.radianceGain', { value: effect.radianceGain }));
  if (effect.radianceBurst) parts.push(t('card.effect.radianceBurst', { value: effect.radianceBurst }));
  if (effect.radianceJudgment) parts.push(t('card.effect.radianceJudgment', { value: effect.radianceJudgment }));
  if (effect.ravenous) parts.push(t('card.effect.ravenous', { value: Math.round(effect.ravenous * 100) }));
  if (effect.retaliateBoost) parts.push(t('card.effect.retaliateBoost', { value: effect.retaliateBoost }));
  if (effect.echoGain) parts.push(t('card.effect.echoGain', { value: effect.echoGain }));
  if (effect.armorScale) {
    const key = effect.armor ? 'card.effect.armorScaleAfterArmor' : 'card.effect.armorScale';
    parts.push(t(key, { value: Math.round(effect.armorScale * 100) }));
  }
  if (effect.fragileScale) parts.push(t('card.effect.fragileScale', { value: effect.fragileScale }));
  if (effect.burnScale) parts.push(t('card.effect.burnScale', { value: effect.burnScale }));
  if (effect.consumeBurnDamage) parts.push(t('card.effect.consumeBurnDamage', { value: effect.consumeBurnDamage }));
  if (effect.paralyzeScale) parts.push(t('card.effect.paralyzeScale', { value: effect.paralyzeScale }));
  if (effect.weakArmorScale) parts.push(t('card.effect.weakArmorScale', { value: effect.weakArmorScale }));
  if (effect.drawIfWeak) parts.push(t('card.effect.drawIfWeak', { value: effect.drawIfWeak }));
  if (effect.retainArmorPercent) parts.push(t('card.effect.retainArmorPercent', { value: effect.retainArmorPercent }));
  if (effect.drawIfParalyzed) parts.push(t('card.effect.drawIfParalyzed', { value: effect.drawIfParalyzed }));
  if (effect.energyIfParalyzed) parts.push(t('card.effect.energyIfParalyzed', { value: effect.energyIfParalyzed }));
  if (effect.paralyzeIfNone) parts.push(t('card.effect.paralyzeIfNone', { value: effect.paralyzeIfNone }));
  if (effect.consumeParalyze) parts.push(t('card.effect.consumeParalyze', { value: effect.consumeParalyze }));
  if (effect.hpCost) parts.push(t('card.effect.hpCost', { value: effect.hpCost }));
  if (effect.berserkDamage) parts.push(t('card.effect.berserkDamage', { value: effect.berserkDamage }));
  if (effect.executeThreshold) parts.push(t('card.effect.execute', { value: Math.round(effect.executeThreshold * 100) }));
  if (effect.heal) parts.push(t('card.effect.heal', { value: effect.heal }));
  if (effect.armor) parts.push(t('card.effect.armor', { value: effect.armor }));
  if (effect.drawCards) parts.push(t('card.effect.draw', { value: effect.drawCards }));
  if (effect.energyGain) parts.push(t('card.effect.energy', { value: effect.energyGain }));
  if (effect.manaGain) parts.push(t('card.effect.manaGain', { value: effect.manaGain }));
  if (effect.manaBurn) parts.push(t('card.effect.manaBurn', { value: effect.manaBurn }));
  if (effect.injectCard) parts.push(t('card.effect.injectCard', { value: effect.injectCard.count }));
  if (effect.goldGain) parts.push(t('card.effect.goldGain', { value: effect.goldGain }));
  if (effect.applyStatus) {
    const status = effect.applyStatus;
    const statusName = t('status.' + status.type);
    // 玩家卡视角：target==='player' 即施加给自己；
    // 敌人卡视角相反：战斗结算里 target==='enemy' 才是怪物施加给自己（见 executeEnemyCard），
    // target 缺省/'player' 则施加给玩家。施加对象的「自身/敌人」标签需按出牌方视角解读。
    const appliesToSelf = isEnemyCard ? status.target === 'enemy' : status.target === 'player';
    const target = appliesToSelf ? t('card.target.self') : t('card.target.enemy');
    // 冻结/麻痹不在卡面显示回合数（机制放 tooltip）
    if (status.type === 'freeze' || status.type === 'paralyze') {
      parts.push(t('card.effect.statusFreeze', { target, name: statusName, stacks: status.value }));
    } else {
      parts.push(t('card.effect.status', { target, name: statusName, stacks: status.value, turns: status.duration }));
    }
  }

  if (parts.length > 0) {
    return lang === 'en' ? parts.join(', ') + '.' : `${parts.join('，')}。`;
  }
  // Fallback: use localized description from data
  return lang === 'en' && (card as any).description_en ? (card as any).description_en : card.description;
}

interface Props {
  card: SkillCard;
  size?: 'normal' | 'small' | 'battle' | 'large' | 'compare';
  disabled?: boolean;
  disabledReason?: string;
  selected?: boolean;
  onClick?: () => void;
  compared?: SkillCard | null;  // 升级对比卡
}

export function CardComponent({ card, size = 'normal', disabled, disabledReason, selected, onClick, compared }: Props) {
  const { t, lang } = useTranslation();
  const loc = useLocalize();
  const borderColor = RARITY_COLORS[card.rarity];
  const gradient = RARITY_GRADIENTS[card.rarity];
  const displayName = getUnifiedCardDisplayName(card, lang);

  const sizeStyles = {
    normal: { width: 110, height: 160, fontSize: 12 },
    small: { width: 90, height: 130, fontSize: 10 },
    battle: { width: 120, height: 170, fontSize: 13 },
    large: { width: 140, height: 200, fontSize: 14 },
    compare: { width: 120, height: 175, fontSize: 12 },
  };

  const s = sizeStyles[size] ?? sizeStyles.normal;
  const effectText = getEffectText(card, t, lang);
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties | null>(null);

  const showTooltip = () => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipStyle(getTooltipStyle(rect));
  };

  const hideTooltip = () => setTooltipStyle(null);

  return (
    <button
      ref={cardRef}
      className={`rpg-card rarity-${card.rarity}`}
      aria-label={displayName}
      style={{
        width: s.width,
        height: s.height,
        borderColor,
        background: gradient,
        fontSize: s.fontSize,
        opacity: disabled ? 0.5 : 1,
        transform: selected ? 'translateY(-10px)' : undefined,
        boxShadow: selected
          ? `0 0 0 3px ${borderColor}, 0 8px 24px rgba(0,0,0,0.4)`
          : `0 4px 12px rgba(0,0,0,0.3), 0 0 0 1px ${borderColor}33`,
      }}
      disabled={disabled}
      onClick={onClick}
      onBlur={hideTooltip}
      onFocus={showTooltip}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      type="button"
    >
      {/* 稀有度光效 */}
      <div className="card-rarity-shine" style={{ background: `linear-gradient(135deg, ${borderColor}22, transparent, ${borderColor}11)` }} />

      {/* 费用 */}
      <span className="card-cost">{card.cost}⚡</span>

      {/* 升级箭头标记 */}
      {compared && <span className="card-upgrade-arrow">↑</span>}

      {/* 卡面区域 — 技能专属火柴人配图 */}
      <div className="card-art-area">
        <img
          src={getSkillIcon(card)}
          alt={displayName}
          className="card-skill-icon"
          onError={(e) => {
            const image = e.target as HTMLImageElement;
            // Step 1: 升级卡专属 SVG 缺失 → 回退到基础卡 SVG
            const baseId = getBaseCardId(card.id);
            if (baseId !== card.id) {
              const baseSvg = asset(`assets/skill_icons/${baseId}.svg`);
              if (!image.src.endsWith(baseSvg)) {
                image.src = baseSvg;
                return;
              }
            }
            // Step 2: 基础卡 SVG 也不存在 → 回退到角色+类型通用图
            const fallback = getFallbackSkillIcon(card.characterBind, card.type);
            if (image.src.endsWith(fallback)) {
              image.style.display = 'none';
              return;
            }
            image.src = fallback;
          }}
        />
      </div>

      {/* 卡名 */}
      <strong className="card-name">{displayName}</strong>

      {/* 效果描述 */}
      <p className="card-desc">{effectText}</p>
      {tooltipStyle && createPortal(
        <div className="card-tooltip" role="tooltip" style={tooltipStyle}>
          <strong>{displayName}</strong>
          <span>{effectText}</span>
          <small>{loc.f(card)}</small>
        </div>,
        document.body,
      )}

      {/* 升级对比：显示旧卡数值 */}
      {compared && (
        <div className="card-compare-row">
          <div className="card-compare-old">
            <small>{compared.cost}⚡</small>
            <small>{lang === 'en' && (compared as any).description_en ? (compared as any).description_en : compared.description}</small>
          </div>
          <div className="card-compare-new">
            <small>{card.cost}⚡</small>
            <small>{effectText}</small>
          </div>
        </div>
      )}

      {disabled && disabledReason && (
        <span className="card-disabled-reason">{disabledReason}</span>
      )}
    </button>
  );
}
