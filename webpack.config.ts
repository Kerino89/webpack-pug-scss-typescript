import * as fs from "fs";
import * as path from "path";

import EslintWebpackPlugin from "eslint-webpack-plugin";
import TerserWebpackPlugin from "terser-webpack-plugin";
import HTMLWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import { WatchIgnorePlugin } from "webpack";

import type { Configuration } from "webpack";
import type WebpackDevServer from "webpack-dev-server";

const PORT = 9000;
const ROOT_PATH = fs.realpathSync(process.cwd());
const SOURCE_PATH = path.resolve(ROOT_PATH, "src");
const ENTRY_PATH = path.resolve(SOURCE_PATH, "typescript", "main.ts");
const PAGES_PATH = path.resolve(SOURCE_PATH, "pug", "pages");
const FONTS_PATH = path.resolve(SOURCE_PATH, "assets", "fonts");
const ASSETS_PATH = path.resolve(SOURCE_PATH, "assets");
const BUILD_PATH = path.resolve(ROOT_PATH, "build");
const PAGES = fs.readdirSync(PAGES_PATH).filter((fileName) => fileName.endsWith(".pug"));

const EXTENSIONS = [".js", ".ts", ".scss", ".json"];

export default (
  env: any,
  { mode }: any,
): Configuration & {
  devServer?: WebpackDevServer.Configuration;
} => {
  const IS_PROD = mode === "production";

  return {
    mode: mode || "development",
    context: SOURCE_PATH,
    entry: ENTRY_PATH,
    output: {
      path: IS_PROD ? BUILD_PATH : "/",
      filename: "js/[name].js",
      publicPath: IS_PROD ? "./" : "/",
      assetModuleFilename: ".",
    },
    resolve: { extensions: EXTENSIONS, preferRelative: true },
    devtool: !IS_PROD ? "eval-cheap-module-source-map" : "source-map",
    devServer: {
      contentBase: BUILD_PATH,
      open: true,
      overlay: true,
      compress: true,
      hot: true,
      historyApiFallback: true,
      port: PORT,
      inline: true,
      quiet: true,
    },
    optimization: {
      minimize: IS_PROD,
      minimizer: [
        new TerserWebpackPlugin({
          terserOptions: {
            output: {
              comments: false,
            },
          },
          extractComments: false,
        }),
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: ["default", { discardComments: { removeAll: true } }],
          },
        }),
      ],
    },
    module: {
      rules: [
        {
          oneOf: [
            { test: /\.ts?$/, include: SOURCE_PATH, loader: "ts-loader" },
            { test: /\.pug$/, use: "pug3-loader" },
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
                    },
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
              exclude: [FONTS_PATH],
              type: "asset",
              parser: {
                dataUrlCondition: {
                  maxSize: 4 * 1024,
                },
              },
              generator: {
                filename: "images/[name][ext]",
              },
              use: [
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
              include: [ASSETS_PATH],
              type: "asset/resource",
              generator: {
                filename: "[path][name].[ext]",
              },
            },
          ],
        },
      ],
    },
    plugins: [
      IS_PROD && new CleanWebpackPlugin(),
      new WatchIgnorePlugin({ paths: [/\.js$/, /\.d\.ts$/] }),

      ...PAGES.map(
        (page) =>
          new HTMLWebpackPlugin(
            Object.assign(
              {},
              {
                template: path.join(PAGES_PATH, page),
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

      IS_PROD &&
        new MiniCssExtractPlugin({
          filename: "css/[name].css",
          chunkFilename: "css/[name].chunk.css",
        }),

      new EslintWebpackPlugin(),
    ].filter(Boolean) as Configuration["plugins"],
    performance: false,
  };
};
