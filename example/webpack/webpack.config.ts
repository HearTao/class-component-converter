import * as webpack from 'webpack'
import * as ts from 'typescript'
import { classTransformer } from '../../src'

export default function webpackConfig(env: { loader: string }): webpack.Configuration {
    return {
        module: {
            rules: [{
                test: /\.tsx?$/,
                use: {
                    loader: env.loader,
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