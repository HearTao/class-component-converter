import * as ts from 'typescript'
import vfs = require('memory-fs')

export function getCompileHost (base: string = '/'): ts.CompilerHost {
    const fs = new vfs()

    return {
        getCurrentDirectory: () => base,
        fileExists(filename) {
            return fs.existsSync(fs.join(this.getCurrentDirectory(), filename))
        },
        readFile (filename) {
            const path = fs.join(this.getCurrentDirectory(), filename)
            return fs.existsSync(path) ? fs.readFileSync(path).toString() : undefined
        },
        directoryExists(directoryName) {
            return fs.existsSync(fs.join(this.getCurrentDirectory(), directoryName))
        },
        getSourceFile (filename: string, languageVersion: ts.ScriptTarget) {
            const path = fs.join(this.getCurrentDirectory(), filename)
            return fs.existsSync(path) ? ts.createSourceFile(path, fs.readFileSync(path).toString(), languageVersion) : undefined
        },
        getDefaultLibFileName(options: ts.CompilerOptions) {
            return fs.join(this.getCurrentDirectory(), ts.getDefaultLibFileName(options))
        },
        writeFile(filename: string, data: string, writeByteOrderMark: boolean) {
            return fs.writeFileSync(fs.join(this.getCurrentDirectory(), filename), data)
        },
        getCanonicalFileName: filename => filename,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n'
    }
}
