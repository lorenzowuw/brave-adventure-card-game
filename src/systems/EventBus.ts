import type { CardDefinition, CardInstance, GameState, OldResourceKey as ResourceKey, StoryEvent } from '../types/game';

export interface GameEvents {
  'turn:draw': { count: number };
  'turn:action': { actionsLeft: number };
  'turn:end': { progress: number };
  'turn:advance': { progress: number };
  'card:play': { card: CardInstance; targetId: string };
  'card:discard': { cardId: string };
  'card:obtain': { card: CardDefinition };
  'resource:change': { key: ResourceKey; before: number; after: number };
  'encounter:resolve': { encounterId: string };
  'encounter:fail': { encounterId: string; damage: number };
  'event:show': { event: StoryEvent };
  'event:choose': { eventId: string; optionId: string };
  'reward:show': { choices: CardDefinition[] };
  'reward:choose': { cardId: string };
  'run:start': { runNumber: number };
  'run:end': { reason: 'victory' | 'defeat' };
  'run:enter_camp': { reason: 'victory' | 'defeat' };
  'camp:heal': { amount: number };
  'camp:repair': { amount: number };
  'save:write': { state: GameState };
  'save:load': { state: GameState };
  // 新系统事件
  'node:enter': { node: string; layer: number };
  'area:complete': { areaId: string };
  'battle:start': { enemyId: string };
  'battle:end': { victory: boolean };
  'blessing:choose': { blessingId: string };
}

type Listener<T> = (payload: T) => void;

export class EventBus<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<Listener<Events[keyof Events]>>>();

  on<K extends keyof Events>(eventName: K, listener: Listener<Events[K]>): () => void {
    const currentListeners = this.listeners.get(eventName) ?? new Set<Listener<Events[keyof Events]>>();
    const nextListeners = new Set(currentListeners);
    nextListeners.add(listener as Listener<Events[keyof Events]>);
    this.listeners.set(eventName, nextListeners);

    return () => {
      const existingListeners = this.listeners.get(eventName) ?? new Set<Listener<Events[keyof Events]>>();
      const remainingListeners = new Set(existingListeners);
      remainingListeners.delete(listener as Listener<Events[keyof Events]>);
      this.listeners.set(eventName, remainingListeners);
    };
  }

  emit<K extends keyof Events>(eventName: K, payload: Events[K]): void {
    const currentListeners = this.listeners.get(eventName) ?? new Set<Listener<Events[keyof Events]>>();
    currentListeners.forEach((listener) => listener(payload));
  }
}

export const eventBus = new EventBus<GameEvents>();
