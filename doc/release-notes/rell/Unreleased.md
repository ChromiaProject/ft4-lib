## [Unreleased] - 2024-xx-xx

### Breaking 💔

### Changed 🪙
- Allow multiple smaller transfers to a non-existing account for the same asset type. 

- The logic takes multiple senders for one recipient into consideration
- Updated the response of the query `get_account_by_id` to also return type along with id

### Added ✅
- Added a blacklist for operations that may not be used after an auth operation (`evm_auth` and `ft_auth`). Defined in the `chromia.yml` as `core.auth.auth_op_blacklisted_operations`, it works the same way as `evm_signatures_authorized_operations`, except the former is a list of operations that are not allowed, while the latter includes only allowed operations.
- Added RellDocs for everything
- Added `get_api_version`. While version looks like "1.0.3", and it's difficult to parse, api version is an integer that is increased by one every time the API (queries and operations) changes. It will start at 1 for version 1.0.1.
- Added `get_block_height`, analogous to `latest_time`. The main difference is that the block height returned is the height of the *next* block to be produced, if in a query. This is also analogous to the difference between `op_context.last_block_time` and `op_context.block_height`, where the height refers to the current block and the time to the last block.
- Added the query `get_assets_filtered` that retrieves paginated assets filtered by asset ids, name, symbol and type
- Added the query `get_balances_filtered` that retrieves paginated balances filtered by account ids and asset ids 
- Added the query `get_transfer_history_entries_filtered` that retrieves paginated transfer history entries filtered by account ids, asset ids, transaction rids and op index
- Added the query `get_crosschain_transfer_history_entries_filtered` that retrieves paginated crosschain transfer history entries filtered by account ids, asset ids, transaction rids and op index
- The crosschain query `get_asset_origin_filtered` that retrieves paginated asset origins filtered by asset ids
- The crosschain query `get_applied_transfers_filtered` that retrieves paginated applied transfers filtered by init tx rids and init op index
- The crosschain query `get_canceled_transfers_filtered` that retrieves paginated canceled transfers filtered by init tx rids and init op index
- The crosschain query `get_unapplied_transfers_filtered` that retrieves paginated unapplied transfers filtered by init tx rids and init op index
- The crosschain query `get_recalled_transfers_filtered` that retrieves paginated recalled transfers filtered by init tx rids and init op index
- The crosschain query `get_pending_transfers_filtered` that retrieves paginated pending transfers filtered by transaction rids, op index and sender account id
- The crosschain query `get_reverted_transfers_filtered` that retrieves paginated reverted transfers filtered by init tx rids and init op index
- Added filterable paginated queries for all account entities - the filterable fields are the ones which are indexed in their respective entities: 
`get_accounts_filtered`, `get_account_auth_descriptors_filtered`, `get_main_auth_descriptors_filtered`, `get_auth_descriptor_signers_filtered`, `get_rl_states_filtered`, `get_account_creation_transfers_filtered`, `get_account_links_filtered`. All are mounted on 'ft4' directly.

### Fixed 🔧

- `authenticate()` and `authenticate_and_return_context()` will no longer delete the auth descriptor used to authenticate the operation, even if it expired during the authentication process.