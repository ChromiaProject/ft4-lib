import { initConnection } from '../client/lib/ft3/user/wallet-connect'

it("Opens a connection", async () => {
  jest.setTimeout(300000);

  initConnection();
  
  // TODO: Mock away the WC client so that we can remove this sleep 
  await new Promise(r => setTimeout(r, 200000)); 
});
