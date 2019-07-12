import * as webpack from 'webpack'
import * as ts from 'typescript'
import { classTransformer } from '../../src'

export default function webpackConfig(): webpack.Configuration {
    return {
        module: {
            rules: [{
                test: /\.tsx?$/,
                use: {
                    loader: `ts-loader`,
                    options: {
                        getCustomTransformers(program: ts.Program) {
                            return {
                                before: [ 
                                    classTransformer(program.getTypeChecker()) 
                                ]
                            }
                        }
                    }
                }
            }]
        },
        mode: `development`,
        devtool: false,
        resolve: {
            extensions: [`.js`, `.mjs`, `.wasm`, `.json`, `.ts`]
        },
        optimization: {
            minimize: false
        }
    }
}