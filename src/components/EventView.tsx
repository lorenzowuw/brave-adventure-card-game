/**
 * 事件弹窗 - 多选项事件交互
 */
import type { GameEvent } from '../types/game';
import { useTranslation } from '../i18n';

interface Props {
  event: GameEvent;
  gold: number;
  maxHp?: number;
  currentHp?: number;
  maxEnergy?: number;
  currentEnergy?: number;
  onChoose: (choiceId: string) => void;
}

function formatEffects(effects: GameEvent['choices'][number]['effects'], t: (key: string, params?: Record<string, string | number>) => string): string[] {
  const labels: string[] = [];
  if (effects.goldChange) {
    const signed = effects.goldChange > 0 ? '+' + effects.goldChange : String(effects.goldChange);
    labels.push(t('event.effect.gold', { value: signed }));
  }
  if (effects.hpChange) {
    const signed = effects.hpChange > 0 ? '+' + effects.hpChange : String(effects.hpChange);
    labels.push(t('event.effect.hp', { value: signed }));
  }
  if (effects.maxHpChange) {
    const signed = effects.maxHpChange > 0 ? '+' + effects.maxHpChange : String(effects.maxHpChange);
    labels.push(t('event.effect.maxHp', { value: signed }));
  }
  if (effects.maxEnergyChange) {
    const signed = effects.maxEnergyChange > 0 ? '+' + effects.maxEnergyChange : String(effects.maxEnergyChange);
    labels.push(t('event.effect.maxEnergy', { value: signed }));
  }
  if (effects.handLimitChange) {
    const signed = effects.handLimitChange > 0 ? '+' + effects.handLimitChange : String(effects.handLimitChange);
    labels.push(t('event.effect.handLimit', { value: signed }));
  }
  if (effects.drawPerTurnChange) {
    const signed = effects.drawPerTurnChange > 0 ? '+' + effects.drawPerTurnChange : String(effects.drawPerTurnChange);
    labels.push(t('event.effect.drawPerTurn', { value: signed }));
  }
  if (effects.riskChange) {
    const signed = effects.riskChange > 0 ? '+' + effects.riskChange : String(effects.riskChange);
    labels.push(t('event.effect.risk', { value: signed }));
  }
  if (effects.cardReward || effects.cardRewardPool) labels.push(t('event.effect.cardReward'));
  if (effects.upgradeRandomCard) labels.push(t('event.effect.upgradeCard'));
  if (effects.removeRandomBasicCard) labels.push(t('event.effect.removeBasic'));
  if (effects.temporaryArmor) labels.push(t('event.effect.tempArmor', { value: effects.temporaryArmor }));
  return labels;
}

export function EventView({ event, gold, maxHp, currentHp, maxEnergy, currentEnergy, onChoose }: Props) {
  const { t, lang } = useTranslation();

  // 收集所有选项涉及到的属性
  const needsGold = event.choices.some(c => (c.effects.goldChange ?? 0) < 0);
  const needsHp = event.choices.some(c => (c.effects.hpChange ?? 0) !== 0 || (c.effects.maxHpChange ?? 0) !== 0);
  const needsEnergy = event.choices.some(c => (c.effects.maxEnergyChange ?? 0) !== 0);

  const panel = (
    <div className="event-panel">
        <div className="event-header">
          <span className="event-icon">✦</span>
          <div>
            <h3 className="event-subtitle">{t('event.title')}</h3>
            <h2 className="event-title">{lang === 'en' && (event as any).title_en ? (event as any).title_en : event.title}</h2>
          </div>
        </div>
        <p className="event-desc">{lang === 'en' && (event as any).description_en ? (event as any).description_en : event.description}</p>
        {(needsGold || needsHp || needsEnergy) && (
          <div className="event-stats-bar">
            {needsGold && <span className="event-stat">💰 {gold}</span>}
            {needsHp && currentHp !== undefined && maxHp !== undefined &&
              <span className="event-stat">❤️ {currentHp}/{maxHp}</span>}
            {needsEnergy && currentEnergy !== undefined && maxEnergy !== undefined &&
              <span className="event-stat">⚡ {currentEnergy}/{maxEnergy}</span>}
          </div>
        )}
        <div className="event-choices">
          {event.choices.map(choice => {
            const effects = formatEffects(choice.effects, t);
            const goldCost = choice.effects.goldChange && choice.effects.goldChange < 0
              ? Math.abs(choice.effects.goldChange)
              : 0;
            const hpCost = choice.effects.hpChange && choice.effects.hpChange < 0
              ? Math.abs(choice.effects.hpChange)
              : 0;
            const lacksGold = goldCost > gold;
            const lacksHp = currentHp !== undefined && hpCost > currentHp;
            const disabled = lacksGold || lacksHp;
            return (
              <button
                key={choice.id}
                className="choice-btn"
                disabled={disabled}
                onClick={() => onChoose(choice.id)}
                type="button"
              >
                <strong>{lang === 'en' && (choice as any).label_en ? (choice as any).label_en : choice.label}</strong>
                <span>{lang === 'en' && (choice as any).description_en ? (choice as any).description_en : choice.description}</span>
                {effects.length > 0 && (
                  <span className="choice-effects">
                    {effects.join(' · ')}
                    {lacksGold && ' · ' + t('shop.noGold')}
                    {lacksHp && ' · ' + t('event.effect.hpInsufficient')}
                  </span>
                )}
                {effects.length === 0 && disabled && <span className="choice-effects">{lacksGold ? t('shop.noGold') : t('event.effect.hpInsufficient')}</span>}
              </button>
            );
          })}
        </div>
    </div>
  );

  return <div className="modal-overlay">{panel}</div>;
}
