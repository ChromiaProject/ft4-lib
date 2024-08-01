    import {gtx} from "postchain-client"

    // const nodeUrl = "https://chromia-mainnet.w3coins.io:7740";
    // const clusterAnchoringBrid = "2A09134C0C30CE906E6DB5CC82B551AB7A9B1EEA8168A87F14DD4FEFE02CF74D";
    // const dappBrid = "26A19C5A0762ED363A5824657C1DCE364548EDD8AB0BDA1E22D5B69A169E2FD3";
    const nodeUrl = "http://docker:7740";
    // const nodeUrl = "http://thedockerhost:7740";
    const clusterAnchoringBrid = "9302b8dcc616d989b9390b1752b6a94ebd8a18c8a615c094e9068b4da765d5c1";
    // const dappBrid = "BDC5C54EB3D17BCFD5DF6CE08EE3C51C270A5DE5608B306250FE792953DA3465";
    const dappBrid = "a115380c08ea554b3e39afacee4c6a7e6d4d6d26974493a4ad102a48f0584951";

    const response = await fetch(`${nodeUrl}/blocks/${clusterAnchoringBrid}?limit=30&txs=true`);
    const json = await response.json();

    const txs = json.reduce((allTransactions, block) => [...allTransactions, ...block.transactions], []);

    let anchorBlockHeaderOps = [];

    for (const tx of txs) {
        const decodedTx = gtx.deserialize(Buffer.from(tx.data, "hex"));
        const ops = decodedTx.operations;
        anchorBlockHeaderOps = [...anchorBlockHeaderOps, ...ops.filter((op) => op.opName === "__anchor_block_header")];
    }

    if (!anchorBlockHeaderOps.length) {
        throw new Error("Didn't find __anchor_block_header operation in last block");
    }

    console.log("------------- Anchored chains:");
    anchorBlockHeaderOps.forEach(({ args }) => {
        const headerInfo = args[1];

        console.log(`Blockchain ${headerInfo[0].toString("hex")}, block ${headerInfo[1].toString("hex")}`)
    });

    const _lastAnchoredBlock = anchorBlockHeaderOps.find(({ args }) => {
        const headerInfo = args[1];
        return headerInfo[0].equals(Buffer.from(dappBrid, "hex"));
    });

    if (!_lastAnchoredBlock) {
        throw new Error(`Cannot find anchoring transaction for chain `)
    }

    const lastAnchoredBlock = _lastAnchoredBlock.args[1][1].toString("hex");
    console.log(`last anchored block: ${lastAnchoredBlock}`)

    const latestBlock = await fetch(`${nodeUrl}/blocks/${dappBrid}?limit=1&txs=true`)
    console.log(`Latest block height ${(await latestBlock.json())[0].height}`);
    
    const response2 = await fetch(`${nodeUrl}/blocks/${dappBrid}/${lastAnchoredBlock}?txs=true`);
    const dappBlock = await response2.json();
    console.log(`dapp block reposnse: ${dappBlock}`) 
    console.log(`Latest anchored block height ${dappBlock.height}`);


    const allBlocksResponse = await fetch(`${nodeUrl}/blocks/${dappBrid}?limit=20&txs=true`);
    const blocks = await allBlocksResponse.json();
    blocks.forEach(({ rid }) => console.log(rid));