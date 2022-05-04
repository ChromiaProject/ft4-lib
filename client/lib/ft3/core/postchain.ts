import DirectoryServiceBase from "./blockchain/directory-service-base";
import ChainConnectionInfo from "./chain-connection-info";
import Blockchain from "./blockchain/blockchain";
const fetch = typeof process === 'object' ? require('node-fetch') : window.fetch;

export default class Postchain {
    constructor(readonly url: string) {}

    async blockchain(id: Buffer | string | number): Promise<Blockchain> {
		let _id;
		if(typeof id === "number"){
			_id = Buffer.from(await this.getBRID(id), 'hex');
		} else{	
			_id = id instanceof Buffer ? id : Buffer.from(id, 'hex');
		}

        const directoryService = new DirectoryServiceBase([
            new ChainConnectionInfo(_id, this.url)
        ]);

        return await Blockchain.initialize(_id, directoryService);
    }
	
	async getBRID(iid:number):Promise<string>{
		if (typeof process === "object") {
			return fetch(`${this.url}/brid/iid_${iid}`)
					.then(res=>res.body)
					.then(  readable=>readable.read().toString('utf-8')  );
		}else{
			return fetch(`${this.url}/brid/iid_${iid}`)
					.then(res=>res.body.getReader())
					.then(reader=>reader.read())
					.then(({done, value})=>{return value});
		}
	}
}
