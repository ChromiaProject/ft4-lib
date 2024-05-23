Basic project with no framework to showcase a possible integration with
WalletConnect.

To run the demo, run the following commands. All of them must be run in the base
directory, which is `ft3-lib`.

- start a postgres container:

```sh
docker run --name postchain -e POSTGRES_INITDB_ ARGS="--lc-collate=C.UTF-8 --lc-ctype=C.UTF-8 --encoding=UTF-8" -e POSTGRES_PASSWORD=postchain -e POSTGRES_USER=postchain -p 5432:5432 postgres
```

- run the chromia blockchain locally:

```sh
chr node start
```

- start the demo frontend:

```sh
cd examples/walletconnect-integration-example

npm run start
```
