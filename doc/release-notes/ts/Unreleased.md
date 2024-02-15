## [Unreleased] - 2024-xx-xx

### Changed 🪙

- `authenticator.getKeyHandlerForOperation` will not return auth descriptors whose rules don't allow them to be used.
- `AuthDataService.getAllowedAuthDescriptors` now accepts `Buffer | string` instead of `Buffer` only
- Auth descriptor queries updated to include `account_id` in response.
- Limit how many auth descriptors can be added to an account. Default value is 10 and maximum is 200. 

### Added ✅

- `AuthDescriptorValidator` with `hasExpired` and `isActive` methods to check whether the auth descriptor is expired or active. An inactive auth descriptor is one that will be valid in the future, an expired one was valid in the past.
- `createAuthDescriptorValidator(authDataService, useCache)` to use the above mentioned validator. If it uses cache, it will cache `op_count` of each auth descriptor and `block_height` as soon as it needs to query them.
- Do not allow TransactionBuilder.build() or TransactionBuilder.buildUnsigned() if there are OnAnchoredHandlers
- Default value for paginated queries has been changed from the previous 100, to instead use the value configured as default in the dApp on rell side
- Upgrade postchain-client to 1.9.0
- Added support for rules or TTL in login manager.

- account registration with following strategies
  - open
  - create on transfer
    - open
    - fee

### Bugs 🐛
- Orchestrator and transaction builder waits until transaction is anchored in SAC before moving to next step

### Breaking 💔

- Removed pagination from 
- Change `assetData` to `asset` in `TransferHistoryEntry`.

- Update `addAuthDescriptor` signature  
Old:
```ts
addAuthDescriptor(authDescriptor: AnyAuthDescriptorRegistration, newSigner: SignatureProvider | KeyPair)
```
New:
```ts
addAuthDescriptor(authDescriptor: AnyAuthDescriptorRegistration, keyStore: FtKeyStore)
```

- Update LoginKeyStore interface
Old:
```ts
interface LoginKeyStore {
  clear(accountId: Buffer);
  getKeyPair(accountId: Buffer): Promise<KeyPair | null>;
  createKeyPair(accountId: Buffer): Promise<KeyPair>;
}
```
New:
```ts
interface LoginKeyStore {
  clear(accountId: Buffer): Promise<void>;
  getKeyStore(accountId: Buffer): Promise<FtKeyStore | null>;
  generateKey(accountId: Buffer): Promise<FtKeyStore>;
}
```