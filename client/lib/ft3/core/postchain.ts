import DirectoryServiceBase from "./blockchain/directory-service-base";
import ChainConnectionInfo from "./chain-connection-info";
import Blockchain from "./blockchain/blockchain";
const fetch = typeof process === 'object' ? require('node-fetch') : window.fetch;

export default class Postchain {
    constructor(readonly url: string) {}

    async blockchain(id: Buffer | string | number): Promise<Blockchain> {
		let _id = Buffer.alloc(0);
		if(typeof id === "number"){
			console.log(_id, " => ");
			if (typeof process === "object") {
				let readable = await fetch(this.url+"/brid/iid_"+id).then(res=>res.body)
				_id = readable.read().toString('utf-8');
			}else{
				_id = await fetch(this.url+"/brid/iid_"+id).then(res=>res.body.getReader())
							.then(reader=>reader.read())
							.then(({done, value})=>{return value});
			}
		} else
		
		_id = id instanceof Buffer ? id : Buffer.from(id, 'hex');
				

        const directoryService = new DirectoryServiceBase([
            new ChainConnectionInfo(_id, this.url)
        ]);

        return await Blockchain.initialize(_id, directoryService);
    }
}
