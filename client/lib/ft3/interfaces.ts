import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { AuthDescriptor } from "./account/auth-descriptor/types";
import { Account } from "./account/types";
import { Asset, AssetAmount, Balance } from "./asset/types";

export interface ftUserSession {
  get: ftQuerySession;
  asset: {
    dev: {
      register: (name: string, brid: Buffer) => Promise<void>;
    };
  };
  balance: {
    dev: {
      give: (
        assetId: Buffer,
        accountId: Buffer,
        amount: AssetAmount
      ) => Promise<void>;
    };
  };
  account: {
    sso: {
      ssoRegister: (authDescriptor: AuthDescriptor) => Promise<Buffer>;
      ssoAddAuthDescriptor: (
        accountId: Buffer,
        authDescriptor: AuthDescriptor
      ) => Promise<Buffer>;
    };
    authDescriptor: {
      add: (authDescriptor: AuthDescriptor, accountId: Buffer) => Promise<void>;
      deleteAll: (authDescriptorId: Buffer, accountId: Buffer) => Promise<void>;
      delete: (authDescriptorId: Buffer, accountId: Buffer) => Promise<void>;
    };
    token: {
      transfer: (
        from: Buffer,
        to: Buffer,
        asset: Buffer,
        amount: bigint
      ) => Promise<void>;
      burn: (from: Buffer, asset: Buffer, amount: bigint) => Promise<void>;
      xcTransfer: () => Promise<void>;
    };
    dev: {
      register: (authDescriptor: AuthDescriptor) => Promise<Account>;
      freeOperation: (accountId: Buffer) => Promise<void>;
    };
  };
}

export interface ftQuerySession {
  gtxClient: GtxClient;
  asset: {
    by: {
      name: (name: string) => Promise<Asset[]>;
      id: (assetId: Buffer) => Promise<Asset>;
    };
    all: () => Promise<Asset[]>;
  };
  balance: {
    by: {
      accountId: (accountId: Buffer) => Promise<Balance[]>;
      accountAndAssetId: (
        accountId: Buffer,
        assetId: Buffer
      ) => Promise<Balance>;
    };
  };
  account: {
    by: {
      participantId: (id: Buffer) => Promise<Account[]>;
      authDescriptorId: (id: Buffer) => Promise<Account[]>;
      ids: (ids: Buffer[]) => Promise<Account[]>;
      id: (id: Buffer) => Promise<Account>;
    };
    isAuthDescriptorValid: (
      accountId: Buffer,
      authDescriptorId: Buffer
    ) => Promise<boolean>;
  };
}
