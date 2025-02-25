# Rell Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-02-25

### Breaking 💔

### Changed 🪙
- Allow multiple smaller transfers to a non-existing account for the same asset type. 

- The logic takes multiple senders for one recipient into consideration
- `register_account` used for crosschain transfers with the strategies `fee`, `open` and `subscription` does not require a signature, when transfering to the same account
- Updated the response of the query `get_account_by_id` to also return type along with id

### Added ✅
- Added a blacklist for operations that may not be used after an auth operation (`evm_auth` and `ft_auth`). Defined in the `chromia.yml` as `core.auth.auth_op_blacklisted_operations`, it works the same way as `evm_signatures_authorized_operations`, except the former is a list of operations that are not allowed, while the latter includes only allowed operations.
- Added RellDocs for everything
- Added `get_api_version`. While version looks like "1.0.3", and it's difficult to parse, api version is an integer that is increased by one every time the API (queries and operations) changes. It will start at 1 for version 1.1.0.
- Added `get_block_height`, analogous to `latest_time`. The main difference is that the block height returned is the height of the *next* block to be produced, if in a query. This is also analogous to the difference between `op_context.last_block_time` and `op_context.block_height`, where the height refers to the current block and the time to the last block.
- Multiple queries were added:
  - `get_assets_filtered`
  - `get_balances_filtered`
  - `get_transfer_history_entries_filtered`
  - `get_crosschain_transfer_history_entries_filtered`
  - `get_asset_origin_filtered`
  - `get_applied_transfers_filtered`
  - `get_canceled_transfers_filtered`
  - `get_unapplied_transfers_filtered`
  - `get_recalled_transfers_filtered`
  - `get_pending_transfers_filtered`
  - `get_reverted_transfers_filtered`
  - `get_accounts_filtered`
  - `get_account_auth_descriptors_filtered`
  - `get_main_auth_descriptors_filtered`
  - `get_auth_descriptor_signers_filtered`
  - `get_rl_states_filtered`
  - `get_account_creation_transfers_filtered`
  - `get_account_links_filtered`
  
  All are mounted on 'ft4' directly.
- Added two extendable functions:
  - `before_crosschain_balance_change`
  - `after_crosschain_balance_change`
  
  The extensions are being called in the `Unsafe.update_balances_if_needed` function which is a part of crosschain transfers.


### Fixed 🔧

- `authenticate()` and `authenticate_and_return_context()` will no longer delete the auth descriptor used to authenticate the operation, even if it expired during the authentication process.

## [1.0.0r] - 2024-07-04

### Added ✅
- Added option to filter results in `get_pending_transfer_strategies` based on whether the transfer has expired.

### Fixed 🔧
- Fixed an issue in `get_auth_message_template` query, where query fails if gtv encoded null is provided as `args` value

## [0.8.0r] - 2024-05-29

### Breaking 💔
- Removed key constraint from `asset` entity `symbol` attribute. 
- Removed `get_asset_by_symbol` (replaced with `get_assets_by_symbol`)
- Updated `register_crosschain_asset` operation and function. Added asset id, asset type and uniqueness resolver arguments.
- Rename `get_paginated_asset_balances_by_name` function to `get_paginated_assets_by_name`
- Removed function `_ft_auth` 
- Removed query `ft4.get_account_by_auth_descriptor`

### Changed 🪙
- Make `asset` entity `icon_url` attribute mutable.

### Added ✅
- Added `uniqueness_resolver` attribute to `asset` entity.
- Added `get_assets_by_symbol` query to get all registered assets with the same symbol.
- Added `get_transfer_rules` query to get transfer strategy rules configuration.


### Fixed 🔧
- Ensure that number of required signatures in multisig auth descriptor is greater than 0.
- Ensure that new main auth descriptors has all mandatory flags when calling `update_main_auth_descriptor`.

## [0.7.0r] - 2024-04-23

### Breaking 💔

- added deadline field to init_transfer. The crosschain transfer will fail if applied after this timestamp. It can only be reverted.
- `latest_time` is now in `utils` instead of `accounts`
- Rename `_register_account()` function to `register_account()`
- Requires Rell 0.13.10
- Changed entity `ft4.crosschain.applied_transfers`
- Changed entity `ft4.account_creation_transfer`
- Add field `transaction` to entity `applied_transfers`
- Removed operation `ft4.register_account_evm_signatures` and use `ft4.evm_signatures` instead
- Remove `ft4.delete_all_auth_descriptors_exclude` operation (replaced with `ft4.delete_all_auth_descriptors_except_main`).
- Remove `is_strict` argument to `authenticate()` function. Now `auth_handlers` will always resolve to the handler with the most specific mount scope if no operation auth handler is found.
- Rename `add_auth_descriptor_to_account` function to `add_auth_descriptor`
- Remove signature verification from `create_account_with_auth`. Signatures have to be checked separately with `verify_signers`.
- Rename `_add_signer` to `add_signers`
- `create_account_with_auth` creates account with id that is equal to hash of signers, instead of id of auth descriptor, if `account_id` argument is not set
- Rename `ft4.get_auth_descriptor_nonce` to `ft4.get_auth_descriptor_counter`.
- All module args, of FT4 submodules, in yml config have additional `core` component in module path, e.g. for `accounts` module, module args have to be defined under `lib.ft4.core.accounts` instead of `lib.ft4.accounts`.
- Removed `ft4_basic` and `ft4_basic_dev` modules.

### Changed 🪙
- Change internal structure of FT4 submodules, so that external modules get imported together with core modules, e.g. importing `lib.ft4.accounts` also imports corresponding operations and queries. However it's still possible to import `accounts` entities and functions without operations and queries, by importing `lib.ft4.core.accounts`.

### Added ✅

- Possibility to revert uncompleted crosschain transfers after deadline has passed.
- Possibility to recall unclaimed register account transfers after timeout has passed.
- Added `ft4.delete_all_auth_descriptors_except_main` operation that deletes all auth descriptors except main.
- Added `auth_flags` config to set mandatory and default auth flags.
- Updated `ft4.get_register_account_message` to add register account operation parameters to auth message
- Added `ft4.get_enabled_registration_strategies` query
- New functions in `ft4.test.utils`
- Added "lock" accounts support.

## [0.6.0r] - 2024-03-22

### Breaking 💔
- rename `account` to `sender` in `pending_transfer` entity

### Added ✅

- Operation `delete_auth_descriptors_for_signer` to delete all auth descriptors for a specific signer from an account
  (corresponding to query `get_account_auth_descriptors_by_signer`).

- `type` attribute in asset entity
- `get_assets_by_type` query
- `register_asset_with_type` admin operation

- Include `is_crosschain` flag in response from queries `get_transfer_history`, `get_transfer_history_from_height` 
  and `get_transfer_history_entry`.
- Include `blockchain_rid` in response from queries `get_transfer_details` and `get_transfer_details_by_asset`.

- Pending transfers when account is registered with direct strategies are completed.

- Include auth descriptor config (`max_rules` and `max_number_per_account`) in `get_config` query.

- 1 day expiration in default login config.
- Added `get_last_pending_transfer_for_account` query that returns last pending cross-chain transfer that matches provided parameters (sender, target chain, recipient, asset, amount)
- Added `has_pending_create_account_transfer_for_strategy` query that checks whether "create on transfer" account registration is initiated for provided strategy

## [0.5.0r] - 2024-02-29

### Breaking 💔

- Change mount name of `lib.ft4.accounts` module from `ft` to `ft4`, affecting these entities:
    - account
    - account_auth_descriptor
    - auth_descriptor_signer
    - rl_state

### Changed 🪙

- Return created account from _register_account() function

### Added ✅
 
- Extension functions for crosschain transfers: 
    - before_init_transfer
    - after_init_transfer
    - before_apply_transfer
    - after_apply_transfer

- `register_crosschain_asset` function

- account creation strategies
    - create on transfer
        - subscription
    - configurable fee account

## [0.4.0r] - 2024-02-15

### Changed 🪙
 
- `create_account_with_auth` now requires the `auth_descriptor` to have `A` flag. You can no longer create account with no `A` flag auth descriptor by default.
- `get_auth_descriptor_nonce` now returns null if the auth descriptor is not found instead of rejecting.
- `page_size` parameter in paginated queries are now optional and the default value can be configured with the `query_max_page_size` field under `lib.ft4` section.
- updated `transfer` function to enabled support for account creation on transfers
- updated how account id is calculated

### Added ✅
- framework for account creation
- account creation strategies
    - create on transfer
        - open
        - fee
    - open

- Add `get_first_allowed_auth_descriptor_by_signers` query
- Added support for rules in login config.

### Bugfixes 🐛
- Crosschain transfer related operations now validates that transaction is anchored on SAC before continuing

### Breaking 💔

- Change `asset_data` to `asset` in queries `get_transfer_history`, `get_transfer_history_from_height` and `get_transfer_history_entry`.

## [0.3.1r] - 2024-01-19

### Changed

- Validate `register_crosschain_asset parameters`
- Added `op_index` to the `get_transfer_history` response

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
