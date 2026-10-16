/**
 * 树形图地图 - 展示当前可选的路径节点
 */
import constantsData from '../data/constants.json';
import { getAvailableNodes, getLevelProgress } from '../systems/RunManager';
import type { MapNode, RunState } from '../types/game';
import { MapMinimap } from './MapMinimap';
import { AREA_NAMES } from '../types/game';
import type { AreaId } from '../types/game';
import { useTranslation } from '../i18n';
import { asset } from '../utils/assetUrl';

const AREA_ORDER: AreaId[] = ['forest', 'ruins', 'flame', 'frost', 'chaos'];
const LEVEL_EXP_CURVE = constantsData.levelExpCurve;
function getExpIntoLevel(totalExp: number): number {
  const { level, isMaxLevel } = getLevelProgress(totalExp);
  if (isMaxLevel) return getExpNeededForLevel(level);
  return Math.max(0, totalExp - (LEVEL_EXP_CURVE[level - 1] ?? 0));
}

function getExpNeededForLevel(level: number): number {
  return Math.max(0, (LEVEL_EXP_CURVE[level] ?? LEVEL_EXP_CURVE[level - 1] ?? 0) - (LEVEL_EXP_CURVE[level - 1] ?? 0));
}

interface Props {
  state: RunState;
  onEnterNode: (nodeId: string) => void;
  className?: string;
}

const NODE_EMOJIS: Record<string, string> = {
  battle: '⚔️', elite: '⚠️', boss: '👑',
  shop: '🏪', event: '❓', rest: '🏕️',
  reward: '🎁', skill_altar: '✨', burn_altar: '🗑️',
};

const NODE_IMAGES: Record<string, string> = {
  battle: asset('assets/map_nodes/battle.png'),
  elite: asset('assets/map_nodes/elite.png'),
  shop: asset('assets/map_nodes/shop.png'),
  event: asset('assets/map_nodes/event.png'),
  rest: asset('assets/map_nodes/rest.png'),
  reward: asset('assets/map_nodes/reward.png'),
  skill_altar: asset('assets/map_nodes/skill_altar.png'),
  burn_altar: asset('assets/map_nodes/burn_altar.png'),
};

function RiskIndicator({ risk, t }: { risk: number; t: (key: string, params?: Record<string, string | number>) => string }) {
  const level = risk >= 80 ? 'crisis' : risk >= 50 ? 'high' : risk >= 25 ? 'medium' : 'low';
  const color = risk >= 80 ? '#e74c3c' : risk >= 50 ? '#e67e22' : risk >= 25 ? '#f39c12' : '#27ae60';
  const boost = Math.round(risk / 2);
  const tooltip = t(`risk.tooltip.${level}`, { enemyBoost: boost, shopBoost: boost });

  return (
    <span className="risk-wrap">
      <span className="risk-indicator" style={{ color }} title={tooltip} tabIndex={0}>
        {t('map.risk')} · {t(`risk.${level}`)} {risk}%
        <span className="risk-help">?</span>
      </span>
      <span className="risk-tooltip" role="tooltip">{tooltip}</span>
    </span>
  );
}

export function getMapNodeIcon(type: MapNode['type']) {
  return NODE_IMAGES[type] ? <img src={NODE_IMAGES[type]} alt="" className="node-icon-img" /> : NODE_EMOJIS[type] ?? '';
}

export function MapNodeContent({ node }: { node: MapNode }) {
  const { t } = useTranslation();

  return (
    <>
      <span className="node-icon">{getMapNodeIcon(node.type)}</span>
      <span className="node-label">{t('map.nodes.' + node.type)}</span>
    </>
  );
}

export function MapView({ state, onEnterNode, className = '' }: Props) {
  const { t } = useTranslation();
  const finalProgress = getLevelProgress(state.progress.exp);
  const displayLevel = state.progress.level;
  const shownExpInLevel = getExpIntoLevel(state.progress.exp);
  const displayExpNeeded = getExpNeededForLevel(displayLevel);
  const map = state.currentMap;
  const { layer } = state.mapPosition;
  const availableNodes = getAvailableNodes(state);
  const previousNodes = layer > 0 && layer <= map.layers.length
    ? map.layers[layer - 1].nodes
    : [];
  const chosenPreviousNodeId = [...state.path].reverse().find(nodeId => previousNodes.some(node => node.id === nodeId));
  const nextAvailableNodes = layer + 1 < map.layers.length
    ? map.layers[layer + 1].nodes
    : layer === map.layers.length - 1
      ? [map.boss]
      : [];
  const hpPct = state.currentMaxHp > 0 ? Math.max(0, Math.min(100, (state.currentHp / state.currentMaxHp) * 100)) : 0;

  return (
    <div className={`map-view${className ? ` ${className}` : ''}`}>
      <MapMinimap state={state} />
      <div className="map-header">
        <h2>{t('area.' + map.areaId)}</h2>
        <span>{AREA_ORDER.indexOf(map.areaId) + 1}-{layer + 1} · <RiskIndicator risk={state.risk} t={t} /></span>
        {state.risk >= 80 && <div className="risk-warning">⚠️ {t('risk.warning')}</div>}
        <div className="map-hp-row">
          <span className="map-hp-pill">
            <span className="map-hp-icon">❤️</span>
            <span className="map-hp-track"><span className="map-hp-fill" style={{ width: `${hpPct}%` }} /></span>
            <strong>{state.currentHp}/{state.currentMaxHp}</strong>
          </span>
          <span className="map-gold-pill">💰 {state.gold}</span>
        </div>
        <div className="map-level-row">
          <span className="map-level-badge">Lv.{displayLevel}</span>
          <div className="map-exp-track">
            <div
              className="map-exp-fill"
              style={{
                width: `${finalProgress.isMaxLevel ? 100 : displayExpNeeded > 0 ? Math.min(100, shownExpInLevel / displayExpNeeded * 100) : 100}%`,
              }}
            />
          </div>
          <span className="map-exp-text">{finalProgress.isMaxLevel ? 'MAX' : `${shownExpInLevel}/${displayExpNeeded}`}</span>
        </div>
      </div>

      <div className="map-tree">
        {previousNodes.length > 0 && (
          <>
            <div className="map-layer previous">
              {previousNodes.map((node) => (
                <div
                  key={node.id}
                  className={`map-node previous disabled ${node.type}${node.id === chosenPreviousNodeId ? ' chosen' : ''}`}
                  data-map-node-id={node.id}
                  data-map-node-role="previous"
                >
                  <MapNodeContent node={node} />
                </div>
              ))}
            </div>
            <div className="map-connector previous-to-current">↓</div>
          </>
        )}

        {availableNodes.length > 0 && layer < map.layers.length && (
          <div className="map-layer current">
            {availableNodes.map((node) => (
              <button
                key={node.id}
                className={`map-node current ${node.type}`}
                onClick={() => onEnterNode(node.id)}
                type="button"
                data-map-node-id={node.id}
                data-map-node-role="current"
              >
                <MapNodeContent node={node} />
              </button>
            ))}
          </div>
        )}
        {availableNodes.length === 0 && layer < map.layers.length && (
          <div className="map-layer empty">
            <p>{t('map.noAvailableNodes')}</p>
          </div>
        )}

        {nextAvailableNodes.length > 0 && (
          <>
            <div className="map-connector">↓</div>
            <div className="map-layer preview">
              {nextAvailableNodes.map(node => (
                <div
                  key={node.id}
                  className={`map-node preview disabled ${node.type}`}
                  data-map-node-id={node.id}
                  data-map-node-role="preview"
                >
                  <MapNodeContent node={node} />
                </div>
              ))}
            </div>
          </>
        )}

        {layer === map.layers.length && (
          <div className="map-boss">
            <button
              className="map-node current boss"
              onClick={() => onEnterNode(map.boss.id)}
              type="button"
              data-map-node-id={map.boss.id}
              data-map-node-role="current"
            >
              <MapNodeContent node={map.boss} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
