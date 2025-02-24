import { SignedTransaction, TransactionReceipt } from "postchain-client";
import { EventEmitter } from "events";

/**
 * A function type that defines how a promise should be executed.
 * @template T The type of data that will be resolved
 */
export type PromiseExecutor<T> = (
  resolve: (data: T) => void,
  reject: (reason: unknown) => void,
) => void;

/**
 * Custom event map for Web3 events during transaction lifecycle
 *
 * @property {Buffer} [sent] - Represents the transaction rid of a receipt
 * @property {SignedTransaction} [built] - Emitted when transaction is built and signed
 * @property {Buffer} [hop] - Emitted for each hop in a cross-chain transaction
 * @property {TransactionReceipt} [init] - Emitted when transaction is initialized
 * @property {TransactionReceipt} [confirmed] - Emitted when transaction is confirmed
 */
export type Web3CustomEventMap = {
  sent?: Buffer;
  built?: SignedTransaction;
  hop?: Buffer;
  init?: TransactionReceipt;
  confirmed?: TransactionReceipt;
};

/**
 * Type for event keys in Web3CustomEventMap
 * @template T The event map type extending Web3CustomEventMap
 */
export type Web3EventKey<T extends Web3CustomEventMap> = string & keyof T;

/**
 * Type for event callback functions
 * @template T The type of data passed to the callback
 */
export type Web3EventCallback<T> = (params: T) => void | Promise<void>;

/**
 * Interface defining the event emitter methods for Web3 events
 * @template T Extends Web3CustomEventMap for type-safe event handling
 */
export interface Web3Emitter<T extends Web3CustomEventMap> {
  on<K extends Web3EventKey<T>>(
    eventName: K,
    fn: Web3EventCallback<T[K]>,
  ): void;
  once<K extends Web3EventKey<T>>(
    eventName: K,
    fn: Web3EventCallback<T[K]>,
  ): void;
  off<K extends Web3EventKey<T>>(
    eventName: K,
    fn: Web3EventCallback<T[K]>,
  ): void;
  emit<K extends Web3EventKey<T>>(eventName: K, params: T[K]): void;
}

/**
 * Implementation of Web3Emitter that wraps Node's EventEmitter
 * Provides type-safe event handling for Web3 events
 * @template T Extends Web3CustomEventMap for typed events
 */
export class Web3EventEmitter<T extends Web3CustomEventMap>
  implements Web3Emitter<T>
{
  private readonly _emitter = new EventEmitter();

  /**
   * Adds a listener for a specific event
   * @param eventName The name of the event to listen for
   * @param fn The callback function to execute when the event is emitted
   */
  public on<K extends Web3EventKey<T>>(
    eventName: K,
    fn: Web3EventCallback<T[K]>,
  ) {
    this._emitter.on(eventName, fn);
  }

  /**
   * Adds a one-time listener for a specific event
   * @param eventName The name of the event to listen for
   * @param fn The callback function to execute when the event is emitted
   */
  public once<K extends Web3EventKey<T>>(
    eventName: K,
    fn: Web3EventCallback<T[K]>,
  ) {
    this._emitter.once(eventName, fn);
  }

  /**
   * Removes a specific listener for an event
   * @param eventName The name of the event to remove the listener from
   * @param fn The callback function to remove
   */
  public off<K extends Web3EventKey<T>>(
    eventName: K,
    fn: Web3EventCallback<T[K]>,
  ) {
    this._emitter.off(eventName, fn);
  }

  /**
   * Emits an event with the given parameters
   * @param eventName The name of the event to emit
   * @param params The parameters to pass to the event listeners
   */
  public emit<K extends Web3EventKey<T>>(eventName: K, params: T[K]) {
    this._emitter.emit(eventName, params);
  }

  /**
   * Returns the number of listeners for a specific event
   * @param eventName The name of the event to count listeners for
   * @returns The number of listeners
   */
  public listenerCount<K extends Web3EventKey<T>>(eventName: K) {
    return this._emitter.listenerCount(eventName);
  }

  /**
   * Returns an array of listeners for a specific event
   * @param eventName The name of the event to get listeners for
   * @returns Array of listener functions
   */
  public listeners<K extends Web3EventKey<T>>(eventName: K) {
    return this._emitter.listeners(eventName);
  }

  /**
   * Returns an array of event names that have registered listeners
   * @returns Array of event names
   */
  public eventNames() {
    return this._emitter.eventNames();
  }

  /**
   * Removes all listeners for all events
   */
  public removeAllListeners() {
    this._emitter.removeAllListeners();
  }

  /**
   * Sets the maximum number of listeners before a warning is issued
   * @param maxListenersWarningThreshold The maximum number of listeners
   */
  public setMaxListenerWarningThreshold(maxListenersWarningThreshold: number) {
    this._emitter.setMaxListeners(maxListenersWarningThreshold);
  }

  /**
   * Returns the maximum number of listeners that can be registered before a warning is issued
   * @returns The maximum number of listeners
   */
  public getMaxListeners() {
    return this._emitter.getMaxListeners();
  }
}

/**
 * Custom implementation of an event emitter for Web3 events that extends Promise functionality
 * @template ResolveType The type that the promise will resolve to
 * @template EventMap The map of possible events that can be emitted
 */
export class Web3CustomPromiEvent<
  ResolveType,
  EventMap extends Web3CustomEventMap,
> extends Web3EventEmitter<EventMap> {
  private readonly _promise: Promise<ResolveType>;

  /**
   * Creates a new Web3CustomPromiEvent instance
   * @param executor Function that defines the promise execution logic
   */
  constructor(executor: PromiseExecutor<ResolveType>) {
    super();
    this._promise = new Promise<ResolveType>(executor);
  }

  /**
   * Attaches callbacks for the resolution and/or rejection of the Promise
   * @param onfulfilled The callback to execute when the Promise is resolved
   * @param onrejected The callback to execute when the Promise is rejected
   * @returns A Promise for the completion of which ever callback is executed
   */
  public then<TResult1 = ResolveType, TResult2 = never>(
    onfulfilled?:
      | ((value: ResolveType) => TResult1 | PromiseLike<TResult1>)
      | undefined,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | undefined,
  ): Promise<TResult1 | TResult2> {
    return this._promise.then(onfulfilled, onrejected);
  }

  /**
   * Attaches a callback for only the rejection of the Promise
   * @param onrejected The callback to execute when the Promise is rejected
   * @returns A Promise for the completion of the callback
   */
  public catch<TResult = never>(
    onrejected?:
      | ((reason: unknown) => TResult | PromiseLike<TResult>)
      | undefined,
  ): Promise<ResolveType | TResult> {
    return this._promise.catch(onrejected);
  }

  /**
   * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected)
   * @param onfinally The callback to execute when the Promise is settled
   * @returns A Promise for the completion of the callback
   */
  public finally(onfinally?: (() => void) | undefined): Promise<ResolveType> {
    return this._promise.finally(onfinally);
  }

  /**
   * Adds a listener for a specific event that will be called every time the event is emitted
   * @param eventName The name of the event to listen for
   * @param fn The callback function to execute when the event is emitted
   * @returns The instance of Web3CustomPromiEvent for chaining
   */
  public on<K extends Web3EventKey<EventMap>>(
    eventName: K,
    fn: Web3EventCallback<EventMap[K]>,
  ): this {
    super.on(eventName, fn);
    return this;
  }

  /**
   * Adds a one-time listener for a specific event that will be removed after being called once
   * @param eventName The name of the event to listen for
   * @param fn The callback function to execute when the event is emitted
   * @returns The instance of Web3CustomPromiEvent for chaining
   */
  public once<K extends Web3EventKey<EventMap>>(
    eventName: K,
    fn: Web3EventCallback<EventMap[K]>,
  ): this {
    super.once(eventName, fn);
    return this;
  }
}
