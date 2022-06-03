import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import TestUser from "./util/test-user";
import BlockchainUtil from "./util/blockchain-util";
import { gtv } from "postchain-client";
import { op } from "../client/lib/ft3";

let blockchain: Blockchain = null;

describe("Blockchain", () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain()
    });

    it('should successfully get the transaction ID', async () => {
        const tx = blockchain.transactionBuilder()
            .add(op('foo', 'bar'))
            .build([])

        const expectedTxRID = gtv.gtvHash([
            blockchain.id,
            [
                ['foo', [ 'bar' ]]
            ],
            []
        ]);

        expect(tx.getTxRID()).toEqual(expectedTxRID)
    });
});
