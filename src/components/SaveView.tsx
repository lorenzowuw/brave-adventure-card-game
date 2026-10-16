/**
 * 存档界面 - 保存/读档/重置
 */
import type { RunState, CharacterConfig, GlobalUnlocks } from '../types/game';
import { getSaveSlots, saveGame, loadGame, deleteSave, resetAllData } from '../systems/RunManager';
import type { SaveSlot } from '../systems/RunManager';
import { useTranslation } from '../i18n';

interface Props {
  open: boolean;
  run: RunState | null;
  character: CharacterConfig | null;
  unlocks: GlobalUnlocks;
  onLoad: (slot: SaveSlot) => void;
  onUnlockAllContent: () => void;
  onClose: () => void;
}

const AREA_ORDER: string[] = ['forest', 'ruins', 'flame', 'frost', 'chaos'];

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function SaveView({ open, run, character, unlocks, onLoad, onUnlockAllContent, onClose }: Props) {
  if (!open) return null;

  const { t, lang } = useTranslation();
  const slots = getSaveSlots();

  const handleSave = (index: number) => {
    if (!run || !character) return;
    const areaName = t('area.' + run.currentArea);
    const charName = lang === 'en' && character.name_en ? character.name_en : character.name;
    saveGame(index, run, `Lv.${run.progress.level} ${charName} · ${areaName}`);
    onClose();
  };

  const handleLoad = (index: number) => {
    const slot = loadGame(index);
    if (slot) onLoad(slot);
  };

  const handleDelete = (index: number) => {
    if (!window.confirm(t('confirm.deleteSave'))) return;
    deleteSave(index);
    onClose();
  };

  const handleResetAll = () => {
    if (window.confirm(t('save.confirmReset'))) {
      resetAllData();
      window.location.reload();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="save-panel" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="save-header">
          <div>
            <h2>📀 {t('save.title')}</h2>
            <p>{t('save.description')}</p>
          </div>
          <button className="manual-close-btn" onClick={onClose} type="button">×</button>
        </header>

        <div className="save-slots">
          {slots.map((slot, index) => (
            <div key={index} className="save-slot">
              <div className="save-slot-header">
                <strong>{t('save.slot', {index: index + 1})}</strong>
                {slot && <small className="save-slot-time">{formatTime(slot.timestamp)}</small>}
              </div>
              {slot ? (
                <div className="save-slot-info">
                  <span>{slot.name}</span>
                  <small>{lang === 'en' ? `Stage ${AREA_ORDER.indexOf(slot.runState.currentArea) + 1} · Layer ${slot.runState.mapPosition.layer + 1}` : `阶段 ${AREA_ORDER.indexOf(slot.runState.currentArea) + 1} · 层 ${slot.runState.mapPosition.layer + 1}`} · 💰 {slot.runState.gold}</small>
                </div>
              ) : (
                <div className="save-slot-empty">{t('save.empty')}</div>
              )}
              <div className="save-slot-actions">
                {run && <button className="save-btn save" onClick={() => handleSave(index)} type="button">💾 {t('save.save')}</button>}
                {slot && <button className="save-btn load" onClick={() => handleLoad(index)} type="button">📂 {t('save.load')}</button>}
                {slot && <button className="save-btn delete" onClick={() => handleDelete(index)} type="button">🗑️ {t('save.delete')}</button>}
              </div>
            </div>
          ))}
        </div>

        <div className="save-reset-area">
          <button className="save-btn unlock-all" onClick={onUnlockAllContent} type="button">
            {t('save.unlockAll')}
          </button>
          <button className="save-btn reset-all" onClick={handleResetAll} type="button">
            🔄 {t('save.resetAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
