//import WalletConnect from "@walletconnect/client";
//import ExternalWalletConnection from "../client/lib/ft3/user/external-wallet-connection";

//jest.mock("@walletconnect/client");

describe("ExternalWalletConnection", () => {
  it("empty", () => {
    expect(true).toBe(true);
  });
  /*
  beforeEach(() => {
    (WalletConnect as jest.MockedClass<typeof WalletConnect>).mockClear();
  });

  const walletConnectMock = () =>
    (WalletConnect as jest.MockedClass<typeof WalletConnect>).mock.instances[0];

  const overrideWalletConnectMethods = (overRides) => {
    ExternalWalletConnection["createConnection"] = jest
      .fn()
      .mockReturnValue(overRides);
  };

  it("creates a session on init", async () => {
    await ExternalWalletConnection.init();
    const createSessionMock = walletConnectMock().createSession;

    expect(createSessionMock).toHaveBeenCalledTimes(1);
  });
  it("returns the correct connection uri", async () => {
    const connector = await ExternalWalletConnection.init();
    Object.defineProperty(walletConnectMock(), "uri", {
      get: jest.fn(() => {
        return "localhost:80";
      }),
      set: jest.fn(),
    });

    expect(connector.connectionUri).toStrictEqual("localhost:80");
  });

  it("returns the correct accounts after connected", async () => {
    const onEventMock = (method, func) => {
      if (method === "connect") {
        func(null, { accounts: ["0xabcd"], chainId: 5 });
      }
    };
    overrideWalletConnectMethods({ on: onEventMock });

    const connector = await ExternalWalletConnection.init();
    expect(connector.accounts).toStrictEqual(["0xabcd"]);
  });

  it("returns the correct accounts after session is updated", async () => {
    const onEventMock = (method, func) => {
      if (method === "connect") {
        func(null, { accounts: ["0xabcd"], chainId: 5 });
      }
      if (method === "session_update") {
        func(null, { accounts: ["0xabcde"], chainId: 5 });
      }
    };
    overrideWalletConnectMethods({ on: onEventMock });

    const connector = await ExternalWalletConnection.init();
    expect(connector.accounts).toStrictEqual(["0xabcde"]);
  });

  it("sends a signing request to device", async () => {
    const signMethodMock = jest.fn().mockReturnValue("the signature");
    overrideWalletConnectMethods({
      on: jest.fn(),
      signPersonalMessage: signMethodMock,
    });

    const connector = await ExternalWalletConnection.init();
    const signature = await connector.signMessage({
      message: "Hello",
      account: "0xabcd",
    });
    expect(signMethodMock).toHaveBeenCalledWith(["Hello", "0xabcd"]);
    expect(signature).toStrictEqual("the signature");
  });

  it("handles reconnection before signing", async () => {
    let onDisconnect = undefined;
    const onEventMock = (method, func) => {
      if (method === "disconnect") {
        onDisconnect = func;
      }
    };
    const signMethodMock = jest.fn().mockReturnValue("the signature");
    overrideWalletConnectMethods({
      on: onEventMock,
      signPersonalMessage: signMethodMock,
    });

    const connector = await ExternalWalletConnection.init();
    onDisconnect();

    const signature = await connector.signMessage({
      message: "Hello",
      account: "0xabcd",
    });
    expect(signMethodMock).toHaveBeenCalledWith(["Hello", "0xabcd"]);
    expect(signature).toStrictEqual("the signature");
  });*/
});
