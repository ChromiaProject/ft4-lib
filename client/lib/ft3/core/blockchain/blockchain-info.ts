import ConnectionClient from "../connection-client";
import RateLimitInfo from "./rate-limit-info";

export default class BlockchainInfo {
  name: string;
  website: string;
  description: string;
  rateLimitInfo: RateLimitInfo;

  constructor(
    name: string,
    website: string,
    description: string,
    rateLimitInfo: RateLimitInfo
  ) {
    this.name = name;
    this.website = website;
    this.description = description;
    this.rateLimitInfo = rateLimitInfo;
  }

  static async getInfo(connection: ConnectionClient) {
    try {
      const info = await connection.query("ft3.get_blockchain_info", {});
      return new BlockchainInfo(
        info.name,
        info.website,
        info.description,
        new RateLimitInfo(
          info.rate_limit_active == 1,
          info.rate_limit_max_points,
          info.rate_limit_recovery_time,
          info.rate_limit_points_at_account_creation
        )
      );
    } catch {
      return new BlockchainInfo(
        connection.brid.toString("hex"),
        null,
        null,
        new RateLimitInfo(false, null, null, null)
      );
    }
  }
}
