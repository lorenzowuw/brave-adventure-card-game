/**
 * 首战教学覆盖层 - 两步教学：出牌 + 结束回合
 */
import { useTranslation } from '../i18n';

interface Props {
  step: 0 | 1;
  onSkip: () => void;
}

export function BattleTutorial({ step, onSkip }: Props) {
  const { t } = useTranslation();
  const steps = [
    { title: t('tutorial.step1.title'), desc: t('tutorial.step1.desc') },
    { title: t('tutorial.step2.title'), desc: t('tutorial.step2.desc') },
  ];
  const current = steps[step];

  return (
    <div className={`battle-tutorial-overlay tutorial-step-${step + 1}`}>
      <div className="tutorial-card">
        <div className="tutorial-step-badge">{step + 1}/{steps.length}</div>
        <h3>{current.title}</h3>
        <p>{current.desc}</p>
        <small>{step === 0 ? t('tutorial.step1.action') : t('tutorial.step2.action')}</small>
        <button className="btn-tutorial-skip" onClick={onSkip} type="button">
          {t('tutorial.skip')}
        </button>
      </div>
    </div>
  );
}
