## [Unreleased] - 2024-xx-xx

### Changed

- Do not allow TransactionBuilder.build() or TransactionBuilder.buildUnsigned() if there are OnAnchoredHandlers
- Default value for paginated queries has been changed from the previous 100, to instead use the value configured as default in the dApp on rell side
- Upgrade postchain-client to 1.9.0

### Breaking

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