## [Unreleased] - 2024-xx-xx

### Changed

- `authenticator.getKeyHandlerForOperation` will not return auth descriptors whose rules don't allow them to be used.
- `AuthDataService.getAllowedAuthDescriptors` now accepts `Buffer | string` instead of `Buffer` only

### Added

- `AuthDescriptorValidator` with `hasExpired` and `isActive` methods to check whether the auth descriptor is expired or active. An inactive auth descriptor is one that will be valid in the future, an expired one was valid in the past.
- `createAuthDescriptorValidator(authDataService, useCache)` to use the above mentioned validator. If it uses cache, it will cache `op_count` of each auth descriptor and `block_height` as soon as it needs to query them.
- Do not allow TransactionBuilder.build() or TransactionBuilder.buildUnsigned() if there are OnAnchoredHandlers
