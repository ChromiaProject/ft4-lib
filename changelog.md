# Changelog

## Unreleased

### Fixed
- added exports of admin functions

## [0.1.3] - 2023-07-13

### Added
- license file

### Changed
- license 
- update changelog.md
- update `demo` app to install `v0.1.0` version of FT4 rell module

### Fixed 
- added missing exports

## [0.1.2] - 2023-07-13

### Fixed 
- added missing exports

## [0.1.1] - 2023-07-12

### Fixed 
- added missing exports

## [0.1.0] - 2023-07-12

Initial version

### Added

- Connection, Session, Account, AuthenticatedAccount interfaces
- key store interaces: KeyStore, EvmKeyStore and FtKeyStore
- key store interactor responsible for initializing session object
- login manager
- modules
    - admin
        - operations:
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
            - get balance by asset it
            - get account by id
            - get accounts by participant id
            - get auth descriptor by participant id
            - get transfer history

        - operations
            - add auth descriptor
            - delete auth descriptor
            - delete auth descriptors exclude
