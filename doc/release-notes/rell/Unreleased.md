## [Unreleased]
 
### Breaking
- The internal structure of the rules has been changed. So auth descriptors which used rules will cause a runtime error when trying to be used.
- Removed the functions evm_address_from_pubkey and evm_address_from_privkey, use crypto.eth_pubkey_to_address and crypto.eth_privkey_to_address in Rell standard library instead. 

### Changed
- BREAKING CHANGE: Make `get_accounts_by_participant_id` query paginated
- BREAKING CHANGE: Make `get_account_auth_descriptors_by_participant_id` query paginated
- updated signature for `evm_auth_operation_for` to take a `rell.test.op`
- added default values for `lib.ft4.accounts` module_args, so they don't have to be included in `chromia.yml`

### Added
- Added support for TTL in login config, defined in milliseconds.
