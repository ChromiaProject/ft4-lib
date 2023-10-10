# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [0.1.4r] - 2023-09-29

### Changed
- importing a module will now always import the corresponding external module too

## [0.1.3r] -- 2023-09-19

### Added
- Added more test utility functions.
- Added `evm_address_from_pubkey`

## [0.1.2r] -- 2023-09-18

### Changed
- Version module is now included no matter what modules you use from the library.

### Added
- Added more test utility functions.

## [0.1.1r] -- 2023-09-12

### Added
- Implemented crosschain functions to allow for asset transfer across chains
- New admin module `admin.crosschain` which allows you to register crosschain assets

### Changed
- Assets are now always returned with all properties from postchain. The three separate properties `asset`, `asset_id` and `decimals` will be removed in favor of the more complete `asset_data`
- Version is now imported in every non-external module, so every dapp using ft4 will have version information

### Added
- Added `test` module with test utility functions.

## [0.1.0r] - 2023-07-12

Initial release
