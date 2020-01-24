import ConnectionClient from "./connection-client";

export default class BlockchainInfo {
    name: string;
    website: string;
    description: string;
    requestMaxCount: number;
    requestRecoveryTime: number;

    constructor(name: string, website: string, description: string, requestMaxCount: number, recoveryTime: number) {
        this.name = name;
        this.website = website;
        this.description = description;
        this.requestMaxCount = requestMaxCount;
        this.requestRecoveryTime = recoveryTime;
    }

    static async getInfo(connection: ConnectionClient)  {;
        try {
            const info = await connection.query('ft3.get_blockchain_info', {});
            return new BlockchainInfo(info.name, info.website, info.description, info.request_max_count, info.request_recovery_time);
        } catch {
            return new BlockchainInfo(connection.chainId, null, null, null, null);
        }
    }
}
