import type Blockchain from "../ft3/core/blockchain/blockchain";
import {GtvSerializable} from "../ft3";
import Operation from "../ft3/core/operation";

type DefaultQueries = {
    [key: string]: { params: { [key: string]: GtvSerializable }; return: unknown; }
}

export interface TypedBlockchain<Queries extends DefaultQueries> extends Blockchain {
    query<T extends keyof Queries>(name: T, params: Queries[T]["params"]): Promise<Queries[T]["return"]>;
}

interface DefaultOps {
    [key: string]: { params: GtvSerializable[]; }
}

export const createTypedOperation = <Ops extends DefaultOps>() => {
    return class TOperation<T extends keyof Ops> extends Operation {
        constructor (name: T, ...params: Ops[T]["params"]) {
            super(name as string, ...params);
        }
    }
}
