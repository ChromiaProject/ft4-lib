## [Unreleased] - 2024-xx-xx

### Breaking 💔

### Changed 🪙
- Allow multiple smaller transfers to a non-existing account for the same asset type. 

- The logic takes multiple senders for one recipient into consideration

### Added ✅
- Added a blacklist for operations that may not be used after an auth operation (`evm_auth` and `ft_auth`). Defined in the `chromia.yml` as `core.auth.auth_op_blacklisted_operations`, it works the same way as `evm_signatures_authorized_operations`, except the former is a list of operations that are not allowed, while the latter includes only allowed operations.
- Added RellDocs for everything
- Added new rell tests
### Fixed 🔧
