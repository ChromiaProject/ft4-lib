## [Unreleased] - 2024-xx-xx

### Breaking 💔

- Rename `FlagsType` to `AuthFlag`, and changed it from an enum to an object to allow adding custom flags.

- Method `buildAndSend` in TransactionBuilder no longer supports OnAnchoredHandler:s, use new method 
  `buildAndSendWithAnchoring` instead.

- Removed `LoginManager` type and the `getLoginManager` method in `KeyStoreInteractor`, 
  added `login` method to `KeyStoreInteractor` instead.

- Removed the Orchestrator from the public API, use new `crosschainTransfer` and `resumeCrosschainTransfer` 
  methods in `AuthenticatedAccount` instead. 

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

### Fixed 🔧
