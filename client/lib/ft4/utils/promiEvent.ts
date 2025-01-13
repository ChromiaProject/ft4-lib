import { SignedTransaction, TransactionReceipt } from "postchain-client";
import { EventEmitter } from "events";

export type PromiseExecutor<T> = (
  resolve: (data: T) => void,
  reject: (reason: unknown) => void,
) => void;

export type Web3CustomEventMap = {
  sent?: Buffer;
  built?: SignedTransaction;
  hop?: Buffer;
  init?: TransactionReceipt;
  confirmed?: TransactionReceipt;
};

export type Web3EventKey<T extends Web3CustomEventMap> = string & keyof T;

export type Web3EventCallback<T> = (params: T) => void | Promise<void>;

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

export class Web3EventEmitter<T extends Web3CustomEventMap>
  implements Web3Emitter<T>
{
  private readonly _emitter = new EventEmitter();

  public on<K extends Web3EventKey<T>>(
    eventName: K,
    fn: Web3EventCallback<T[K]>,
  ) {
    this._emitter.on(eventName, fn);
  }

  public once<K extends Web3EventKey<T>>(
    eventName: K,
    fn: Web3EventCallback<T[K]>,
  ) {
    this._emitter.once(eventName, fn);
  }

  public off<K extends Web3EventKey<T>>(
    eventName: K,
    fn: Web3EventCallback<T[K]>,
  ) {
    this._emitter.off(eventName, fn);
  }

  public emit<K extends Web3EventKey<T>>(eventName: K, params: T[K]) {
    this._emitter.emit(eventName, params);
  }

  public listenerCount<K extends Web3EventKey<T>>(eventName: K) {
    return this._emitter.listenerCount(eventName);
  }

  public listeners<K extends Web3EventKey<T>>(eventName: K) {
    return this._emitter.listeners(eventName);
  }

  public eventNames() {
    return this._emitter.eventNames();
  }

  public removeAllListeners() {
    this._emitter.removeAllListeners();
  }
  public setMaxListenerWarningThreshold(maxListenersWarningThreshold: number) {
    this._emitter.setMaxListeners(maxListenersWarningThreshold);
  }
  public getMaxListeners() {
    return this._emitter.getMaxListeners();
  }
}

export class Web3CustomPromiEvent<
  ResolveType,
  EventMap extends Web3CustomEventMap,
> extends Web3EventEmitter<EventMap> {
  private readonly _promise: Promise<ResolveType>;

  constructor(executor: PromiseExecutor<ResolveType>) {
    super();
    this._promise = new Promise<ResolveType>(executor);
  }

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

  public catch<TResult = never>(
    onrejected?:
      | ((reason: unknown) => TResult | PromiseLike<TResult>)
      | undefined,
  ): Promise<ResolveType | TResult> {
    return this._promise.catch(onrejected);
  }

  public finally(onfinally?: (() => void) | undefined): Promise<ResolveType> {
    return this._promise.finally(onfinally);
  }

  public on<K extends Web3EventKey<EventMap>>(
    eventName: K,
    fn: Web3EventCallback<EventMap[K]>,
  ): this {
    super.on(eventName, fn);

    return this;
  }

  public once<K extends Web3EventKey<EventMap>>(
    eventName: K,
    fn: Web3EventCallback<EventMap[K]>,
  ): this {
    super.once(eventName, fn);

    return this;
  }
}
