import {
    createAmount,
    createInMemoryFtKeyStore,
    registerAccount,
    registrationStrategy,
    createSingleSigAuthDescriptorRegistration,
    op
} from '@chromia/ft4';

import {
    createClient,
    encryption,
    formatter
} from "postchain-client";

async function main() {
    // Blockchain RIDs
    const sourceChainId = "87C9CC394D851114C0C90DA2F97EC4CAB7D86A73D2480EBC76DF98340FD8CA18";    
    const targetChainId = "230D3994D04D7D08FCC41054FAE8F4463895A6A1112FABAF52A9D7CE65EBC6C6";

    console.log("Initialize client ...");
    const sourceChainClient = await createClient({
        directoryNodeUrlPool: "http://localhost:7740",
        blockchainRid: sourceChainId,
    });

    const targetChainClient = await createClient({
        directoryNodeUrlPool: "http://localhost:7740",
        blockchainRid: targetChainId,
    });

    const keyStore = createInMemoryFtKeyStore(encryption.makeKeyPair());

    console.log("Registering account on the source chain using 'open' strategy ...");

    const { session: session0 } = await registerAccount(
        sourceChainClient,
        keyStore,
        registrationStrategy.open(
            createSingleSigAuthDescriptorRegistration(["A", "T"], keyStore.id)
        ),
        op("custom_register_account")
    );
    
    console.log(`Account <${formatter.toString(session0.account.id)}> registered on source chain!`)

    const assets = await session0.getAllAssets();
    const testAsset = assets.data[0];

    console.log(`Source chain account balance: ${(await session0.account.getBalanceByAssetId(testAsset.id))?.amount.toString()}`)
    
    console.log("Initializing target chain ...");

    try {
        await targetChainClient.sendTransaction({
            operations: [
                {
                    name: "init",
                    args: [testAsset.id, Buffer.from(sourceChainId, "hex")]
                }
            ],
            signers: []
        })
    } catch {
        console.log("Chain already initialized");
    }

    console.log("Executing crosschain transfer ...");

    await session0.account.crosschainTransfer(
        targetChainId, 
        session0.account.id, // recipient id is same as sender id
        testAsset.id,
        createAmount(10, testAsset.decimals)
    );

    console.log("Registering account on the target chain using 'transfer open' strategy ...");

    const { session: session1 } = await registerAccount(
        targetChainClient,
        keyStore,
        registrationStrategy.transferOpen(
            createSingleSigAuthDescriptorRegistration(["A", "T"], keyStore.id)
        )
    );

    console.log(`Account <${formatter.toString(session1.account.id)}> registered on source chain!`)

    console.log(`Source chain account balance: ${(await session0.account.getBalanceByAssetId(testAsset.id))?.amount.toString()}`)
    console.log(`Target chain account balance: ${(await session1.account.getBalanceByAssetId(testAsset.id))?.amount.toString()}`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });
    