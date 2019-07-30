import ConnectionClient from "../../client/lib/ft3/connection-client";

class TestConnection extends ConnectionClient {
    constructor() {
        super('http://localhost:7740/', process.env.CHAIN_ID);
    }
}

export default TestConnection;