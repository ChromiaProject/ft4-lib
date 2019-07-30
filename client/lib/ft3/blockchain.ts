import ConnectionClient from "./connection-client";

class Blockchain {
    name: string;
    website: string;
    description: string;

    constructor(name: string, website: string, description: string) {
        this.name = name;
        this.website = website;
        this.description = description;
    }

    static async getInfo(connection: ConnectionClient)  {
        const info = await connection.gtx.query('ft3.get_blockchain_info', {});
        return new Blockchain(info.name, info.website, info.description);
    }
}

export default Blockchain;