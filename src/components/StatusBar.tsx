/**
 * 状态栏 - 显示 HP、能量、护甲、金币等核心信息
 * 数据驱动：所有数值从 game-vibe 规范的数据⻚面传入
 */
import { useTranslation } from '../i18n';

interface Props {
  gold: number;
  level: number;
  exp: number;
  expNext: number;
}

export function StatusBar({ gold, level, exp, expNext }: Props) {
  const { t } = useTranslation();
  const isMaxLevel = exp >= expNext;
  const expPct = isMaxLevel ? 100 : expNext > 0 ? Math.min(100, (exp / expNext) * 100) : 100;

  return (
    <header className="status-bar">
      <div className="sb-group">
        <span className="sb-badge sb-level-left">{t('battle.level')} {level}</span>
        <span className="sb-badge sb-gold" title={t('battle.goldTooltip')}>
          <span className="sb-gold-icon">💰</span>
          <span className="sb-gold-label">{t('battle.gold')}</span>
          <strong>{gold}</strong>
        </span>
      </div>

      <div className="sb-group sb-right">
        <div className="sb-exp">
          <div className="sb-track sb-exp-track">
            <div className="sb-fill sb-fill-exp" style={{ width: `${expPct}%` }} />
          </div>
        </div>
      </div>
    </header>
  );
}
