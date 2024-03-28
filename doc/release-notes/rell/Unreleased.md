## [Unreleased] - 2024-xx-xx

### Breaking 💔

- added deadline field to init_transfer. The crosschain transfer will fail if applied after this timestamp. It can only be reverted.
- `latest_time` is now in `utils` instead of `accounts`
- Rename `_register_account()` function to `register_account()`
- Requires Rell 0.13.9

### Changed 🪙

### Added ✅

### Fixed 🔧