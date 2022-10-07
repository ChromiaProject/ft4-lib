// const crypto = require("crypto")
const crypto = require("crypto")
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";

const BRIDGE_URL = "https://1.bridge.walletconnect.org";

export const initConnection = () => {
  const key = crypto.randomBytes(32).toString('hex') 
  console.log(`wc:${crypto.randomUUID()}@1?bridge=${encodeURIComponent(BRIDGE_URL)}&key=${key}`)

  const connector = new WalletConnect({
    bridge: "https://1.bridge.walletconnect.org", // Required
    qrcodeModal: QRCodeModal,
  });
  
  // Check if connection is already established
  if (!connector.connected) {
    // create new session
    connector.createSession();
  }
  
  // Subscribe to connection events
  connector.on("connect", (error, payload) => {
    if (error) {
      throw error;
    }
  
    // Get provided accounts and chainId
    const { accounts, chainId } = payload.params[0];
  });
  
  connector.on("session_update", (error, payload) => {
    if (error) {
      throw error;
    }
  
    // Get updated accounts and chainId
    const { accounts, chainId } = payload.params[0];
  });
  
  connector.on("disconnect", (error, payload) => {
    if (error) {
      throw error;
    }
  
    // Delete connector
  });
}

