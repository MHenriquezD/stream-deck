const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const nodeExternals = require('webpack-node-externals');

const swcOptions = JSON.parse(fs.readFileSync(path.resolve(__dirname, '.swcrc'), 'utf-8'));

module.exports = (options, webpack) => {
  return {
    ...options,
    entry: './src/main.ts',
    externals: [
      nodeExternals({
        allowlist: [
          'tslib',
          /@nestjs\/.*/, // Todas las libs de NestJS
          /^rxjs(\/.*)?$/, // ⭐ rxjs y TODOS sus subpaths
          'reflect-metadata',
          'class-validator',
          'class-transformer',
          /^socket\.io(\/.*)?$/, // socket.io y subpaths
          /^engine\.io(\/.*)?$/, // dependencia de socket.io
          'multer', // file upload middleware
          'busboy', // dependencia de multer
          /^@socket\.io\/.*/, // @socket.io/* packages
        ],
      }),
      // @nut-tree-fork/nut-js siempre externo (tiene binarios nativos)
    ],
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js',
      libraryTarget: 'commonjs2',
    },
    target: 'node',
    node: {
      __dirname: false,
      __filename: false,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
    },
    module: {
      ...options.module,
      rules: [
        // Reemplaza el ts-loader que agrega Nest por defecto con
        // swc-loader — mismo type-checking lo sigue haciendo `tsc` aparte
        // (build:tsc / el editor), esto solo acelera la transpilación.
        ...options.module.rules.filter(
          (rule) => !(rule.test && rule.test.toString().includes('tsx?')),
        ),
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'swc-loader',
            options: swcOptions,
          },
        },
        {
          test: /\.vscode/,
          loader: 'ignore-loader',
        },
      ],
    },
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        resourceRegExp:
          /^(dustjs-linkedin|twig|hamlet|whiskers|hogan\.js|walrus|mustache|ractive|htmling|babel-core|twing)$/,
      }),
      new webpack.IgnorePlugin({
        checkResource(resource) {
          if (resource.includes('.vscode')) {
            return true;
          }

          const lazyImports = [
            '@nestjs/microservices',
            '@nestjs/microservices/microservices-module',
            '@nestjs/websockets/socket-module',
            'cache-manager',
            '@nestjs/platform-socket.io',
            '@nestjs/platform-ws',
          ];

          if (!lazyImports.includes(resource)) {
            return false;
          }

          try {
            require.resolve(resource);
          } catch (err) {
            return true;
          }

          return false;
        },
      }),
    ],
  };
};
