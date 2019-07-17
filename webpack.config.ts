import * as webpack from 'webpack';
import * as path from 'path';
import * as merge from 'webpack-merge';

const isDev: boolean = process.env.NODE_ENV !== 'production';

const base: webpack.Configuration = {
    mode: isDev ? 'development' : 'production',
    target: 'node',
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, 'libs')
    },
    devtool: isDev ? 'eval' : 'source-map',
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                resolve: {
                    extensions: ['.ts']
                }
            }
        ]
    },
    optimization: {
        minimize: !isDev
    }
};

const umd: webpack.Configuration = merge(base, {
    name: `umd`,
    output: {
        filename: 'index.js',
        library: 'tsCreator',
        libraryTarget: 'umd'
    }
});

const standalone: webpack.Configuration = merge(umd, {
    name: `standalone`,
    output: {
        filename: 'index.standalone.js'
    },
    externals: {
        typescript: 'ts'
    }
});

const web: webpack.Configuration = merge(umd, {
    name: `web`,
    target: 'web',
    output: {
        filename: 'index.web.js'
    },
    externals: {
        typescript: 'ts'
    }
});

const bundle: webpack.Configuration = merge.strategy({
    externals: 'replace'
})(web, {
    name: `bundle`,
    output: {
        filename: 'index.bundle.js'
    },
    externals: {},
    optimization: {
        minimize: false
    }
});

const cli: webpack.Configuration = merge(umd, {
    name: `cli`,
    entry: './src/cli.ts',
    node: false,
    output: {
        filename: 'cli.js',
        libraryTarget: 'commonjs2'
    },
    externals: ['yargs', 'cardinal', 'prettier', 'get-stdin', './'],
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                resolve: {
                    extensions: ['.ts']
                },
                options: {
                    compilerOptions: {
                        target: 'esnext',
                        module: 'commonjs'
                    }
                }
            }
        ]
    }
});

const targetTable: { [key: string]: webpack.Configuration } = {
    umd,
    standalone,
    web,
    bundle,
    cli
};

export default function WebpackConfig(env?: { [key: string]: string }) {
    return env && env.target
        ? resolveTargets(env.target)
        : Object.values(targetTable);
}

function resolveTargets(targets: string): webpack.Configuration[] {
    return targets
        .trim()
        .split(',')
        .map(target => {
            const str: string = target.trim();
            const ret: webpack.Configuration | undefined = targetTable[str];
            if (undefined === ret) throw makeUnsupportsTargetError(str);
            return ret;
        });
}

function makeUnsupportsTargetError(target: string): Error {
    return new Error(`\
Unsupports target "${target}", should be one of:
${Object.keys(targetTable)
    .map(s => `  - ` + s)
    .join('\n')}
`);
}
