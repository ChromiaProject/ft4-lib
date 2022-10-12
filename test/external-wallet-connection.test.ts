import WalletConnect from '@walletconnect/client'
import ExternalWalletConnection from '../client/lib/ft3/user/external-wallet-connection'

jest.mock("@walletconnect/client")

describe("ExternalWalletConnection", () => {
  const overrideWalletConnectMethods = overRides => {
    (WalletConnect as jest.MockedClass<typeof WalletConnect>).mockImplementation(() => {
      return Object.assign({
        createSession: jest.fn(),
        on: jest.fn(),
        uri: "",
      }, ...overRides)
    })
  }

  it("creates a session on init", async () => {
    const createSessionMock = jest.fn()
    overrideWalletConnectMethods({ createSession: createSessionMock })
    
    await ExternalWalletConnection.init()
    expect(createSessionMock).toHaveBeenCalledTimes(1)
  })
  it("returns the correct connection uri", async () => {
    const connectionUri = "localhost:80"
    overrideWalletConnectMethods({ uri: connectionUri })
    
    const connector = await ExternalWalletConnection.init()
    expect(connector.connectionUri).toStrictEqual(connectionUri)
  })

  it("returns the correct accounts after connected", async () => {
    const onEventMock = (method, func) => {
      if (method === "connect") {
        func(null, { accounts: ["0xabcd"], chainId: 5 })
      }
    }
    overrideWalletConnectMethods({ on: onEventMock })
    
    const connector = await ExternalWalletConnection.init()
    expect(connector.accounts).toStrictEqual(["0xabcd"])
  })
  
  it("returns the correct accounts after session is updated", async () => {
    const onEventMock = (method, func) => {
      if (method === "connect") {
        func(null, { accounts: ["0xabcd"], chainId: 5 })
      }
      if (method === "session_update") {
        func(null, { accounts: ["0xabcde"], chainId: 5 })
      }
    }
    overrideWalletConnectMethods({ on: onEventMock })
    
    const connector = await ExternalWalletConnection.init()
    expect(connector.accounts).toStrictEqual(["0xabcde"])
  })

  it("sends a signing request to device", async () => {
    const signMethodMock = jest.fn()
    signMethodMock.mockReturnValue("the signature")
    overrideWalletConnectMethods({ signPersonalMessage: signMethodMock })
    
    const connector = await ExternalWalletConnection.init()
    const signature = await connector.signMessage({ message: "Hello", account: "0xabcd" })
    expect(signMethodMock).toHaveBeenCalledWith([ "Hello", "0xabcd" ])
    expect(signature).toStrictEqual("the signature")
  })

  it("handles reconnection before signing", async () => {
    let onDisconnect = undefined
    const onEventMock = (method, func) => {
      if (method === "disconnect") {
        onDisconnect = func
      }
    }
    const signMethodMock = jest.fn()
    signMethodMock.mockReturnValue("the signature")
    overrideWalletConnectMethods({ on: onEventMock, signPersonalMessage: signMethodMock })
    
    const connector = await ExternalWalletConnection.init()
    onDisconnect()

    const signature = await connector.signMessage({ message: "Hello", account: "0xabcd" })
    expect(signMethodMock).toHaveBeenCalledWith([ "Hello", "0xabcd" ])
    expect(signature).toStrictEqual("the signature")
  })
})
