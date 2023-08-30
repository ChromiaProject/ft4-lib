# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [Unreleased]

### Added
- assetOriginById: query that retrieves the "asset origin", which is the only chain the asset can be received from
- findPathToChainForAsset: traverses the tree structure of the linked chains to find the path to a certain asset.
- createGenericEvmKeyStore: it receives an address and a sign function, to allow for custom implementations with any web3 library. Metamask is still supported through ethers for ease of setup.
- fixed examples
- Custom Event Emitter for handling various events like Metamask address change, crosschain transfer notifications.

### Changed
- Transfer history's asset properties are now of the Asset type

### Fixed
- Asset queries now return Asset type with `iconUrl`, not `icon_url`
- Balance queries now return frozen objects
- Exports of admin functions.
- `authenticate()` function will now try to match operation name exactly when searching for auth handlers and throw an error if none is found. The old behaviour where scope path was traversed to the root can be aquired again by calling `authenticate(strict = false)`

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
