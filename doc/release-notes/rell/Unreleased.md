## [Unreleased]
 
- BREAKING CHANGE: The internal structure of the rules has been changed. So auth descriptors which used rules will cause a runtime error when trying to be used.

### Changed
- updated signature for `evm_auth_operation_for` to take a `rell.test.op`
- added default values for `lib.ft4.accounts` module_args, so they don't have to be included in `chromia.yml`
