# FT4 Demo App

Welcome to the FT4 Demo App! This basic demonstration of the FT4 platform aims
to provide an intuitive and practical guide to understanding its core features.
For the best experience, we recommend using Google Chrome with the Metamask
extension installed.

<div align="center">
    <img src="assets/screenshot.png" width="735" height="513" alt="Screenshot of the Demo App">
</div>

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Chromia CLI](https://docs.chromia.com/getting-started/dev-setup/backend/cli-installation)
- [Node.js](https://nodejs.org/en/download/)
- [Google Chrome](https://www.google.com/chrome/) with
  [Metamask](https://metamask.io/download.html) extension installed

## Setup Instructions

### Postgres Installation

If the node is not already configured with Postgres, install it using the
following Docker command. This can be run on a new terminal window, on any
folder.

```bash
docker run --name ft4_demo -e POSTGRES_INITDB_ARGS="--lc-collate=C.UTF-8 \
    --lc-ctype=C.UTF-8 --encoding=UTF-8" -e POSTGRES_USER=postchain \
    --tmpfs=/pgtmpfs:size=1000m -e PGDATA=/pgtmpfs -e POSTGRES_DB=postchain \
    -e POSTGRES_PASSWORD=postchain -p 5432:5432 -d postgres > /dev/null;
```

### Install Rell Dependencies

First of all, let's get into the rell folder of this demo app:

```sh
cd path-to-demo-app/rell
```

The Rell code relies on specific dependencies. To install these, use the
following command:

```bash
chr install
```

### Generate Keypair

Several commands in this guide use the `--secret .admin_keypair` argument. For
ease of use, this demo comes with a default keypair. This keypair is unsafe, and
should NEVER be used in production dapps, although it is ok to use it to run the
demo.

If you want to modify this demo to then create a dapp of your own, you need to
generate a new `.admin_keypair` keypair file. You can do so with the following
command:

```bash
chr keygen --save .admin_keypair
```

After generating the new keypair, remember to update the `admin_pubkey` field in
`rell/chromia.yml` with your new public key.

### Start Node

As the node serves as the backend for the React frontend, it should be launched
before the frontend. To start the node, use the following command:

```bash
chr node start --wipe
```

### Set Up Client

On a new terminal window, navigate to the client directory and install the
necessary dependencies using the following commands:

```bash
cd path-to-demo-app/client
npm install
```

### Start the client

To start the client, you'll need to run the following command inside the
`client` folder:

```bash
npm start
```

The client won't be able to do much before you setup the blockchain, however.
Read the [User guide chapter](#user-guide) and start the front-end once
instructed to do so.

## User Guide

With the prerequisites met and the FT4 demo app setup complete, you are ready to
begin exploring the platform. The following sections will guide you through key
features and functionalities. All the chr commands refer to the `chromia.yml`
file, so they should be run on a new terminal window inside the `rell/` folder:

```sh
cd path-to-demo-app/rell
```

We encourage you to have fun with this demo app! This is an example of a
workflow you might want to follow for the first time:

1. [Register an account](#register-an-account) based on your EVM address
2. [Retrieve all account IDs](#retrieving-ids) and keep the only ID returned.
   This will be your FT4 account ID, which we'll refer to as the _sender_.
3. [Register an account](#register-an-account) based on another EVM address. You
   can either use a second Metamask account, or simply take your EVM address and
   change one digit.
4. [Retrieve all account IDs](#retrieving-ids) again. There will be two entries
   now: the _sender_ account ID and a new ID, which will be the _recipient_.
5. [Register an asset](#register-an-asset), with the name, symbol and digits
   specified. You can register different assets later, while experimenting, but
   registering just one now will make the next steps easier.
6. [Retrieve all asset IDs](#retrieving-ids) and keep the only ID returned. This
   is the asset we'll use later.
7. [Give the sender some tokens](#mint-to-account).
8. Optionally, [verify the account balances](#verify-the-account-balance) of
   both accounts.
9. [Start the client](#start-the-client) and navigate to the corresponding web
   page.
10. Login with the EVM address corresponding to the _sender_ account.
11. Input the _recipient_ address in the box.
12. Send some tokens to the _recipient_ By clicking on the transfer button.
13. [Verify the account balances](#verify-the-account-balance) to check that the
    transaction has happened!

### Register an Account

Use the following command to register an account. Replace
`<Your_EVM_Address_Without_0x_Prefix>` with your EVM (Ethereum Virtual Machine)
address, without the `0x` prefix:

```bash
chr tx ft4.admin.register_account \
    '[0, [["A","T"], x"<Your_EVM_Address_Without_0x_Prefix>"], null]' --await --secret .admin_keypair
```

### Register an Asset

To register an asset, use the following command:

```bash
chr tx ft4.admin.register_asset TestAsset TST 6 http://url-to-asset-icon  --await --secret .admin_keypair
```

This will register an asset called `TestAsset`, with symbol `TST`, and 6
decimals. The URL is supposed to be an icon for the asset, feel free to pick a
real URL!

While you're allowed to register an asset with any name, any symbol, and any
amount of decimals, this doc will assume that this is the asset you registered.

If you need the ID of the new asset, check the
[Retrieving IDs section](#retrieving-ids).

### Retrieving IDs

After creating accounts and assets, you need to retrieve the IDs of the newly
created entities. To do so from the command line, you can call these queries:

- ```bash
  chr query "get_all_accounts"
  ```
  This will retrieve all the account IDs;
- ```bash
  chr query "ft4.get_all_assets page_size=10 page_cursor=null | grep '"id": x"[A-F0-9]*"'"
  ```
  This will retrieve all assets and output all data about them, while
  highlighting the ID.

If you want to better understand what these commands are doing, check out the
[Understanding the ID queries](#understanding-the-id-queries) section.

### Mint to Account

The client will try to send 1 token when the transfer button is clicked. To do
so, the sender account must have a sufficient balance.

The blockchain does not understand decimal amounts, as would be the case with
EVM tokens. Instead, amounts should be multiplied by 10^decimals, or 1 000 000
in the case of 6 decimals.

Mint an asset to an account using the following command. Replace `<account_id>`,
`<asset_id>`, and `<amount>` with the relevant values:

```bash
chr tx ft4.admin.mint \
    'x"<account_id>"' \
    'x"<asset_id>"' \
    <amount>L --await --secret .admin_keypair
```

For example, if you want an account with ID
`836A156187D886A6EC99C6EC4E73B01D51D95FE72E3B35DEB50D608DFBD9B4E7` to receive 1
token with ID
`38FBBB3186245204C522BBF6D113C7A7B44E67484F71EC25471991E6216AAF3A`, given that
the token has 6 decimals, you would call:

```bash
chr tx ft4.admin.mint 'x"836A156187D886A6EC99C6EC4E73B01D51D95FE72E3B35DEB50D608DFBD9B4E7"' 'x"38FBBB3186245204C522BBF6D113C7A7B44E67484F71EC25471991E6216AAF3A"' 1000000L --await --secret .admin_keypair
```

If you need the asset or account ID, check the
[Retrieving IDs section](#retrieving-ids). If you want to check whether the mint
was successful, check the
[Verify the account balance section](#verify-the-account-balance).

### Verify the account balance

To verify how many tokens an account has, you can use this query:

```bash
chr query ft4.get_asset_balance 'account_id=x"<account_id>" 'asset_id=x"<asset_id>"'
```

## Advanced

### Understanding the ID queries

If you end up registering more assets or accounts, you might want to use these
queries to understand what is happening on the blockchain.

- `get_all_accounts`: retrieves a list of all accounts, only available in this
  specific app;
- `ft4.get_all_assets`: retrieves a list of all assets;
- `ft4.get_accounts_by_signer`: requires a signer ID, returns all accounts
  related to that signer.

The signer ID is the pubkey of one of the keypairs that are allowed to access
it. If it was created using an EVM address, it will be that same address without
the `0x`.

The last two queries are paginated, which means they accept two additional
parameters:

- `page_size`: how many entries should be returned;
- `page_cursor`: useful to access later pages, set to `null` to retrieve the
  first page.

Pagination is used to retrieve small parts, called pages, from a long list of
data. If there were thousands of entries, retrieving all of them at once would
waste a lot of procesing power, and it would risk making the node temporarily
unavailable for other users. For this reason, in production dapps queries like
`get_all_accounts` should not be available to the users, and only paginated ones
should be included.

You normally don't have to worry about how pagination works, as the front end
libraries will take care of it, so here you can simply use this pattern:

```sh
chr query "query_name" query_params=value page_size=10 page_cursor=null
```

This will retrieve 10 entries, and it can be modified to retrieve more by
changing the value of `page_size`.

#### Examples

The simplest way to retrieve account IDs is to use the `get_all_accounts` query:

```bash
chr query "get_all_accounts"
```

If you registered multiple accounts, that will return all of their IDs, without
informing you of which one corresponds to which EVM address.

If you want more control, retrieving an account ID can be done with the
following command. Again, remember to replace
`<Your_EVM_Address_Without_0x_Prefix>` with your EVM address, without the `0x`
prefix:

```bash
chr query "ft4.get_accounts_by_signer" 'id=x"<Your_EVM_Address_Without_0x_Prefix>"' page_size=10 page_cursor=null
```

If you'd like to make the ID more visible in the response, use `grep`:

```bash
chr query "ft4.get_accounts_by_signer" 'id=x"<Your_EVM_Address_Without_0x_Prefix>"' page_size=10 page_cursor=null | grep '"id": x"[A-F0-9]*"'
```

Which will return something like:

<pre>
["data": [[<b style="color:red">"id": x"34ACD269088F25237951BFC821507D140A40A7D985D1EAB87B038E3EBAA8D382"</b>, "type": "FT4_USER"]], "next_cursor": null]
</pre>

Querying all assets will be quite similar to querying an account:

```bash
chr query "ft4.get_all_assets" page_size=10 page_cursor=null | grep '"id": x"[A-F0-9]*"'
```

The response will look like this:

<pre>
["data": [["blockchain_rid": x"FFC5A56C310187F40351EC3A80F6F1D0F279BE563CF7798CFFCED37E15158EE8", "decimals": 6, "icon_url": "http://url-to-asset-icon", <b style="color:red">"id": x"D2B2BA79201822182A64FB85BC1D19FB7C33005913C62899E8B31A5D775FA24F"</b>, "name": "TestAsset", "supply": 0L, "symbol": "TST", "type": "ft4"]], "next_cursor": null]
</pre>

Enjoy exploring the FT4 Demo App!
