/**
 * 节点完成过渡动画 - 从进入节点前的真实地图位置推进到新地图位置
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { MapNode, RunState } from '../types/game';
import { MapNodeContent, MapView } from './MapView';

const NODE_ANIMATION_MS = 720;
type NodeRole = 'previous' | 'current' | 'preview' | 'boss';

interface Props {
  fromRun: RunState;
  toRun: RunState;
  selectedNodeId: string;
  onDone: () => void;
}

interface NodeBox {
  id: string;
  role: NodeRole;
  rect: DOMRect;
  node: MapNode;
  className: string;
}

interface AnimatedNode {
  key: string;
  node: MapNode;
  className: string;
  from: DOMRect;
  to: DOMRect;
  fromOpacity: number;
  toOpacity: number;
}

function getNodeClass(node: MapNode, role: NodeRole, selectedNodeId: string) {
  const chosen = role === 'previous' && node.id === selectedNodeId ? ' chosen' : '';
  return `map-node ${role === 'boss' ? 'boss' : role} disabled ${node.type}${chosen}`;
}

function getNode(run: RunState, nodeId: string): MapNode | null {
  const map = run.currentMap;
  const fromLayers = map.layers.flatMap(layer => layer.nodes);
  return fromLayers.find(node => node.id === nodeId) ?? (map.boss.id === nodeId ? map.boss : null);
}

function getBoxes(root: HTMLDivElement | null, run: RunState, selectedNodeId: string): Map<string, NodeBox> {
  const boxes = new Map<string, NodeBox>();
  if (!root) return boxes;

  root.querySelectorAll<HTMLElement>('[data-map-node-id]').forEach(element => {
    const id = element.dataset.mapNodeId;
    const role = element.dataset.mapNodeRole as NodeRole | undefined;
    if (!id || !role) return;
    const node = getNode(run, id);
    if (!node) return;
    boxes.set(id, {
      id,
      role,
      rect: element.getBoundingClientRect(),
      node,
      className: getNodeClass(node, role, selectedNodeId),
    });
  });

  return boxes;
}

function makeFallbackFromRect(to: DOMRect, role: NodeRole): DOMRect {
  const yOffset = role === 'preview' ? 96 : role === 'previous' ? 0 : 80;
  return DOMRect.fromRect({
    x: to.x,
    y: to.y + yOffset,
    width: to.width,
    height: to.height,
  });
}

function getRoleOpacity(role: NodeRole, nodeId: string, selectedNodeId: string, nodeType: MapNode['type']) {
  if (role === 'preview') return nodeType === 'boss' ? 0.72 : 0.45;
  if (role === 'previous') return nodeId === selectedNodeId ? 0.86 : 0.45;
  return 1;
}

function buildAnimatedNodes(
  fromBoxes: Map<string, NodeBox>,
  toBoxes: Map<string, NodeBox>,
  selectedNodeId: string,
): AnimatedNode[] {
  return Array.from(toBoxes.values()).map(toBox => {
    const fromBox = fromBoxes.get(toBox.id);
    return {
      key: `${toBox.id}-${toBox.role}`,
      node: toBox.node,
      className: toBox.className,
      from: fromBox?.rect ?? makeFallbackFromRect(toBox.rect, toBox.role),
      to: toBox.rect,
      fromOpacity: fromBox ? getRoleOpacity(fromBox.role, fromBox.id, selectedNodeId, fromBox.node.type) : 0,
      toOpacity: getRoleOpacity(toBox.role, toBox.id, selectedNodeId, toBox.node.type),
    };
  });
}

function getAnimatedStyle(node: AnimatedNode, started: boolean): CSSProperties {
  const rect = started ? node.to : node.from;

  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    opacity: started ? node.toOpacity : node.fromOpacity,
  };
}

export function NodeTransition({ fromRun, toRun, selectedNodeId, onDone }: Props) {
  const fromRef = useRef<HTMLDivElement | null>(null);
  const toRef = useRef<HTMLDivElement | null>(null);
  const doneCalledRef = useRef(false);
  const [nodes, setNodes] = useState<AnimatedNode[]>([]);
  const [started, setStarted] = useState(false);
  const selectedStillInPath = useMemo(() => toRun.path.includes(selectedNodeId), [selectedNodeId, toRun.path]);
  const finishOnce = useCallback(() => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    onDone();
  }, [onDone]);

  useLayoutEffect(() => {
    const fromBoxes = getBoxes(fromRef.current, fromRun, selectedNodeId);
    const toBoxes = getBoxes(toRef.current, toRun, selectedNodeId);
    setNodes(buildAnimatedNodes(fromBoxes, toBoxes, selectedNodeId));

    const frame = window.requestAnimationFrame(() => setStarted(true));
    const timer = window.setTimeout(finishOnce, NODE_ANIMATION_MS);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [finishOnce, fromRun, selectedNodeId, toRun]);

  if (!selectedStillInPath) return <MapView state={toRun} onEnterNode={() => {}} />;

  return (
    <div className="node-transition-shell">
      <div className="node-transition-measure" ref={fromRef} aria-hidden="true">
        <MapView state={fromRun} onEnterNode={() => {}} />
      </div>
      <div className="node-transition-final" ref={toRef} aria-hidden="true">
        <MapView state={toRun} onEnterNode={() => {}} />
      </div>
      <div className="node-transition-overlay" aria-hidden="true">
        {nodes.map(node => (
          <div key={node.key} className={node.className} style={getAnimatedStyle(node, started)}>
            <MapNodeContent node={node.node} />
          </div>
        ))}
      </div>
    </div>
  );
}
