import TestConnection from "./util/test-connection";
import Blockchain from "../client/lib/ft3/blockchain";

const connection = new TestConnection();

describe("Blockchain", () => {
    it("should provide info", async () => {
        const info = await Blockchain.getInfo(connection);

        expect(info).toEqual(new Blockchain('test', 'test_website', 'test_description'))
    });
});