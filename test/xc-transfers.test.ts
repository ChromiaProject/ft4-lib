import AccountBuilder from "./util/account-builder";
import { blockchainAccountId, generateId } from "./util/util";
import TestUser from "./util/test-user";
import { ftUserSession } from "../client/lib/ft4/types";
import { Asset } from "../client/lib/ft4/asset/types";
import { getNewAsset, getUserSession } from "./util/blockchain-util";

let _ft: ftUserSession;
let asset: Asset;

describe.skip("Cross-chain transfer", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
    asset = await getNewAsset(_ft);
  });

  /* needs heavy refactoring */
  it("should succeessfully initialize when there's enough balance on the account", async () => {
    const destinationBRID = generateId();
    //const destinationAccountId = generateId();
    const user = TestUser();
    const ft = _ft.changeUser(user);

    const account = await AccountBuilder.account(ft)
      .withParticipants([user.signatureProvider])
      .withBalance(asset, 100)
      .withPoints(1)
      .build();

    await ft.account.token
      .xcTransfer
      /*destinationBRID,
      destinationAccountId,
      asset.id,
      10*/
      ();

    const accountBalance = await ft.get.balance.by.accountAndAssetId(
      account.id,
      asset.id
    );
    const chainBalance = await ft.get.balance.by.accountAndAssetId(
      blockchainAccountId(destinationBRID),
      asset.id
    );

    expect(accountBalance.amount).toEqual(90);
    expect(chainBalance.amount).toEqual(10);
  });
});
