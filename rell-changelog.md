# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Implemented crosschain functions to allow for asset transfer across chains
- New admin module `admin.crosschain` which allows you to register crosschain assets
- Added the ability to specify tests for Rell through `--tests` or `-t` option in `scripts/relltest.sh`.

### Changed
- Assets are now always returned with all properties from postchain. The three separate properties `asset`, `asset_id` and `decimals` will be removed in favor of the more complete `asset_data`

## [0.1.0r] - 2023-07-12

Initial release
