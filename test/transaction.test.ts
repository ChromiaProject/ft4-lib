import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import TestUser from "./util/test-user";
import BlockchainUtil from "./util/blockchain-util";
import {nop} from "../client/lib/ft3";

let blockchain: Blockchain = null;

describe("Blockchain", () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain()
    });

    it('should successfully get the transaction ID', async () => {
        const user = TestUser.singleSig();

        const tx = blockchain.transactionBuilder()
            .add(nop())
            .build(user.authDescriptor.signers)

        expect(tx.getTxRID()).not.toBeNull()
    });
});
