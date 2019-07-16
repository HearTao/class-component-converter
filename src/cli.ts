import * as yargs from 'yargs';
import * as prettier from 'prettier';
import * as fs from 'fs';
import * as path from 'path';
import { highlight } from 'cardinal';
import { convert } from './';

interface Options {
    output?: string;
    color: boolean;
}

export default async function main(): Promise<void> {
    const args: yargs.Arguments<Options> = yargs
        .strict()
        .usage(`$0 <input> [options]`)
        .option(`output`, {
            alias: `o`,
            type: `string`,
            description: `Output to file`,
            default: undefined
        })
        .option(`color`, {
            type: `boolean`,
            description: `Colorful output`,
            default: true
        })
        .version()
        .alias(`v`, `version`)
        .showHelpOnFail(true, `Specify --help for available options`)
        .help(`h`)
        .alias(`h`, `help`).argv;

    const { _, output, color } = args;
    if (0 === _.length) throw makeNoInputProvideError();
    const input: string = _[0];
    const content: string = fs.readFileSync(path.resolve(input), `utf-8`);
    const result: string = convert(content);

    if (undefined === output) {
        const formatted = prettier.format(result, { parser: `typescript` });
        console.log(color ? highlight(formatted, { jsx: true }) : formatted);
    } else {
        fs.writeFileSync(output, result, `utf-8`);
    }
}

function makeNoInputProvideError(): Error {
    return new Error(`No input file provide`);
}

main();
