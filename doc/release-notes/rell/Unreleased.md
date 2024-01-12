## [Unreleased]

- Added query `get_all_auth_handlers` to get all auth handlers specified by the dApp
- Added query `get_allowed_auth_descriptors` to let the blockchain select auth descriptors from a set that can be used to authenticate an operation
- Added possibility to create overridable auth handlers
- Added `resolver` field to `AuthHandler` which can be used to add custom auth logic when evaluating an auth descriptor