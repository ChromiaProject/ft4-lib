## [Unreleased] - 2024-xx-xx

### Breaking 💔

### Changed 🪙
- Moved the type `TransferStrategyRuleAmount`, `TransferSenderBlockchains`, `TransferParticipants`, `TransferStrategyRulePartial`, `TransferParticipantSingle` and `AssetLimit` a directory up
- The type's `TransferStrategyRuleRaw` property `asset_limits` was changed from from `AssetLimitRaw[]` to `AllowedAssets[]`
- The type `AssetLimitRaw` properties to `{ allow_all: boolean; allowed_values: AllowedAssets[];}`


### Added ✅

- Added `hasActiveLogin` to the `KeyStoreInteractor` interface, which returns whether a previous login that could be reused is found
- Added `connection` to `Account` and `AuthenticatedAccount` interface
- Added `get_api_version`. While version looks like "1.0.3", and it's difficult to parse, api version is an integer that is increased by one every time the API (queries and operations) changes. It will start at 1 for version 1.0.1, and it will return 0 for 1.0.0.
- Added optional parameter `ttl` to `AuthenticatedAccount.crosschainTransfer`
- In the `Connection` interface the crosschain query function `getAssetOriginFiltered` that retrieves paginated asset origins filtered by asset ids
- In the `Connection` interface the crosschain query function `getAppliedTransfersFiltered` that retrieves paginated applied transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getCanceledTransfersFiltered` that retrieves paginated canceled transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getUnappliedTransfersFiltered` that retrieves paginated unapplied transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getRecalledTransfersFiltered` that retrieves paginated recalled transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getPendingTransfersFiltered` that retrieves paginated pending transfers filtered by transaction rids, op index and sender account id
- In the `Connection` interface the crosschain query function `getRevertedTransfersFiltered` that retrieves paginated reverted transfers filtered by init tx rids and init op index
- Added the utility functions `validateCrosschainRegistrationStrategyRules`, `getValidRules`, `isValidParticipantRule`, `isValidSenderBlockchainRule`, `isValidAssetRule`, `validateAssetLimitRule` that perform improved validation of the transfer strategy rules, when using the strategies `fee` and `subscription`
- Added the maping function `mapResponseToRaw` that sets consistency for the asset properties rules retrieved from rell, to match the format of the rest of the rules  
- Added the type `TransferStrategyRuleRawV2`
- Extended the type `AssetLimit` to also contain `name` and `issuingBlockchainRid`

### Fixed 🔧

- added the `transferSubscription` strategy to `TransferStrategies`
