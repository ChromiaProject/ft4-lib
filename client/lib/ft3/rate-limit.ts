
import Blockchain from "./blockchain";
import { freeOp, givePoints } from "./account-dev-operations";
import { nop } from './account-operations';

export default class RateLimit {
    points: number;
    last_upgrade: number;

    constructor(points: number, last_upgrade: number) {
        this.points = points;
        this.last_upgrade = last_upgrade;
    }

    getRequestsLeft() {
        return this.points;
    }

    static async execFreeOperation(accountId: Buffer, blockchain: Blockchain) {
        await blockchain.transactionBuilder()
            .add(freeOp(accountId))
            .add(nop())
            .build([])
            .post()            
    }

    static async getByAccountRateLimit(accountId: Buffer, blockchain: Blockchain): Promise<RateLimit> {
        const rateInfo = await blockchain.connection.gtx.query(
            'ft3.get_account_rate_limit',
            {
                account_id: accountId.toString('hex'),
            }  
        );
        if(!rateInfo) return null;
        return new RateLimit(rateInfo.points, rateInfo.last_update);
    }

    static async givePoints(accountId: Buffer, points: number, blockchain: Blockchain) {
        await blockchain.transactionBuilder()
            .add(givePoints(accountId, points))
            .add(nop())
            .build([])
            .post()
    }

    static async getLastTimestamp(blockchain: Blockchain): Promise<number> {
        return await blockchain.connection.gtx.query(
            'ft3.get_last_timestamp',
            {}
        );
    }

    static async getPointsAvailable(points: number, lastOperation: number, blockchain: Blockchain) {
        const maxCount = blockchain.info.requestMaxCount;
        const recoveryTime = blockchain.info.requestRecoveryTime;
        const lastTimestamp = await this.getLastTimestamp(blockchain);
        const delta = lastTimestamp - lastOperation;

        const pointsAvailable = Math.floor(delta / recoveryTime) + points
        if(pointsAvailable > maxCount) {
            return maxCount;
        }
        return pointsAvailable > 0? pointsAvailable : 0;
    }
}