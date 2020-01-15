
import Blockchain from "./blockchain";

export default class RateLimit {
    requestCount: number;
    lastTimestamp: number;
    REQUEST_LIMIT;

    constructor(requestLimit: number, requestCounter: number, timestamp: number) {
        this.REQUEST_LIMIT = requestLimit;
        this.requestCount = requestCounter;
        this.lastTimestamp = timestamp;
    }

    getRequestsLeft() {
        return this.REQUEST_LIMIT - this.requestCount;
    }

    static async getByAccountRateLimit(accountId: Buffer, blockchain: Blockchain): Promise<RateLimit> {
        const rateInfo = await blockchain.connection.gtx.query(
            'ft3.requests_per_user',
            {
                account_id: accountId.toString('hex'),
            }  
        );
        if(!rateInfo) return null;
        return new RateLimit(blockchain.info.requestsPerMinute, rateInfo.request_count, rateInfo.last_timestamp);
    }
}