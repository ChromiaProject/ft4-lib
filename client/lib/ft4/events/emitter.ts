import { Listener } from "./types";

/**
 * Class that can handle event dispatching. Users can register
 * event handlers for certain events and when the `emit()` function
 * is called, this class will take care of invoking all of the event
 * handlers that were registered for events of that type.
 */
export class EventEmitter<T extends Record<string, any[]>> {
  private events: Partial<Record<keyof T, Listener<T[keyof T]>[]>> = {};

  /**
   * Registers a new listener for the event.
   *
   * @param event - The event name.
   * @param listener - The listener callback.
   * @returns A function that removes the listener when called.
   */
  on<K extends keyof T>(event: K, listener: Listener<T[K]>): () => void {
    const listeners = (this.events[event] = this.events[event] || []);
    listeners.push(listener);

    return () => this.off(event, listener);
  }

  /**
   * Removes a listener for the event.
   *
   * @param event - The event name.
   * @param listener - The listener callback.
   */
  off<K extends keyof T>(event: K, listener: Listener<T[K]>) {
    const listeners = this.events[event];
    if (!listeners) return;

    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Fires the event, calling all registered listeners with the provided arguments.
   *
   * @param event - The event name.
   * @param args - The arguments for the listeners.
   */
  emit<K extends keyof T>(event: K, ...args: T[K]) {
    const listeners = this.events[event];
    if (!listeners) return;

    listeners.forEach((listener) => {
      try {
        listener(...args);
      } catch (err) {
        console.error(`Error in listener for event "${String(event)}":`, err);
      }
    });
  }
}
