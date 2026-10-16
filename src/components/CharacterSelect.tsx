/**
 * 角色选择界面 - 3D 立体轮盘，滚动选择角色
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { CharacterConfig, GlobalUnlocks, AreaId } from '../types/game';
import { AREA_NAMES } from '../types/game';
import { characterData } from '../utils/DataLoader';
import { useTranslation } from '../i18n';
import { useLocalize } from '../i18n/data';
import { asset } from '../utils/assetUrl';

interface Props {
  unlocks: GlobalUnlocks;
  onSelect: (char: CharacterConfig, startArea?: AreaId) => void;
  devMode: boolean;
  headerSlot?: React.ReactNode;
}

export function CharacterSelect({ unlocks, onSelect, devMode, headerSlot }: Props) {
  const unlockedIds = new Set(unlocks.unlockedCharacters);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const selectingRef = useRef(false);
  const selectTimerRef = useRef<number | null>(null);
  const dragStartX = useRef(0);
  const dragLatestX = useRef(0);
  const dragMovedRef = useRef(false);
  const [startArea, setStartArea] = useState<AreaId>('forest');
  const { t, lang } = useTranslation();
  const loc = useLocalize();
  const visibleCharacters = characterData.filter(char => devMode || char.id !== 'developer');

  const effectiveUnlockedIds = devMode ? new Set(visibleCharacters.map(c => c.id)) : unlockedIds;
  const unlockedCount = visibleCharacters.filter(c => effectiveUnlockedIds.has(c.id)).length;

  const total = visibleCharacters.length;
  const selectedIndex = ((currentIndex % total) + total) % total;
  // 每张卡的角度
  const angleStep = 360 / total;

  const rotateWheel = useCallback((direction: number) => {
    setCurrentIndex(prev => prev + direction);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      rotateWheel(e.deltaX > 0 ? 1 : -1);
    } else {
      rotateWheel(e.deltaY > 0 ? 1 : -1);
    }
  }, [rotateWheel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    dragMovedRef.current = false;
    dragStartX.current = e.clientX;
    dragLatestX.current = e.clientX;
    setDragOffset(0);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX.current;
    dragLatestX.current = e.clientX;
    setDragOffset(dx);
    if (Math.abs(dx) > 12) {
      dragMovedRef.current = true;
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      const dx = dragLatestX.current - dragStartX.current;
      if (Math.abs(dx) >= 48) {
        const steps = Math.min(total - 1, Math.max(1, Math.round(Math.abs(dx) / 96)));
        rotateWheel(dx > 0 ? -steps : steps);
      }
    }
    setDragOffset(0);
    setIsDragging(false);
  }, [isDragging, rotateWheel, total]);

  // 键盘左右
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') rotateWheel(-1);
      if (e.key === 'ArrowRight') rotateWheel(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rotateWheel]);

  useEffect(() => {
    return () => {
      if (selectTimerRef.current !== null) window.clearTimeout(selectTimerRef.current);
    };
  }, []);

  const handleSelect = useCallback((char: CharacterConfig) => {
    if (selectingRef.current) return;
    if (!unlockedIds.has(char.id) && !devMode) return;
    selectingRef.current = true;
    setAnimatingId(char.id);
    selectTimerRef.current = window.setTimeout(() => {
      setAnimatingId(null);
      onSelect(char, devMode ? startArea : undefined);
    }, 600);
  }, [unlockedIds, onSelect, devMode, startArea]);

  const dragRotation = isDragging ? (dragOffset / 96) * angleStep : 0;

  // 当前中心角色
  const centerChar = visibleCharacters[selectedIndex];

  return (
    <div
      className="char-select-screen"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {headerSlot}
      <div className="char-bg-glow" />

      {/* 标题 */}
      <div className="char-title-area">
        <h1 className="char-main-title">{t('select.title')}</h1>
        <p className="char-subtitle">{t('select.subtitle')}</p>
        <div className="char-stats-bar">
          <span>{t('select.unlocked')} <strong>{unlockedCount}</strong>/{total}</span>
          <span>{t('select.clear')} <strong>{unlocks.totalVictories}</strong></span>
          <span>{t('select.maxLv')}<strong>{unlocks.maxLevel}</strong></span>
        </div>
      </div>

      {/* 3D 轮盘 */}
      <div className={`carousel-3d-wrap${isDragging ? ' dragging' : ''}`}>
        <div className="carousel-3d-arrow left" onClick={(e) => { e.stopPropagation(); rotateWheel(-1); }}>◀</div>

        <div className="carousel-3d-stage">
          <div
            className="carousel-3d-track"
            style={{ transform: `rotateY(${-currentIndex * angleStep + dragRotation}deg)` }}
          >
            {visibleCharacters.map((char, i) => {
              const isUnlocked = effectiveUnlockedIds.has(char.id);
              const isCenter = i === selectedIndex;
              const isAnimating = animatingId === char.id;

              return (
                <div
                  key={char.id}
                  className={
                    `carousel-3d-card${isUnlocked ? '' : ' locked'}` +
                    (isCenter ? ' center' : '') +
                    (isAnimating ? ' animating' : '')
                  }
                  style={{
                    '--card-transform': `rotateY(${i * angleStep}deg) translateZ(400px)`,
                    transform: `rotateY(${i * angleStep}deg) translateZ(400px)`,
                  } as React.CSSProperties}
                  onClick={() => {
                    if (dragMovedRef.current) return;
                    if (isCenter) handleSelect(char);
                    else {
                      // 点击非中心角色（含未解锁）-> 转到中心
                      const diff = ((i - selectedIndex) % total + total) % total;
                      const shortDiff = diff > total / 2 ? diff - total : diff;
                      rotateWheel(shortDiff);
                    }
                  }}
                >
                  <div className="c3d-avatar" style={{ borderColor: isUnlocked ? char.mainColor : 'transparent' }}>
                    <img src={asset(`assets/characters/${char.id}.png`)} alt={loc.n(char)} className="c3d-img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    {!isUnlocked && <div className="char-lock-overlay"><span>🔒</span></div>}
                    {/* 职业标签居中覆盖在头像圆圈上 */}
                    <div className="c3d-avatar-roles">
                      {char.role.map(r => (
                        <span key={r} className="c3d-role-tag" style={{ background: char.mainColor }}>
                          {t('role.' + r)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <strong className="c3d-name">{loc.n(char)}</strong>
                  <small className="c3d-title">{loc.t(char)}</small>
                  {!isUnlocked && (
                    <div className="c3d-unlock">
                      <small>{t('unlock.' + char.unlockCondition)}</small>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="carousel-3d-arrow right" onClick={(e) => { e.stopPropagation(); rotateWheel(1); }}>▶</div>
      </div>

      {/* 中央选中角色的详细信息 */}
      {centerChar && (
        <div className="c3d-detail-bar">
          {effectiveUnlockedIds.has(centerChar.id) ? (
            <>
              <div className="c3d-detail-stats">
                <span>❤️ {centerChar.baseHp}</span>
                <span>⚡ {centerChar.baseEnergy}</span>
              </div>
              <p className="c3d-detail-desc">{loc.d(centerChar)}</p>
              <div className="c3d-detail-passive">
                <small><strong>{loc.lang === 'en' && centerChar.passiveName_en ? centerChar.passiveName_en : centerChar.passiveName}</strong>: {loc.lang === 'en' && centerChar.passiveDescription_en ? centerChar.passiveDescription_en : centerChar.passiveDescription}</small>
              </div>
            </>
          ) : (
            <div className="c3d-detail-locked">
              <span className="c3d-detail-lock-icon">🔒</span>
              <small className="c3d-detail-unlock-cond">{t('unlock.' + centerChar.unlockCondition)}</small>
            </div>
          )}
          <button
            className="c3d-select-btn"
            disabled={!effectiveUnlockedIds.has(centerChar.id)}
            onClick={() => handleSelect(centerChar)}
            type="button"
          >
            {effectiveUnlockedIds.has(centerChar.id) ? t('select.select') : t('select.locked')}
          </button>
        </div>
      )}

      <p className="char-select-hint">{t('select.hint')}</p>

      {devMode && (
        <div className="dev-panel">
          <span className="dev-badge">⚡ DEV</span>
          <label>
            {t('dev.startArea')}
            <select value={startArea} onChange={e => setStartArea(e.target.value as AreaId)}>
              {Object.entries(AREA_NAMES).map(([id]) => (
                <option key={id} value={id}>{t('area.' + id)}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
