## [Unreleased] - 2024-xx-xx

### Breaking 💔

- Rename `FlagsType` to `AuthFlag`, and changed it from an enum to an object to allow adding custom flags.

- Method `buildAndSend` in TransactionBuilder no longer supports OnAnchoredHandler:s, use new method 
  `buildAndSendWithAnchoring` instead.

### Changed 🪙

- TransactionBuilder will wait for transactions to be anchored in system anchoring chain before invoking 
  OnAnchoredHandler:s.
- Methods `buildAndSend` and `buildAndSendWithAnchoring` in TransactionBuilder return `Web3PromiEvent` and emits 
  events when transaction is built, sent and confirmed (only `buildAndSendWithAnchoring`). 

### Added ✅

- New method `buildAndSendWithAnchoring` in TransactionBuilder which will wait for anchoring in cluster and system 
  anchoring chains before resolving promise.
- New event `TransferSigned` in Orchestrator which is emitted when the `initTransfer` transaction is signed.

### Fixed 🔧
