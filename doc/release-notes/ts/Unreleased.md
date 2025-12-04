## [Unreleased] - 2025-xx-xx

### Breaking 💔

### Changed 🪙

### Added ✅

- `transactionBuilder` now accepts `null` as the authenticator parameter,
  allowing building transactions for operations that don't require
  authentication (e.g., `nop` operations). When `null` is passed, it behaves the
  same as using `noopAuthenticator`.

### Fixed 🔧

### Removed 🗑️
