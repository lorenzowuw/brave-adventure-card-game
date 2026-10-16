/**
 * 缩略地图 - 始终可见的详情树形图
 */
import type { RunState } from '../types/game';
import { useTranslation } from '../i18n';

interface Props {
  state: RunState;
}

const NODE_SIGNS: Record<string, string> = {
  battle: '⚔️', elite: '⚠️', boss: '👑', shop: '🏪',
  event: '❓', rest: '🏕️', reward: '🎁', skill_altar: '🛕', burn_altar: '🔥',
};

export function MapMinimap({ state }: Props) {
  const { t } = useTranslation();
  const map = state.currentMap;
  const { layer } = state.mapPosition;
  const isBossLayer = layer === map.layers.length;
  const bossLayer = map.layers.length;

  return (
    <div className="mm-detail">
      <strong className="mm-d-title">
        {t('area.' + map.areaId)}
        <span className="mm-d-progress">{layer + 1}/{bossLayer + 1}</span>
      </strong>
      <div className="mm-d-tree">
        {map.layers.map((ld, idx) => (
          <div key={idx} className={`mm-d-row${idx === layer ? ' current' : ''}`}>
            <div className="mm-d-layer-hint">{idx + 1}</div>
            <div className="mm-d-nodes">
              {ld.nodes.map(n => (
                <span key={n.id} className={`mm-d-node${idx === layer ? ' cur' : ''}`}>
                  {NODE_SIGNS[n.type] ?? '·'}
                </span>
              ))}
            </div>
            {idx < bossLayer && <div className="mm-d-conn">│</div>}
          </div>
        ))}
        <div className={`mm-d-row${isBossLayer ? ' current' : ''}`}>
          <div className="mm-d-layer-hint">B</div>
          <div className="mm-d-nodes">
            <span className={`mm-d-node boss${isBossLayer ? ' cur' : ''}`}>👑</span>
          </div>
        </div>
      </div>
    </div>
  );
}
