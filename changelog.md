# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed 
- Upgrade postchain-client to 1.8.1.

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
