# Typescript Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-02-25

### Changed 🪙

- In `applyTransfer`, `cancelTransfer`, `unapplyTransfer`, `revertTransfer` and `recallUnclaimedTransfer` the type of `initTransferTx` and `tx` input arguments has been changed from `RawGtx` to `GTX`
- The return type of `createOrchestrator` function `performInitTransfer` has been changed from `Promise<TransferRef>` to `Promise<OrchestratorCore>`
- the `createOrchestrator` functions `createResumeOrchestrator`, `createRevertOrchestrator`, `resumeCrosschainTransfer`, `revertCrosschainTransfer` and `recallUnclaimedCrosschainTransfer` do not take the `authenticator` input argument anymore
- The type `OrchestratorState` has changed
- In the `TransferRef` and `PendingTransfer` type the argument `tx` has been changed from `RawGtx` to `GTX`
- The `createSession` function `transactionBuilder` removed the `config` input argument
- The arguments `onAnchoredHandler` and `targetBlockchainRid` of the type `OperationConfig` and `OperationContext` have been removed
- `getTransactionRid`'s input argument `tx` type changed from `RawGtx` to `RawGtx | GTX` 

### Added ✅

- Added `hasActiveLogin` to the `KeyStoreInteractor` interface, which returns whether a previous login that could be reused is found
- Added `connection` to `Account` and `AuthenticatedAccount` interface
- Added `get_api_version`. While version looks like "1.0.3", and it's difficult to parse, api version is an integer that is increased by one every time the API (queries and operations) changes. It will start at 1 for version 1.0.1, and it will return 0 for 1.0.0.
- Added optional parameter `ttl` to `AuthenticatedAccount.crosschainTransfer`
- The type `OrchestratorData`
- The function `getSystemAnchoringIccfProofOp`
- The type `AnchoringTransactionWithReceipt`
- An implementation of promiEvent that replaces the implementation imported from `postchain-client`
- Added:
  - `getAssetsFiltered`
  - `getBalancesFiltered`
  - `getTransferHistoryEntriesFiltered`
  - `getCrosschainTransferHistoryEntriesFiltered`
  - `getAssetOriginFiltered`
  - `getAppliedTransfersFiltered`
  - `getCanceledTransfersFiltered`
  - `getUnappliedTransfersFiltered`
  - `getRecalledTransfersFiltered`
  - `getPendingTransfersFiltered`
  - `getRevertedTransfersFiltered`
  - `getAccountsFiltered`
  - `getAccountAuthDescriptorsFiltered`
  - `getMainAuthDescriptorsFiltered`
  - `getAuthDescriptorSignersFiltered`
  - `getRlStatesFiltered`
  - `getAccountCreationTransfersFiltered`
  - `getAccountLinksFiltered`
  - `getSubscriptionsFiltered`
  
  to the connection object. The functions all work the same - they have their respective filter and page limit and cursor as arguments. The filterable fields are the ones which are indexed in the corresponding rell entity.

### Fixed 🔧

- added the `transferSubscription` strategy to `TransferStrategies`
- fixed issue that caused invalid signature if the arguments were not specified on an operation in specific cases

### Removed 🗑️

- The interface `OrchestratorBase`
- The type `ExternalOrchestratorBase`
- The type `BufferId` (should now be imported from postchain-client)
- The `transactionBuilder` functions `handleAnchoring`, `waitUntilClusterAnchored`, `waitUntilAnchoredInChain`, `createCreateProof`, `ensureDirectoryClient`, `ensureSystemAnchoringChain` and `invokeOnAnchoringHandlers`
- The class `AnchoringTimeoutError`
- The type `TransactionBuilderConfig`
- The type `OnAnchoredHandler`
- The type `OnAnchoredHandlerData`
- The type `ConfigOptions`

## [1.0.1] - 2024-09-03

### Fixed 🔧

- authentication loop when used with new wagmi version

## [1.0.0] - 2024-07-04

### Changed 🪙
- `Amount`'s `times` and `dividedBy` functions now accept `Amount` as argument as well.

### Added ✅
- Added `hasCrosschainTransferExpired` to check if a specific pending cross-chain transfer has expired.
- Add `getEnabledRegistrationStrategies` to `Connection` interface
- Added filter for `pendingTransferStrategies` to check expired or valid transfers only.
- Added `Filter` type as a generic type to filter in queries.

## [0.8.0] - 2024-05-29

### Breaking 💔
- Removed `getAssetBySymbol` (replaced with `getAssetsBySymbol`).
- Updated `registerCrosschainAsset` to accept asset id instead of asset object.

### Changed 🪙

- Upgrade postchain client to 1.16.1

### Added ✅
- Added `getAssetsBySymbol` to query list of all assets with the same symbol.
- Added `getAssetDetailsForCrosschainRegistration`, used to fetch asset details when registering a crosschain asset.
- Added `getTransferStrategyRules`, used to fetch transfer strategy rules configuration.
- Added `getTransferStrategyRulesGroupedByStrategy`, used to fetch transfer strategy rules configuration grouped by strategies and assets.
- Add `getEnabledRegistrationStrategies` to `Connection` interface
- Exported `evmSignatures`, `registerAccountMessage`, `fetchLoginDetails`.

## [0.7.0] - 2024-04-23

### Breaking 💔

- `registration.registerAccount` now accepts an IClient instead of a Connection.
- Removed the `buildUnsigned` method from TransactionBuilder. 
- All registration strategies can now be found inside the `registrationStrategy`-object. E.g., `registrationStrategy.fee(...)`
- `registerAccount` has been renamed to `registerAccountAdmin`
- Rename "signed" event to "built" in `crosschainTransfer` method
- Remove function `registerAccountEvmSignatures`
- Rename `nonce` query function to `authDescriptorCounter` and rename all the functions that call the query from `getNonce` to `getAuthDescriptorCounter`.

### Changed 🪙

- `crosschainTransfer` function returns a `TransferRef`, which can be used when resuming, reverting and recalling the transfer.
- Changed return type of methods `call` and `callWithoutNop` in `Session` to `Web3PromiEvent`
- Changed return type of methods in `AuthenticatedAccount` to `Web3PromiEvent`
- Changed return type of `registerAccount` to `Web3PromiEvent`

### Added ✅

- Added ttl to crosschainTransfer, which specifies after how much time the transaction should become invalid and must be reverted back to the starting chain.
- Possibility to revert uncompleted crosschain transfers after deadline has passed.
- Possibility to recall unclaimed register account transfers after timeout has passed.

- `addWithAnchoring` method in `TransactionBuilder` to get callback when transaction is anchored in a specific target
  chain.

- `sign` and `signAndSend` methods in `Session` to add your signature to an existing transaction.
- `gtv` object that contains functions for converting objects to/from `gtv`, e.g., `gtv.authDescriptorFromGtv(...)`

- `equals` and `compare` methods to `Amount`.

- Added `deleteAllAuthDescriptorsExceptMain` to `AuthenticatedAccount` interface.
- Added `updateMainAuthDescriptor` function to `AuthenticateAccount` interface.
- Added `getMainAuthDescriptor` to `Account` interface.
- Added `getAuthDescriptorById` to `Account` interface.

- Added `enabledRegistrationStrategies` query.

- Added `signTransactionWithKeyStores` function.

- Added functions to query "lock" accounts and asset balances locked in those accounts
  - `getLockAccounts`
  - `getLockAccountsWithNonZeroBalances`
  - `getLockedAssetBalance`
  - `getLockedAssetAggregatedBalance`
  - `getLockedAssetBalances`
  - `getLockedAssetAggregatedBalances`


### Fixed 🔧

- Fix TS client build.
- Fix use of ethers library.

## [0.6.2] - 2024-03-25

### Fixed 🔧

- Fix use of ethers library.

## [0.6.1] - 2024-03-25

### Fixed 🔧

- Fix TS client build.

## [0.6.0] - 2024-03-22

### Breaking 💔

- Rename `FlagsType` to `AuthFlag`, and changed it from an enum to an object to allow adding custom flags.

- Method `buildAndSend` in TransactionBuilder no longer supports OnAnchoredHandler:s, use new method 
  `buildAndSendWithAnchoring` instead.

- Removed `LoginManager` type and the `getLoginManager` method in `KeyStoreInteractor`, 
  added `login` method to `KeyStoreInteractor` instead.

- Removed the Orchestrator from the public API, use new `crosschainTransfer` and `resumeCrosschainTransfer` 
  methods in `AuthenticatedAccount` instead. 

#### Migration

Instead of making cross-chain transfer with Orchestrator:
```ts
val orchestrator = await createOrchestrator(targetBlockchainRid, recipientId, assetId, amount, senderSession);

orchestrator.onTransferInit(() => { ... });
orchestrator.onTransferHop((brid) => { ... });
orchestrator.onTransferComplete(() => { ... });
orchestrator.onTransferError((error) => { ... });

await orchestrator.transfer();
```
now it has to be done like this:
```ts
await senderSession.account.crosschainTransfer(targetBlockchainRid, recipientId, assetId, amount)
  .on("signed", () => { ... })
  .on("init", (receipt: TransactionReceipt) => { ... })
  .on("hop", (blockchainRid: Buffer) => { ... });
```

Interrupted cross-chain transfers can be resumed like this:
```ts
await senderSession.account.resumeCrosschainTransfer(pendingTransfer)
  .on("hop", (blockchainRid: Buffer) => { ... })
```

Since `logout` method was removed from `LoginManager` in previous release, there is no longer need for `LoginManager` type. Login (adding disposable auth descriptors) can be performed by calling `login` on `KeyStoreInteractor`. So instead of
```ts
const { session } = await keyStoreInteractor.getLoginManager().login({ accountId });
```
now we login like this:
```ts
const { session } = await keyStoreInteractor.login({ accountId });
```


### Changed 🪙

- TransactionBuilder will wait for transactions to be anchored in system anchoring chain before invoking 
  OnAnchoredHandler:s.
- Methods `buildAndSend` and `buildAndSendWithAnchoring` in TransactionBuilder return `Web3PromiEvent` and emits 
  events when transaction is built, sent and confirmed (only `buildAndSendWithAnchoring`).
- `logout` function returned from `KeyStoreInteractor.login()` and `registerAccount()` will delete auth descriptors 
  for disposable key.
- TransactionBuilder will throw `SigningError` if signing fails for some reason (e.g. is rejected by user).
- `crosschainTransfer` method will throw `SigningError` if signing fails for some reason (e.g. is rejected by user).

### Added ✅

- New method `buildAndSendWithAnchoring` in TransactionBuilder which will wait for anchoring in cluster and system 
  anchoring chains before resolving promise.
- New event `signed` in `crosschainTransfer` method which is emitted when the `initTransfer` transaction is signed.

- `getAssetsByType` query function

- Include `isCrosschain` flag in response from queries `getTransferHistory`, `getTransferHistoryFromHeight` 
  and `getTransferHistoryEntry`.
- Include `blockchainRid` in response from queries `getTransferDetails` and `getTransferDetailsByAsset`.

- Include auth descriptor config (`maxRules` and `maxNumberPerAccount`) in `Config`.

- Added `loadOperationFromTransaction` that receives `RawGtx` or `SignedTransaction` (encoded tx) and returns `Operation` at provided index

- Added `getLastPendingCrosschainTransaction` to `Account` interface

## [0.5.0] - 2024-02-29

### Breaking 💔

- updated `postchain-client` version to 1.15.0
- Moved `logout` function from `LoginManager` to object returned from `LoginManager.login()` and `registerAccount()`.
- Moved `loginKeyStore` parameter from `KeyStoreInteractor.getLoginManager()` to `LoginManager.login(LoginOptions)`.

### Added ✅

- account registration strategies
  - create on transfer
    - subscription

- functions to directly create account with fee and subscription strategies

### Fixed 🔧
- uncaught exception triggered after creating evm keystore and when all accounts disconnected from wallet GUI

## [0.4.0] - 2024-02-15

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

### Bugfixes 🐛
- Orchestrator and transaction builder waits until transaction is anchored in SAC before moving to next step

### Breaking 💔

- Removed pagination from auth descriptor queries 
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

## [0.3.2] - 2024-02-06

### Fixed

- Fixes invalid parameter name for `ft4.get_auth_handler_for_operation` query

## [0.3.1] - 2024-01-19

### Changed
- `Amount` type is now exported
- A new field `opIndex` was added to the `TransferHistoryEntry` type which can be passed into `getTransferDetails` and `getTransferDetailsByAsset`

## [0.3.0] - 2024-01-17

### Changed

- Fixed Rollup bundling issues

## [0.2.0] - 2023-12-22

### Added
- Implemented an End-to-End (E2E) testing environment using Cypress.
- Cypress tests can be run using `npm run test:e2e` for interactive mode and `npm run test:e2e:headless` for headless mode.

### Breaking
- Removed `getClientVersion()` function
- Removed `AuthenticatorSession`
- The API for creating auth descriptor rules has been updated
- The API for `getBalancesByAccountId()` has been updated to be paginated
- Removed type `TransferHistoryTransferArgs` and corresponding fields in `TransferHistoryEntry`
- Removed entryIndex from `TransferHistoryEntry`
- Change the type of `lastUpdate` field of the `RateLimit` type from `number` to `Date`
- **brid -> blockchainRid** All instances of brid were changed to spell out blockchainRid, to avoid confusion over the meaning of the acronym. Where the name already said `chainBrid`, it became `chainRid`. This is a list of all the user-facing client-side changes:
    - `Asset.brid` -> `Asset.blockchainRid`
    - `AuthDataService.getBrid` -> `AuthDataService.getBlockchainRid`
- **Participants, pubkeys, signers** All instances of these words, when related to auth descriptors, were now renamed to **signers**. This is a list of all the client-side changes:
    - `Connection.getAccountsByParticipantId` -> `Connection.getAccountsBySigner`
    - `Account.getAuthDescriptorsByParticipantId` -> `Account.getAuthDescriptorsBySigner`

### Changed 
- Upgrade postchain-client to 1.9.0
- Added a function `getAccountsPaginated()` to get all accounts
- Added methods `getTransferDetails()` and `getTransferDetailsByAsset()` in `Connection`
- Added function `getTransferHistoryFromHeight`
- Exported `RateLimit` type
- Added `blockchainRid` to `Account` interface

## [0.1.9] - 2023-11-14

### Changed 
- Use Rollup for packaging, produce output for ECMAScript, Common.JS and UMD. 
- Move `cryptoUtils` module into main library (imports needs to be updated).
- Export `createAmountFromBalance` and `createAssetObject` functions.

## [0.1.8] - 2023-10-25

### Changed
- Updated cross-chain transfer orchestrator to add `nop` operation to "init", "apply" and "complete" transactions to avoid tx rid conflicts
- Updated `KeyHandler` interface. `authorize` function `nonce: number` argument is replaced with `context: TxContext` 

## [0.1.7] - 2023-10-19

### Added
- Added createOrchestrator for crosschain transfers
- Refactored type exports to allow easier importing from entry index file.
- assetOriginById: query that retrieves the "asset origin", which is the only chain the asset can be received from
- findPathToChainForAsset: traverses the tree structure of the linked chains to find the path to a certain asset.
- `TransactionBuilder` now has a function `buildAndSend` which immediately submits the built transaction
- Functions that add operations to `TransactionBuilder` now accepts an optional callback which will be invoked when the transaction is included in a block that has been anchored on the anchoring chain

## [0.1.6] - 2023-09-29

### Fixed
- addAuthDescriptor and deleteAuthDescriptor were hard to use, as you couldn't easily use the new keypair you just added in subsequent operations. They now return the receipt and a new session to use for future operations if you want to also use the current auth descriptor.
- exported some types regarding assets that weren't available for end users

### Changed
- All operations now return an TransactionCompletion, which holds the receipt and (optionally) additional data

## [0.1.5] - 2023-09-12

### Added
- createGenericEvmKeyStore: it receives an address and a sign function, to allow for custom implementations with any web3 library. Metamask is still supported through ethers for ease of setup.
- fixed examples
- Custom Event Emitter for handling various events like Metamask address change, crosschain transfer notifications.
- Auth messages now includes rid of the blockchain to which the tx is being submitted.

### Changed
- Transfer history's asset properties are now of the Asset type
- Auth messages now include rid of the blockchain to which the tx is being submitted.

### Fixed
- Asset queries now return Asset type with `iconUrl`, not `icon_url`
- Balance queries now return frozen objects
- Exports of admin functions.
- `authenticate()` function will now try to match operation name exactly when searching for auth handlers and throw an error if none is found. The old behaviour where scope path was traversed to the root can be aquired again by calling `authenticate(strict = false)`
- `Connection` interface is now exported and part of the public interface

## [0.1.4] - 2023-07-21

### Changed
- README

## [0.1.3] - 2023-07-13

### Added
- License file.

### Changed
- License.
- Updated changelog.
- `Demo` app updated to install `v0.1.0` version of FT4 rell module.

### Fixed 
- Added missing exports.

## [0.1.2] - 2023-07-13

### Fixed 
- Added missing exports.

## [0.1.1] - 2023-07-12

### Fixed 
- Added missing exports.

## [0.1.0] - 2023-07-12

Initial version

### Added
- Connection, Session, Account, AuthenticatedAccount interfaces.
- Key store interfaces: KeyStore, EvmKeyStore and FtKeyStore.
- Key store interactor responsible for initializing session object.
- Login manager.
- Modules
    - admin
        - operations
            - register account
            - register asset
            - mint
    - asset 
        - queries
            - get registered assets
            - get assets by name
            - get asset by id
            - get asset by symbol
        - operations
            - transfer
    - accounts
        - queries
            - get balances
            - get balance by asset id
            - get account by id
            - get accounts by participant id
            - get auth descriptor by participant id
            - get transfer history
        - operations
            - add auth descriptor
            - delete auth descriptor
            - delete auth descriptors exclude
