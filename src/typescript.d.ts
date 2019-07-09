import * as ts from 'typescript'

declare module "typescript" {
    
    export interface Node {
        id?: number
    }
}