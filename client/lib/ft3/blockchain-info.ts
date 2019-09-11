import ConnectionClient from "./connection-client";

export default class BlockchainInfo {
    name: string;
    website: string;
    description: string;

    constructor(name: string, website: string, description: string) {
        this.name = name;
        this.website = website;
        this.description = description;
    }

    static async getInfo(connection: ConnectionClient)  {
        const info = await connection.query('ft3.get_blockchain_info', {});
        return new BlockchainInfo(info.name, info.website, info.description);
    }
}
