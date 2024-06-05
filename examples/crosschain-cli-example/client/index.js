/* eslint @typescript-eslint/no-var-requires: 0 */
const {
    createAmount,
    createInMemoryFtKeyStore,
    registerAccount,
    registrationStrategy,
    createSingleSigAuthDescriptorRegistration,
    op
} = require('@chromia/ft4');

const {
    createClient,
    encryption
} = require("postchain-client");

async function main() {
    // Prepare the required context
    const sourceChainId = "B68E7BB2ACD7EE0D88024F66CF5EB371F19134D8D527CCF7BF4FDF419D678D92";    
    const targetChainId = "93700AB60B3125959C2266889645E30B0813FD682914C4429633FE591088F685";

    // Initialize Chromia client on multichain00
    console.log("Initialize client");
    const client0 = await createClient({
        directoryNodeUrlPool: "http://localhost:7740",
        blockchainRid: sourceChainId,
    });

    const client1 = await createClient({
        directoryNodeUrlPool: "http://localhost:7740",
        blockchainRid: targetChainId,
    });
    
    console.log("Initialize chains");

    try {
        await client1.sendTransaction({
            operations: [
                {
                    name: "init",
                    args: [Buffer.from(sourceChainId, "hex")]
                }
            ],
            signers: []
        })
    } catch {
        console.log("Chain already initialized");
    }


    console.log("Registering accounts");

    const store0 = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const { session: session0 } = await registerAccount(
        client0,
        store0,
        registrationStrategy.open(
            createSingleSigAuthDescriptorRegistration(["A", "T"], store0.id)
        ),
        op("custom_register_account")
    );

    const store1 = createInMemoryFtKeyStore(encryption.makeKeyPair());
    const { session: session1 } = await registerAccount(
        client1,
        store1,
        registrationStrategy.open(
            createSingleSigAuthDescriptorRegistration(["A", "T"], store1.id)
        )
    );

    const assetId = (await session0.getAllAssets()).data[0].id;
    console.log("\nAsset ID: ", assetId.toString("hex"));

    console.log(
        "\nUser 1 balance before transfer: ",
        (await session0.account.getBalanceByAssetId(assetId))?.amount.toString() || "none"
    );

    console.log(
        "User 2 balance before transfer: ",
        (await session1.account.getBalanceByAssetId(assetId))?.amount.toString() || "none"
    );

    console.log("\n\n===================\n\n");

    console.log("Prepare transfer");
    const transfer0 = session0.account.crosschainTransfer(
        session1.blockchainRid,
        session1.account.id,
        assetId,
        createAmount(1, 6),
    )

    transfer0.on("init", () => {
        console.log("\tTransfer initialized.");
    });

    transfer0.on("hop", (brid) => {
        console.log(`\tHopped to chain: ${brid.toString('hex')}`);
    });

    console.log("Start transfer");
    await transfer0.then(() => {
        console.log("\tTransfer completed.");
    }).catch((error) => {
        console.error(`\tTransfer failed: ${error.message}`);
    });

    console.log("\nDone");

    console.log("\n\n===================\n\n");

    console.log(
        "User 1 balance after transfer: ",
        (await session0.account.getBalanceByAssetId(assetId))?.amount.toString() || "none"
    );

    console.log(
        "User 2 balance after transfer: ",
        (await session1.account.getBalanceByAssetId(assetId))?.amount.toString() || "none"
    );

    console.log("\nTransferring half of assets back to sender");

    const transfer1 = session1.account.crosschainTransfer(
        session0.blockchainRid,
        session0.account.id,
        assetId,
        createAmount(0.5, 6),
    );

    await transfer1.then(() => {
        console.log("\tSecond transfer completed.");
    }).catch((error) => {
        console.error(`\tSecond transfer failed: ${error.message}`);
    });

    console.log("\nDone");

    console.log("\n\n===================\n\n");

    console.log(
        "User 1 balance after second transfer: ",
        (await session0.account.getBalanceByAssetId(assetId))?.amount.toString() || "none"
    );

    console.log(
        "User 2 balance after second transfer: ",
        (await session1.account.getBalanceByAssetId(assetId))?.amount.toString() || "none"
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });
    