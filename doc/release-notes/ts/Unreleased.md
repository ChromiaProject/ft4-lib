## [Unreleased] - 2024-xx-xx

### Breaking 💔

- updated `postchain-client` version to 1.15
- Moved `logout` function from `LoginManager` to object returned from `LoginManager.login()` and `registerAccount()`.
- Moved `loginKeyStore` parameter from `KeyStoreInteractor.getLoginManager()` to `LoginManager.login(LoginOptions)`.

### Added ✅

- account registration strategies
  - create on transfer
    - subscription

- functions to directly create account with fee and subscription strategies

### Fixed 🔧
- uncaught exception triggered after creating evm keystore and when all accounts disconnected from wallet GUI
