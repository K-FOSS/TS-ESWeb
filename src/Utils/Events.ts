// src/Server/Utils/Events.ts
// Source: https://rjzaworski.com/2019/10/event-emitters-in-typescript
import { EventEmitter } from 'events';

type EventMap = Record<string, unknown>;

type EventKey<T extends EventMap> = string & keyof T;
type EventReceiver<T> = (params: T) => void;

interface Emitter<T extends EventMap> {
  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void;
  off<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void;
  emit<K extends EventKey<T>>(eventName: K, params: T[K]): void;
}

/**
 * Abstract TypeSafe Event Emitter Class
 *
 * @abstract
 * @example
 * ```ts
 * class HMREventsClass extends MyEmitter<{ fileChanged: string }> {}
 *
 * const hmrEvents = new HMREventsClass();
 *
 * hmrEvents.on('fileChanged', (filePath) => console.log(filePath))
 * ```
 */
export abstract class BaseEventEmitter<T extends EventMap>
  implements Emitter<T> {
  private emitter = new EventEmitter();
  public on<K extends EventKey<T>>(
    eventName: K,
    fn: EventReceiver<T[K]>,
  ): void {
    this.emitter.on(eventName, fn);
  }

  public off<K extends EventKey<T>>(
    eventName: K,
    fn: EventReceiver<T[K]>,
  ): void {
    this.emitter.off(eventName, fn);
  }

  public emit<K extends EventKey<T>>(eventName: K, params: T[K]): void {
    this.emitter.emit(eventName, params);
  }
}
