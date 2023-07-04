# Rell

## Start node

```
chr node start
```

## Register account

Open metamask and copy your wallet address. In following command replace evm address placeholder with you address. Make sure to remove `0x` prefix.

```
chr tx ft4.admin.register_account \                                                              
    '[0, [["A","T"], x"<evm_address>"], null]' \
    --await --secret .secret
```

## Register asset

```
chr tx ft4.admin.register_asset TestAsset TST 6 http://url-to-asset-icon  --await --secret .secret
```

## Get all registered assets

```
chr query ft3.get_all_assets
```

## Get all accounts

```
chr query get_all_accounts
```
Note: this is a custom query. It's not provided by ft4

## Mint to account

```
chr tx ft4.admin.mint 
    <account_id> \
    <asset_id> \
    <amount> --await --secret .secret
```

Example:
```
chr tx ft4.admin.mint 
    "79C71AF3C9C951BED380F8ADAB2E407C15CC4A9EB942AA222D870136C45801CE" \ 
    "3EAFB8C0DD729318D82F1FC6F15E36F7AE75BE30D3B45ADE9343B805AA102C1B" \ 
    100000000L \
    --await --secret .secret
```

# Client

## Install dependencies
```
npm install
```

## Start client
```
npm start
```
