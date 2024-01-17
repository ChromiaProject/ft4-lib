# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0r] - 2024-01-17

### Changed

- Added query `get_all_auth_handlers` to get all auth handlers specified by the dApp
- Added query `get_first_allowed_auth_descriptor` to let the blockchain select auth descriptors from a set that can be used to authenticate an operation
- Added possibility to create overridable auth handlers
- Added `resolver` field to `AuthHandler` which can be used to add custom auth logic when evaluating an auth descriptor
- Updated transaction prioritization to work with Postchain 3.14.17 and later.
- Fix `init_transfer` auth message issue that didn't allow `init_transfer` operation to be used with evm auth

### Breaking

- Removed auth descriptor types `ES` and `EM`.

## [0.2.0r] - 2023-12-22

**This version is incompatible with older versions. To upgrade, you'll need to perform a database migration.** For more info, check out [this page](https://docs.chromia.com/rell/language-features/modules/entity#changing-existing-entities)

### Added
- Default values for `lib.ft4.accounts` module_args to simplify `chromia.yml` configuration.
- Added configuration parameter `max_auth_descriptor_rules` for `lib.ft4.accounts` module_args, with default value 8.
- Added an option to customize the rate limiter for some accounts.
- Queries `get_transfer_details`, `get_transfer_details_by_asset` and `get_transfer_history_from_height` to `lib.ft4.assets.external`.
- Support for transaction priority.

### Changed
- Updated signature for `evm_auth_operation_for` to accept a `rell.test.op`.
- `before_authenticate` function is now extendable for adding custom pre-authentication logic.
- `after_authenticate` function is now extendable for executing logic after authentication completes.
- Allow account creation with `create_account_with_auth` without op_context.
- Validate auth descriptors, do not allow creation of expired auth descriptors.

### Breaking Changes
- **Paginated Queries**: Queries `get_accounts_by_participant_id` and `get_account_auth_descriptors_by_participant_id` are now paginated. This change impacts how these queries are consumed and might require adjustments in the calling code.
- **Paginated Queries**: Queries `_get_accounts_by_auth_descriptor_id`, `_get_asset_balances` and `_get_all_assets` which were not paginated has been removed, please use their paginated counterparts with the same name, excluding the `_`. Furthermore, `get_asset_by_name` were also deleted for the same reason, replced by the paginated query `get_assets_by_name`.
- **Rules Structure**: Revised internal structure of the rules. Existing auth descriptors using rules will no longer function and will cause a runtime error when invoked.
- **Address Functions Removed**: Deprecated `evm_address_from_pubkey` and `evm_address_from_privkey`. Use corresponding functions `crypto.eth_pubkey_to_address` and `crypto.eth_privkey_to_address` from Rell standard library for Ethereum address generation.
- **create_account_with_auth** function return `account` instead of `byte_array`.
- **add_auth_descriptor_to_account** function return `account_auth_descriptor` instead of `byte_array`.
- **Rate limit config** New format for rate limit configuration.
- **brid -> blockchain_rid** All instances of `brid` were changed to spell out `blockchain_rid`, to avoid confusion over the meaning of the acronym. This is a list of all the rell-side changes:
    - entity `asset.issuing_brid` -> `asset.issuing_blockchain_rid`
    - every query that returns asset info now returns `blockchain_rid` instead of `brid`
    - message templates for authentication use the `{blockchain_rid}` tag instead of `{brid}`
    - entity `asset_origin.origin_brid` -> `asset_origin.origin_blockchain_rid`
- **Participants, pubkeys, signers** All instances of these words, when related to auth descriptors, were now renamed to **signers**. This is a list of all the rell-side changes:
    - Externals (operations and queries)
        - query `get_account_auth_descriptors_by_participant_id` -> `get_account_auth_descriptors_by_signer`
        - query `get_accounts_by_participant_id` -> `get_accounts_by_signer`

    - Accounts module:
        - struct `single_sig_args.pubkey` -> `single_sig_args.signer`
        - struct `multi_sig_args.pubkeys` -> `multi_sig_args.signers`
        - function `get_participants` -> `get_signers`
        - entity `auth_descriptor_participant` -> `auth_descriptor_signer`
        - function `get_paginated_auth_descriptors_by_participant_id` -> `get_paginated_auth_descriptors_by_signer`
        - function `get_paginated_accounts_by_participant_id` -> `get_paginated_accounts_by_signer`
        - 

    - Internals
        - function `_add_auth_participant` -> `_add_signer`
        - function `_add_eth_auth_participant` > `_add_eth_signer`
- **Transfer history** Remove `transfer_args` and `entry_index` from queries `get_transfer_history_entry` and `get_transfer_history`.

## [0.1.7r] - 2023-10-25

### Added
- Added a function `get_admin_pubkey()` to admin module, to enable retreival of admin pubkey

## [0.1.6r] - 2023-10-20

### Changed
- Cross-chain submodule imports removed from `ft4_basic_dev`

## [0.1.5r] - 2023-10-19

### Added
- Implemented crosschain functions to allow for asset transfer across chains
- New admin module `admin.crosschain` which allows you to register crosschain assets
- Added the ability to specify tests for Rell through `--tests` or `-t` option in `scripts/relltest.sh`.

## [0.1.4r] - 2023-09-29

### Changed
- Importing a module will now always import the corresponding external module too

## [0.1.3r] - 2023-09-19

### Added
- Added more test utility functions.
- Added `evm_address_from_pubkey`

## [0.1.2r] - 2023-09-18

### Changed
- Version module is now included no matter what modules you use from the library.

### Added
- Added more test utility functions.

## [0.1.1r] -- 2023-09-12

### Changed
- Assets are now always returned with all properties from postchain. The three separate properties `asset`, `asset_id` and `decimals` will be removed in favor of the more complete `asset_data`
- Version is now imported in every non-external module, so every dapp using ft4 will have version information

### Added
- Added `test` module with test utility functions.

## [0.1.0r] - 2023-07-12

Initial release
