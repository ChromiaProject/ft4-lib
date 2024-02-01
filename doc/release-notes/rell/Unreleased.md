## [Unreleased] - 2024-xx-xx

### Changed
- `create_account_with_auth` now requires the `auth_descriptor` to have `A` flag. You can no longer create account with no `A` flag auth descriptor by default.
- `get_auth_descriptor_nonce` now returns null if the auth descriptor is not found instead of rejecting.
