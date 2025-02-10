## [Unreleased] - 2024-xx-xx

### Breaking 💔

### Changed 🪙

- In `applyTransfer` the type of `initTransferTx` and `tx` input arguments has been changed from `RawGtx` to `GTX`
- In `cancelTransfer` the type of `initTransferTx` and `tx` input arguments has been changed from `RawGtx` to `GTX`
- In `unapplyTransfer` the type of `initTransferTx` and `tx` input arguments has been changed from `RawGtx` to `GTX`
- In `revertTransfer` the type of `initTransferTx` and `tx` input arguments has been changed from `RawGtx` to `GTX`
- In `recallUnclaimedTransfer` the type of `initTransferTx` input argument has been changed from `RawGtx` to `GTX`
- The return type of `createOrchestrator` function `performInitTransfer` has been changed from `Promise<TransferRef>` to `Promise<OrchestratorCore>`
- Removed the input argument `authenticator` of the `createOrchestrator` function `createResumeOrchestrator`
- Removed the input argument `authenticator` of the `createOrchestrator` function `createRevertOrchestrator`
- Removed the input argument `authenticator` of the function `resumeCrosschainTransfer`
- Removed the input argument `authenticator` of the function `revertCrosschainTransfer`
- Removed the input argument `authenticator` of the function `recallUnclaimedCrosschainTransfer`
- The type `OrchestratorState` has changed from `{ currentHopIndex: number }` to 
`{ nextHopIndex: number; tx: GTX; opIndex: number; systemConfirmationProof: (brid: Buffer) => Promise<Operation>; }` 
- In the `TransferRef` type the argument `tx` from `RawGtx` to `GTX`
- In the `PendingTransfer` type the argument `tx` from `RawGtx` to `GTX`
- The `createSession` function `transactionBuilder` removed the `config` input argument
- The arguments `onAnchoredHandler` and `targetBlockchainRid` of the type `OperationConfig` have been removed
- The arguments `onAnchoredHandler` and `targetBlockchainRid` of the type `OperationContext` have been removed
- The function's `getTransactionRid` input argument `tx` type changed from `RawGtx` to `RawGtx | GTX` 

### Added ✅

- Added `hasActiveLogin` to the `KeyStoreInteractor` interface, which returns whether a previous login that could be reused is found
- Added `connection` to `Account` and `AuthenticatedAccount` interface
- Added `get_api_version`. While version looks like "1.0.3", and it's difficult to parse, api version is an integer that is increased by one every time the API (queries and operations) changes. It will start at 1 for version 1.0.1, and it will return 0 for 1.0.0.
- Added optional parameter `ttl` to `AuthenticatedAccount.crosschainTransfer`
- The type `OrchestratorData`
- The function `getSystemAnchoringIccfProofOp`
- The type `AnchoringTransactionWithReceipt`
- An implementation of promiEvent that replaces the implementation imported from `postchain-client`
- In the `Connection` interface the crosschain query function `getAssetOriginFiltered` that retrieves paginated asset origins filtered by asset ids
- In the `Connection` interface the crosschain query function `getAppliedTransfersFiltered` that retrieves paginated applied transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getCanceledTransfersFiltered` that retrieves paginated canceled transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getUnappliedTransfersFiltered` that retrieves paginated unapplied transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getRecalledTransfersFiltered` that retrieves paginated recalled transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getPendingTransfersFiltered` that retrieves paginated pending transfers filtered by transaction rids, op index and sender account id
- In the `Connection` interface the crosschain query function `getRevertedTransfersFiltered` that retrieves paginated reverted transfers filtered by init tx rids and init op index

### Fixed 🔧

- added the `transferSubscription` strategy to `TransferStrategies`

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