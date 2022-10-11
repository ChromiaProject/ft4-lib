const crypto = require("crypto")
import WalletConnect from "@walletconnect/client";

const BRIDGE_URL = "https://bridge.walletconnect.org";

export const initConnection = async () => {
  const connector = new WalletConnect({
    bridge: "https://bridge.walletconnect.org"
  });

  await connector.createSession()
  const uri = connector.uri
  console.log(uri)

  // Subscribe to connection events
  connector.on("connect", async (error, payload) => {
    if (error) {
      throw error;
    }
  
    // Get provided accounts and chainId
    const { accounts, chainId } = payload.params[0];
    console.log("Connect: ", JSON.stringify(payload))
    // Draft Message Parameters
    const message = JSON.stringify({
      message: "Do you want to send 1000 CHR to 0x828395927373... \n\n Parameter hash: 0x78289483873...",
      parameterHash: "0x78289483873...",
      messageHash: "0x85832020220...",
      parameters: [1000, "0x828395927373..."]
    });

    const msgParams = [
      message, // Required
      accounts[0], // Required
    ];

    // Sign personal message
    const signResults = await connector.signPersonalMessage(msgParams)
    console.log("Sign result: ", signResults)
  });
  
  connector.on("session_update", (error, payload) => {
    if (error) {
      throw error;
    }
  
    // Get updated accounts and chainId
    const { accounts, chainId } = payload.params[0];
    console.log("session_update: ", JSON.stringify(payload))
  });
  
  connector.on("disconnect", (error, payload) => {
    if (error) {
      throw error;
    }
  
    // Delete connector
    console.log("disconnect: ", JSON.stringify(payload))
  });
}

