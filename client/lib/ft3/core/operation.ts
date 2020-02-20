import {GtvSerializable} from "../user/account";

export default class Operation {
    readonly name: string;
    readonly args: Array<GtvSerializable>

    constructor(name: string, ...args: Array<GtvSerializable>) {
        if (!name) { throw new Error('Missing operation name')}

        this.name = name;
        this.args = args;
    }
}