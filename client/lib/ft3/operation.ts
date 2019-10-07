import {GtvSerializable} from "./account";

export default class Operation {
    readonly name: string;
    readonly args: Array<GtvSerializable>

    constructor(name: string, ...args: Array<GtvSerializable>) {
        this.name = name;
        this.args = args;
    }
}