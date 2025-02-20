## [Unreleased] - 2024-xx-xx

### Breaking 💔

### Changed 🪙

- In `applyTransfer`, `cancelTransfer`, `unapplyTransfer`, `revertTransfer` and `recallUnclaimedTransfer` the type of `initTransferTx` and `tx` input arguments has been changed from `RawGtx` to `GTX`
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
- Added in the `Connection` interface the query function `getAssetsFiltered` that retrieves paginated assets filtered by asset ids, name, symbol and type
- Added in the `Connection` interface the query function `getBalancesFiltered` that retrieves paginated balances filtered by account ids and asset ids 
- Added in the `Connection` interface the query function `getTransferHistoryEntriesFiltered` that retrieves paginated transfer history entries filtered by account ids, asset ids, transaction rids and op index
- Added in the `Connection` interface the query function `getCrosschainTransferHistoryEntriesFiltered` that retrieves paginated crosschain transfer history entries filtered by account ids, asset ids, transaction rids and op index
- In the `Connection` interface the crosschain query function `getAssetOriginFiltered` that retrieves paginated asset origins filtered by asset ids
- In the `Connection` interface the crosschain query function `getAppliedTransfersFiltered` that retrieves paginated applied transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getCanceledTransfersFiltered` that retrieves paginated canceled transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getUnappliedTransfersFiltered` that retrieves paginated unapplied transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getRecalledTransfersFiltered` that retrieves paginated recalled transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getPendingTransfersFiltered` that retrieves paginated pending transfers filtered by transaction rids, op index and sender account id
- In the `Connection` interface the crosschain query function `getRevertedTransfersFiltered` that retrieves paginated reverted transfers filtered by init tx rids and init op index
- added `getAccountsFiltered`, `getAccountAuthDescriptorsFiltered`, `getMainAuthDescriptorsFiltered`, `getAuthDescriptorSignersFiltered`, `getRlStatesFiltered`,`getAccountCreationTransfersFiltered`, `getAccountLinksFiltered`, `getSubscriptionsFiltered` to the connection object. The functions all work the same - they have their respective filter and page limit and cursor as arguments. The filterable fields are the ones which are indexed in the corresponding rell entity.

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
- fixed issue that caused invalid signature if the arguments were not specified on an operation in specific cases
