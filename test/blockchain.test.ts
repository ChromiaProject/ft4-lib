import TestConnection from "./util/test-connection";
import BlockchainInfo from "../client/lib/ft3/blockchain-info";
import Blockchain from "../client/lib/ft3/blockchain";

const connection = TestConnection.connection();

describe("Blockchain", () => {
    it("should provide info", async () => {
        const info = await BlockchainInfo.getInfo(connection);

        expect(info).toEqual(new BlockchainInfo('test', 'test_website', 'test_description'))
    });
});