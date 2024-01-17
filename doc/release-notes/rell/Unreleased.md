### Changed

- Added query `get_all_auth_handlers` to get all auth handlers specified by the dApp
- Added query `get_first_allowed_auth_descriptor` to let the blockchain select auth descriptors from a set that can be used to authenticate an operation
- Added possibility to create overridable auth handlers
- Added `resolver` field to `AuthHandler` which can be used to add custom auth logic when evaluating an auth descriptor
- Updated transaction prioritization to work with Postchain 3.14.17 and later.
- Fix `init_transfer` auth message issue that didn't allow `init_transfer` operation to be used with evm auth
- `create_account_with_auth` now requires the `auth_descriptor` to have `A` flag. You can no longer create account with no `A` flag auth descriptor by default.