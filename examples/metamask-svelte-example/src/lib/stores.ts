import type { Connection, KeyStore } from '@chromia/ft4';
import { writable } from 'svelte/store';

export const evmKeyStore = writable<KeyStore | undefined>();
export const connectionStore = writable<Connection | undefined>(undefined);