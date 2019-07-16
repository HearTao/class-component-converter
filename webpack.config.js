const path = require('path');
const merge = require('webpack-merge');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = [];

module.exports.base = {
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

module.exports.umd = merge(module.exports.base, {
    output: {
        filename: 'index.js',
        library: 'tsCreator',
        libraryTarget: 'umd'
    }
});

module.exports.standalone = merge(module.exports.umd, {
    output: {
        filename: 'index.standalone.js'
    },
    externals: {
        typescript: 'ts'
    }
});

module.exports.web = merge(module.exports.umd, {
    target: 'web',
    output: {
        filename: 'index.web.js'
    },
    externals: {
        typescript: 'ts'
    }
});

module.exports.bundle = merge.strategy({
    externals: 'replace'
})(module.exports.web, {
    output: {
        filename: 'index.bundle.js'
    },
    externals: {},
    optimization: {
        minimize: false
    }
});

module.exports.cli = merge(module.exports.umd, {
    entry: './src/cli.ts',
    node: false,
    output: {
        filename: 'cli.js',
        library: 'tsCreatorCli',
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

module.exports.push(
    module.exports.umd,
    module.exports.standalone,
    module.exports.web,
    module.exports.bundle,
    module.exports.cli
);
