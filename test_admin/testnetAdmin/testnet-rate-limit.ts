import RateLimit from "../../client/lib/ft3/user/rate-limit";
import Blockchain from "../../client/lib/ft3/core/blockchain/blockchain";
import { nop, Operation } from "../../client/lib/ft3";
import AdminKeyPair from "./admin-keypair";

export class TestnetRateLimit extends RateLimit {
  static async execFreeOperation(accountId: Buffer, blockchain: Blockchain) {
    await blockchain
      .transactionBuilder()
      .add(new Operation("dev_free_op", accountId))
      .add(nop())
      .build([AdminKeyPair.get().pubKey])
      .sign(AdminKeyPair.get())
      .post();
  }

  static async givePoints(
    accountId: Buffer,
    points: number,
    blockchain: Blockchain
  ) {
    await blockchain
      .transactionBuilder()
      .add(new Operation("dev_give_points", accountId, points))
      .add(nop())
      .build([AdminKeyPair.get().pubKey])
      .sign(AdminKeyPair.get())
      .post();
  }
}
