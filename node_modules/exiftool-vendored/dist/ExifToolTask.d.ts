import * as bc from "batch-cluster";
export declare abstract class ExifToolTask<T> extends bc.Task<T> {
    readonly args: string[];
    static renderCommand(args: string[]): string;
    readonly errors: string[];
    constructor(args: string[]);
    protected abstract parse(input: string, error?: Error): T;
    addError(err: string): void;
}
