import { convert } from '../src';
import * as prettier from 'prettier';
import * as fs from 'fs';

const code = fs.readFileSync('./tests/cli/origin.ts.txt').toString();

const result = prettier.format(convert(code), {
    parser: 'typescript'
});
console.log(result);
