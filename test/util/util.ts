import { util, gtv } from "postchain-client";
import { gtx } from "../../client/blockchain";

function generateNumber(max: number = 10000): number {
    return Math.round(Math.random()*max)
}

function generateAssetName(prefix: string = 'CHROMA'): string {
    return prefix + '_' + generateNumber();
}

function generateId() {
    return util.hash256(`${generateNumber()}`);
}

function blockchainAccountId(chainId: Buffer) {
    return gtv.gtvHash(['B', chainId]);
}

async function giveBalance(accountId: Buffer, assetId: Buffer, amount: number) {
    const tx = gtx.newTransaction([]);
    tx.addOperation('ft3.dev_give_balance', assetId.toString('hex'),  accountId.toString('hex'), amount);
    await tx.postAndWaitConfirmation();
}

export {
    generateAssetName,
    giveBalance,
    generateId,
    blockchainAccountId,
}