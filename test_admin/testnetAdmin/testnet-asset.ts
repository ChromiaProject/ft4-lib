import { Asset, Operation } from "../../client/lib/ft3";
import { Blockchain } from "../../client/lib/ft3";
import AdminSignatureProvider from "./admin-signature-provider";

export class TestnetAsset extends Asset {
  static async register(name: string, brid: Buffer, blockchain: Blockchain) {
    const tx = await blockchain
      .transactionBuilder()
      .add(new Operation("dev_register_asset", name, brid.toString("hex")))
      .build([AdminSignatureProvider.get().pubKey])
      .sign(AdminSignatureProvider.get());
    await tx.post();
    return new Asset(name, brid);
  }
}
