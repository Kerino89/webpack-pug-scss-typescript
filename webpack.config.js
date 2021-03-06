const { resolve } = require("path");
const { readdirSync } = require("fs");

const {
  WatchIgnorePlugin,
  HotModuleReplacementPlugin,
  IgnorePlugin,
} = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const NotifierPlugin = require("friendly-errors-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const LiveReloadPlugin = require("webpack-livereload-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const notifier = require("node-notifier");

const PAGES_DIR = resolve(__dirname, "src", "pug", "pages");
const PAGES = readdirSync(PAGES_DIR).filter(fileName =>
  fileName.endsWith(".pug"),
);

module.exports = (env, argv) => {
  const IS_PROD = argv.mode === "production";
  const PORT = 3000;

  const config = {
    mode: argv.mode || "development",

    context: resolve(__dirname, "src"),

    entry: resolve(__dirname, "src", "typescript", "main.ts"),

    output: {
      path: IS_PROD ? resolve(__dirname, "build") : undefined,
      filename: "js/[name].js",
      publicPath: IS_PROD ? "./" : "/",
    },

    plugins: [
      IS_PROD && new CleanWebpackPlugin(),

      new NotifierPlugin({
        compilationSuccessInfo: {
          messages: [
            `You application is running here http://localhost:${PORT}`,
          ],
        },
        onErrors: (severity, errors) => {
          if (severity !== "error") {
            return errors;
          }

          const error = errors[0];
          notifier.notify({
            title: "Webpack error",
            message: severity + ":" + error.name,
            subtitle: error.file || "",
          });
        },
      }),

      new WatchIgnorePlugin([/\.js$/, /\.d\.ts$/]),

      new ForkTsCheckerWebpackPlugin({
        async: !IS_PROD,
        typescript: {
          configFile: resolve(__dirname, "tsconfig.json")
        }
      }),

      ...PAGES.map(
        page =>
          new HtmlWebpackPlugin(
            Object.assign(
              {},
              {
                template: `${PAGES_DIR}/${page}`,
                filename: `./${page.replace(/\.pug/, ".html")}`,
              },
              IS_PROD
                ? {
                    minify: {
                      removeComments: true,
                      collapseWhitespace: true,
                      removeRedundantAttributes: true,
                      useShortDoctype: true,
                      removeEmptyAttributes: true,
                      removeStyleLinkTypeAttributes: true,
                      keepClosingSlash: true,
                      minifyJS: true,
                      minifyCSS: true,
                      minifyURLs: true,
                    },
                  }
                : undefined,
            ),
          ),
      ),

      new IgnorePlugin(/^\.\/locale$/, /moment$/),

      !IS_PROD && new HotModuleReplacementPlugin(),

      IS_PROD &&
        new MiniCssExtractPlugin({
          filename: "css/[name].css",
          chunkFilename: "css/[name].chunk.css",
        }),

      !IS_PROD && new LiveReloadPlugin({ appendScriptTag: true }),
    ].filter(Boolean),

    devtool: !IS_PROD ? "cheap-module-source-map" : "none",

    devServer: {
      contentBase: resolve(__dirname, "build"),
      open: true,
      stats: "normal",
      overlay: true,
      compress: true,
      clientLogLevel: "none",
      watchContentBase: true,
      hot: true,
      historyApiFallback: true,
      port: PORT,
      inline: true,
      quiet: true,
    },

    optimization: {
      minimize: IS_PROD,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },
          parallel: true,
          cache: true,
        }),

        new OptimizeCssAssetsPlugin({
          cssProcessorOptions: {
            map: {
              inline: false,
              annotation: true,
            },
          },
        }),
      ],
      splitChunks: {
        cacheGroups: {
          vendor: {
            name: "vendors",
            test: /node_modules/,
            chunks: "all",
            enforce: true,
          },
        },
      },
    },

    module: {
      rules: [
        {
          oneOf: [
            {
              test: /\.ts?$/,
              include: resolve(__dirname, "src"),
              use: [
                {
                  loader: "ts-loader",
                  options: {
                    transpileOnly: true,
                  },
                },
                {
                  loader: "eslint-loader",
                  options: {
                    cache: true,
                  },
                },
              ],
            },
            {
              test: /\.pug$/,
              use: "pug-loader",
            },
            {
              test: /\.(sc|sa|c)ss$/,
              use: [
                !IS_PROD
                  ? "style-loader"
                  : {
                      loader: MiniCssExtractPlugin.loader,
                      options: {
                        publicPath: "../",
                      },
                    },
                {
                  loader: "css-loader",
                  options: {
                    sourceMap: true,
                    importLoaders: 2,
                  },
                },
                {
                  loader: "postcss-loader",
                  options: {
                    postcssOptions: {
                      plugins: [
                        require("postcss-flexbugs-fixes"),
                        require("autoprefixer"),
                        require("postcss-preset-env")({ stage: 3 }),
                      ],
                    }
                  },
                },
                {
                  loader: "sass-loader",
                  options: {
                    sourceMap: true,
                    sassOptions: {
                      outputStyle: "expanded",
                    },
                  },
                },
              ],
            },
            {
              test: /\.(png|svg|jpe?g|gif)$/i,
              exclude: [resolve(__dirname, "src", "assets", "fonts")],
              use: [
                {
                  loader: "url-loader",
                  options: {
                    limit: 8192,
                    name: "[name].[ext]",
                    outputPath: "images",
                  },
                },
                {
                  loader: "image-webpack-loader",
                  options: {
                    mozjpeg: {
                      progressive: true,
                      quality: 65,
                    },
                    optipng: {
                      enabled: false,
                    },
                    pngquant: {
                      quality: [0.65, 0.9],
                      speed: 4,
                    },
                    svgo: {
                      plugins: [
                        { removeTitle: true },
                        { convertColors: { shorthex: false } },
                        { convertPathData: false },
                      ],
                    },
                    gifsicle: {
                      interlaced: false,
                    },
                    webp: {
                      enabled: false,
                    },
                  },
                },
              ],
            },
            {
              exclude: [/\.(js|ts)$/, /\.html$/, /\.json$/, /\.svg$/],
              use: [
                {
                  loader: "file-loader",
                  options: {
                    name: "[path][name].[ext]",
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    resolve: {
      extensions: [".ts", ".js", ".scss", ".json"],
    },

    performance: false,
  };

  return config;
};
