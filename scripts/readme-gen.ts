#!/usr/bin/env ts-node

import { convert } from '../src'
import * as prettier from 'prettier'
import * as path from 'path'
import * as fs from 'fs'
import * as vm from 'vm'

const TEMPLATE_PATH: string = `./templates/README.md.txt`
const EXAMPLE_TEMPLATE_PATH: string = `./templates/example.md.txt`
const OUTPUT_PATH: string = `../README.md`

interface Data {
    name: string
    description: string
    example: string
}

interface ExampleData {
    before: string
    after: string
}

function render<T>(template: string, data: T): string {
    const code = `ret=\`${escape(template)}\``
    const sandbox = vm.createContext({ ...data, ret: `` })
    vm.runInContext(code, sandbox)
    return sandbox.ret
}

function escape(input: string): string {
    return input.replace(/\`/g, '\\\`')
}

function readFileContent(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, relativePath), `utf-8`)
}

function main() {
    const template: string = readFileContent(TEMPLATE_PATH)
    const pkg = JSON.parse(readFileContent(`../package.json`))
    const beforeContent: string = readFileContent(`../tests/cli/origin.ts.txt`)
    const before = prettier.format(beforeContent, { parser: `typescript` })
    const after: string = prettier.format(convert(before), { parser: `typescript` })
    const exmapleTemplate: string = readFileContent(EXAMPLE_TEMPLATE_PATH)
    const example: string = render<ExampleData>(exmapleTemplate, { before, after })
    const data: Data = {
        name: pkg.name,
        description: pkg.description,
        example
    }
    const ret: string = render<Data>(template, data)
    fs.writeFileSync(path.resolve(__dirname, OUTPUT_PATH), ret, `utf-8`)
}

main()