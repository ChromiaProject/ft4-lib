let pcl = require('postchain-client');


const rest = pcl.restClient.createRestClient(process.env.BLOCKCHAIN_REST || "http://localhost:7740/", process.env.CHAIN_ID, 5)
const gtx = pcl.gtxClient.createClient(
    rest,
    Buffer.from(
        process.env.CHAIN_ID,
        'hex'
    ),
    []
);

export {
	gtx
}