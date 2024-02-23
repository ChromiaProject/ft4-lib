## [Unreleased] - 2024-xx-xx

### Breaking 💔

- Moved `logout` function from `LoginManager` to object returned from `LoginManager.login()` and `registerAccount()`.
- Moved `loginKeyStore` parameter from `KeyStoreInteractor.getLoginManager()` to `LoginManager.login(LoginOptions)`.

### Added ✅

- account registration strategies
  - create on transfer
    - subscription
