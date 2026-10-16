/**
 * 结算界面 - 胜利/失败结果展示
 */
import { AREA_NAMES } from '../types/game';
import type { AreaId } from '../types/game';
import { useTranslation } from '../i18n';
import { asset } from '../utils/assetUrl';

interface Props {
  victory: boolean;
  level: number;
  gold: number;
  areaName: string;
  onRestart: () => void;
  onRetry?: () => void;
}

export function ResultScreen({ victory, level, gold, areaName, onRestart, onRetry }: Props) {
  const { t, lang } = useTranslation();
  const isFullClear = victory && areaName === 'chaos';

  return (
    <div className={`screen-center result-screen ${isFullClear ? 'full-clear' : ''}`}>
      {isFullClear && (
        <div className="victory-bg" />
      )}
      <div className={`result-card ${victory ? 'victory' : 'defeat'} ${isFullClear ? 'full-clear-card' : ''}`}>
        {isFullClear ? (
          <>
            <div className="victory-celebration">
              <div className="victory-poster">
                <img
                  src={asset('assets/backgrounds/stickman_battle_generated_hd.jpg')}
                  alt=""
                  className="victory-poster-img"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <span className="victory-icon">🏆</span>
              <h1 className="victory-title">
                {lang === 'en' ? 'Congratulations, Brave Hero!' : '恭喜通关，勇者！'}
              </h1>
              <p className="victory-subtitle">
                {lang === 'en'
                  ? 'You conquered all 5 areas and became the true hero of this world!'
                  : '你成功通过了全部 5 个区域，成为了这个世界的真正勇者！'}
              </p>
            </div>
          </>
        ) : (
          <>
            <span className="result-icon">{victory ? '🏆' : '💀'}</span>
            <h1>{victory ? t('result.victory') : t('result.defeat')}</h1>
            <p>
              {victory
                ? t('result.victoryArea', { area: t('area.' + areaName) })
                : t('result.defeatMessage')}
            </p>
          </>
        )}

        <div className="result-stats">
          <p>{t('result.stats', { level, gold, area: isFullClear ? t('area.chaos') : t('area.' + areaName) })}</p>
        </div>

        {!victory && onRetry && (
          <button className="btn-retry" onClick={onRetry} type="button">
            ⚔️ {t('result.retryBoss')}
          </button>
        )}

        <button className="btn-to-select" onClick={onRestart} type="button">
          🏠 {t('result.toSelect')}
        </button>
      </div>
    </div>
  );
}
