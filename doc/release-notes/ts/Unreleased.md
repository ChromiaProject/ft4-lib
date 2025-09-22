## [Unreleased] - 2025-xx-xx

### Breaking 💔

### Changed 🪙

### Added ✅
- ts support for the new `ras_import` strategy - the exported function `importStrategy` and a respective options type `ImportStrategyOptions`. The import can now be done while forcing a signature or without forcing a signature - in case another operation is used to verify the account on the origin chain (e.g. transfer op). 

### Fixed 🔧
- all hardcoded instances of the merklehash version have been removed (except where it makes no difference, e.g. the nop operation). The clients will always try to fetch the version implicitly from the features endpoint. 

### Removed 🗑️