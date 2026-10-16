/**
 * 休息界面 - 回血 + 选择祝福
 */
import type { Blessing } from '../types/game';
import { useTranslation } from '../i18n';
import { useLocalize } from '../i18n/data';

interface Props {
  healAmount: number;
  blessings: Blessing[];
  onHeal: () => void;
  healUsed: boolean;
  onChooseBlessing: (id: string) => void;
  onLeave: () => void;
}

export function RestView({ healAmount, blessings, onHeal, healUsed, onChooseBlessing, onLeave }: Props) {
  const { t } = useTranslation();
  const loc = useLocalize();
  return (
    <div className="screen-center rest-view">
      <div className="rest-card">
        <div className="rest-header">
          <span className="rest-icon">🏕️</span>
          <div>
            <h2>{t('rest.title')}</h2>
            <p>{t('rest.description')}</p>
          </div>
        </div>

        <button className="btn-heal" disabled={healUsed} onClick={onHeal} type="button">
          {healUsed ? t('rest.healUsed') : `❤️ ${t('rest.healAmount', {value: healAmount})}`}
        </button>

        {blessings.length > 0 && (
          <section className="blessing-section">
            <h3>{t('rest.blessing')}</h3>
            <div className="blessing-grid">
              {blessings.map(b => (
                <button
                  key={b.id}
                  className="blessing-card"
                  onClick={() => onChooseBlessing(b.id)}
                  type="button"
                >
                  <strong>{loc.n(b)}</strong>
                  <p>{loc.d(b)}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <button className="btn-leave" onClick={onLeave} type="button">
          {t('rest.leave')}
        </button>
      </div>
    </div>
  );
}
