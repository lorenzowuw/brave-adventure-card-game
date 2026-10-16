import changelog from '../data/changelog.json';
import { useTranslation } from '../i18n';

type ChangeCategory = 'feature' | 'balance' | 'fix' | 'docs' | 'chore';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: Partial<Record<ChangeCategory, string[]>>;
}

const CATEGORY_ORDER: ChangeCategory[] = ['feature', 'balance', 'fix', 'docs', 'chore'];
const entries = changelog as ChangelogEntry[];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AnnouncementBoard({ open, onClose }: Props) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="announcement-panel" onClick={e => e.stopPropagation()}>
        <div className="announcement-header">
          <div>
            <h2>📢 {t('announcement.title')}</h2>
            <p>{t('announcement.subtitle')}</p>
          </div>
          <button className="manual-close-btn" onClick={onClose} type="button">×</button>
        </div>

        <div className="announcement-list">
          {entries.map(entry => (
            <article className="announcement-entry" key={entry.version}>
              <div className="announcement-entry-title">
                <h3>{entry.version} · {entry.title}</h3>
                <span>{entry.date}</span>
              </div>
              <div className="announcement-groups">
                {CATEGORY_ORDER.map(category => {
                  const items = entry.changes[category] ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div className="announcement-group" key={category}>
                      <strong>{t('announcement.category.' + category)}</strong>
                      <ul>
                        {items.map(item => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
