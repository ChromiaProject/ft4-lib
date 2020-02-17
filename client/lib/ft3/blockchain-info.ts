import ConnectionClient from "./connection-client";

export default class BlockchainInfo {
    name: string;
    website: string;
    description: string;
    rateLimitActive: boolean
    rateLimitMaxPoints: number;
    rateLimitRecoveryTime: number;
    rateLimitPointsAtAccountCreation: number;

    constructor(name: string, website: string, description: string, rateLimitActive: boolean, rateLimitMaxPoints: number, rateLimitRecoveryTime: number, rateLimitPointsAtAccountCreation: number) {
        this.name = name;
        this.website = website;
        this.description = description;
        this.rateLimitActive = rateLimitActive;
        this.rateLimitMaxPoints = rateLimitMaxPoints;
        this.rateLimitRecoveryTime = rateLimitRecoveryTime;
        this.rateLimitPointsAtAccountCreation = rateLimitPointsAtAccountCreation;
    }

    static async getInfo(connection: ConnectionClient)  {;
        try {
            const info = await connection.query('ft3.get_blockchain_info', {});
            return new BlockchainInfo(info.name, info.website, info.description, info.rate_limit_active == 1, info.rate_limit_max_points, info.rate_limit_recovery_time, info.rate_limit_points_at_account_creation);
        } catch {
            return new BlockchainInfo(connection.chainId, null, null, null, null, null, null);
        }
    }
}
