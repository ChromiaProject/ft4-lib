## [Unreleased]

### Added
- Default values for `lib.ft4.accounts` module_args to simplify `chromia.yml` configuration.
- Added configuration parameter `max_auth_descriptor_rules` for `lib.ft4.accounts` module_args, with default value 8.
- Added an option to customize the rate limiter for some accounts.
- Support for transaction priority.

### Changed
- Updated signature for `evm_auth_operation_for` to accept a `rell.test.op`.
- `before_authenticate` function is now extendable for adding custom pre-authentication logic.
- `after_authenticate` function is now extendable for executing logic after authentication completes.
- Allow account creation with `create_account_with_auth` without op_context.

### Breaking Changes
- **Paginated Queries**: Queries `get_accounts_by_participant_id` and `get_account_auth_descriptors_by_participant_id` are now paginated. This change impacts how these queries are consumed and might require adjustments in the calling code.
- **Paginated Queries**: Queries `_get_accounts_by_auth_descriptor_id`, `_get_asset_balances` and `_get_all_assets` which were not paginated has been removed, please use their paginated counterparts with the same name, excluding the `_`. Furthermore, `get_asset_by_name` were also deleted for the same reason, replced by the paginated query `get_assets_by_name`.
- **Rules Structure**: Revised internal structure of the rules. Existing auth descriptors using rules will no longer function and will cause a runtime error when invoked.
- **Address Functions Removed**: Deprecated `evm_address_from_pubkey` and `evm_address_from_privkey`. Use corresponding functions `crypto.eth_pubkey_to_address` and `crypto.eth_privkey_to_address` from Rell standard library for Ethereum address generation.
- **create_account_with_auth** function return `account` instead of `byte_array`.
- **add_auth_descriptor_to_account** function return `account_auth_descriptor` instead of `byte_array`.
- **Rate limit config** New format for rate limit configuration.