import testUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { ftUserSession } from "../client/lib/ft3/interfaces";
import { Asset } from "../client/lib/ft3/asset/types";
import { Account, User } from "../client/lib/ft3/account/types";
import { AuthDescriptorRule } from "../client/lib/ft3/account/auth-descriptor/types";
import { getAuthDescriptorId } from "../client/lib/ft3/account/auth-descriptor";
import { getNewAsset, getUserSession } from "./util/blockchain-util";
import { allow } from "../client/lib/ft3/account/auth-descriptor/rules";

let ft: ftUserSession;
let asset: Asset;

function sourceAccount(user: User): Promise<Account> {
  return AccountBuilder.account(ft.changeUser(user))
    .withBalance(asset, 200)
    .withPoints(5)
    .build();
}

function destinationAccount(): Promise<Account> {
  return AccountBuilder.account(ft).build();
}

async function addAuthDescriptorTo(
  account: Account,
  adminUser: User,
  user: User,
  ft: ftUserSession
) {
  await ft
    .changeUser(adminUser)
    .account.authDescriptor.add(user.authDescriptor, account.id);
}

async function getUserAndAccountFromAuthDescriptorRule(
  rule: AuthDescriptorRule,
  ft: ftUserSession
): Promise<[User, Account]> {
  //to be used when you don't need the admin user
  const user1 = testUser();
  const user2 = testUser(rule);
  const account = await sourceAccount(user1);

  await addAuthDescriptorTo(account, user1, user2, ft);

  const accounts = await ft.get.account.by.authDescriptorId(
    getAuthDescriptorId(user2.authDescriptor)
  );
  if (accounts.length > 1) throw new Error("Found more than one account");

  return [user2, accounts[0]];
}

describe("Auth Descriptor Rule", () => {
  beforeAll(async () => {
    ft = await getUserSession();
    asset = await getNewAsset(ft);
  });

  it("should succeed when number of called operations is less than or equal to value set by operation count rule", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.operationCount.lessOrEqual(2).only,
      ft
    );
    const account2 = await destinationAccount();

    const op1Promise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(op1Promise).resolves.not.toThrowError();

    const op2Promise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(20)
    );
    await expect(op2Promise).resolves.not.toThrowError();
  });

  it("should fail when number of called operations is greater than value set by operation count rule", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.operationCount.lessThan(2).only,
      ft
    );
    const account2 = await destinationAccount();

    const op1Promise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(op1Promise).resolves.not.toThrowError();

    const op2Promise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(20)
    );
    await expect(op2Promise).rejects.toThrowError();
  });

  it("should fail when current time is greater than time defined by 'less than' block time rule", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.blockTime.lessThan(Date.now() - 10000).only,
      ft
    );
    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed when current time is less than time defined by 'less than' block time rule", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.blockTime.lessThan(Date.now() + 10000).only,
      ft
    );

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should succeed when current block height is less than value defined by 'less than' block height rule", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.blockHeight.lessThan(10000).only,
      ft
    );

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail when current block height is greater than value defined by 'less than' block height rule", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.blockHeight.lessThan(1).only,
      ft
    );

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should fail if operation is executed before timestamp defined by 'greater than' block time rule", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.blockTime.greaterThan(Date.now() + 10000).only,
      ft
    );

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed if operation is executed after timestamp defined by 'greater than' block time rule", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.blockTime.greaterThan(Date.now() - 10000).only,
      ft
    );

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail if operation is executed before block defined by 'greater than' block height rule", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.blockHeight.greaterThan(10000).only,
      ft
    );

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed if operation is executed after block defined by 'greater than' block height rule", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.blockHeight.greaterThan(1).only,
      ft
    );

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should be able to create complex rules", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.blockHeight.greaterThan(1).and.blockHeight.lessThan(10000).only,
      ft
    );

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail if block heights defined by 'greater than' and 'less than' block height rules are less than current block height", async () => {
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      allow.blockHeight.greaterThan(1).and.blockHeight.lessThan(10).only,
      ft
    );

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should fail if block times defined by 'greater than' and 'less than' block time rules are in the past", async () => {
    const rules = allow.blockTime
      .greaterThan(Date.now() - 20000)
      .and.blockTime.lessThan(Date.now() - 10000).only;
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      rules,
      ft
    );

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed if current time is within period defined by 'greater than' and 'less than' block time rules", async () => {
    const rules = allow.blockTime
      .greaterThan(Date.now() - 10000)
      .and.blockTime.lessThan(Date.now() + 10000).only;
    const [, account] = await getUserAndAccountFromAuthDescriptorRule(
      rules,
      ft
    );

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      BigInt(10)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should delete expired auth descriptor", async () => {
    const user1 = testUser();
    const user2 = testUser(allow.operationCount.lessThan(2).only);

    let srcAccount1 = await sourceAccount(user1);
    const destAccount = await destinationAccount();

    // add expiring auth descriptor to the account
    await addAuthDescriptorTo(srcAccount1, user1, user2, ft);

    // get the same account, but initialized with user2
    // object which contains expiring auth descriptor
    const ft2 = ft.changeUser(user2);
    const srcAccount2 = await ft2.get.account.by.id(srcAccount1.id);

    await ft2.account.token.transfer(
      srcAccount2.id,
      destAccount.id,
      asset.id,
      BigInt(10)
    );

    // account descriptor used by user2 object has expired.
    // this operation call will delete it.
    // any other operation, which calls require_auth internally
    // would also delete expired auth descriptor.
    await ft2.account.token.transfer(
      srcAccount1.id,
      destAccount.id,
      asset.id,
      BigInt(30)
    );

    srcAccount1 = await ft.get.account.by.id(srcAccount1.id);

    expect(srcAccount1.authDescriptors.length).toEqual(1);
  });

  it("shouldn't delete non-expired auth descriptor", async () => {
    const user1 = testUser();
    const user2 = testUser(allow.operationCount.lessThan(10).only);

    let srcAccount1 = await sourceAccount(user1);
    const destAccount = await destinationAccount();

    // add expiring auth descriptor to the account
    await addAuthDescriptorTo(srcAccount1, user1, user2, ft);

    // get the same account, but initialized with user2
    // object which contains expiring auth descriptor
    const ft2 = ft.changeUser(user2);
    const srcAccount2 = await ft2.get.account.by.id(srcAccount1.id);

    // perform transfer with expiring auth descriptor.
    // auth descriptor didn't expire, because it's only used 1 out of 10 times.
    await ft2.account.token.transfer(
      srcAccount2.id,
      destAccount.id,
      asset.id,
      BigInt(10)
    );

    // perform transfer using auth descriptor without rules
    await ft2.account.token.transfer(
      srcAccount1.id,
      destAccount.id,
      asset.id,
      BigInt(10)
    );

    srcAccount1 = await ft.get.account.by.id(srcAccount1.id);

    expect(srcAccount1.authDescriptors.length).toEqual(2);
  });

  it("should delete only expired auth descriptor if multiple expiring descriptors exist", async () => {
    const user1 = testUser();
    const user2 = testUser(allow.operationCount.lessOrEqual(1).only);
    const user3 = testUser(allow.operationCount.lessOrEqual(1).only);

    let srcAccount1 = await sourceAccount(user1);
    const destAccount = await destinationAccount();

    await addAuthDescriptorTo(srcAccount1, user1, user2, ft);
    await addAuthDescriptorTo(srcAccount1, user1, user3, ft);

    const ft2 = ft.changeUser(user2);
    const srcAccount2 = await ft2.get.account.by.id(srcAccount1.id);

    await ft2.account.token.transfer(
      srcAccount2.id,
      destAccount.id,
      asset.id,
      BigInt(50)
    );

    // this call will trigger deletion of expired auth descriptor (attached to user2)
    await ft2.account.token.transfer(
      srcAccount1.id,
      destAccount.id,
      asset.id,
      BigInt(100)
    );

    srcAccount1 = await ft.get.account.by.id(srcAccount1.id);

    expect(srcAccount1.authDescriptors.length).toEqual(2);
  });

  it("should add auth descriptors", async () => {
    const user1 = testUser();
    const user2 = testUser(allow.operationCount.lessOrEqual(1).only);
    const user3 = testUser(allow.operationCount.lessOrEqual(1).only);

    let account = await sourceAccount(user1);

    await addAuthDescriptorTo(account, user1, user2, ft);
    await addAuthDescriptorTo(account, user1, user3, ft);

    account = await ft.get.account.by.id(account.id);

    expect(account.authDescriptors.length).toEqual(3);
  });

  it("should delete auth descriptors", async () => {
    const user1 = testUser();
    const user2 = testUser(allow.operationCount.lessOrEqual(1).only);
    const user3 = testUser(allow.operationCount.lessOrEqual(1).only);
    let account = await sourceAccount(user1);
    await addAuthDescriptorTo(account, user1, user2, ft);
    await addAuthDescriptorTo(account, user1, user3, ft);

    await ft.account.authDescriptor.deleteAllExcluding(
      getAuthDescriptorId(user1.authDescriptor),
      account.id
    );

    expect(account.authDescriptors.length).toEqual(3);

    account = await ft.get.account.by.id(account.id);

    expect(account.authDescriptors.length).toEqual(1);
  });

  it("should fail when deleting an auth descriptor which is not owned by the account", async () => {
    const user1 = testUser();
    const user2 = testUser();

    const account1 = await sourceAccount(user1);
    await sourceAccount(user2);

    const promise = ft.account.authDescriptor.delete(
      getAuthDescriptorId(user2.authDescriptor),
      account1.id
    );
    await expect(promise).rejects.toThrowError();
  });

  it("should delete auth descriptor", async () => {
    const user1 = testUser();
    const user2 = testUser();

    let account = await sourceAccount(user1);

    await addAuthDescriptorTo(account, user1, user2, ft);
    await ft.account.authDescriptor.delete(
      getAuthDescriptorId(user2.authDescriptor),
      account.id
    );

    account = await ft.get.account.by.id(account.id);
    expect(account.authDescriptors.length).toEqual(1);
  });

  it("Should be able to create same rules with different value", async () => {
    const rules = allow.blockHeight
      .greaterThan(1)
      .and.blockHeight.greaterThan(10000)
      .and.blockTime.greaterOrEqual(122222999).only;

    const user1 = testUser();
    const user2 = testUser(rules);
    const account = await sourceAccount(user1);

    await expect(
      addAuthDescriptorTo(account, user1, user2, ft)
    ).resolves.toBeUndefined();
  });

  it("shouldn't be able to create too many rules", async () => {
    let rules = allow.blockHeight
      .greaterThan(1)
      .and.blockHeight.greaterThan(10000)
      .and.blockTime.greaterOrEqual(122222999);
    for (let i = 0; i < 400; i++) {
      rules = rules.and.blockHeight.greaterOrEqual(i);
    }

    const user1 = testUser();
    const user2 = testUser(rules.only);
    const account = await sourceAccount(user1);

    await expect(
      addAuthDescriptorTo(account, user1, user2, ft)
    ).rejects.toThrowError();
  });

  it("shouldn't be able to create an account with an expiring auth descriptor", async () => {
    const user = testUser(allow.operationCount.lessOrEqual(2).only);

    const createPromise = sourceAccount(user);
    await expect(createPromise).rejects.toThrowError();
  });
});
