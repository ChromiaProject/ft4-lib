import { restClient, gtxClient } from 'postchain-client';

export default class ConnectionClient {
    chainURL: string;
    chainId: string;
    gtx;

    constructor(chainURL: string, chainId: string) {
        this.chainURL = chainURL;
        this.chainId = chainId;
        this.gtx = gtxClient.createClient(
            restClient.createRestClient(chainURL, chainId, 5),
            Buffer.from(chainId, 'hex'),
            []
        );
    }

}
