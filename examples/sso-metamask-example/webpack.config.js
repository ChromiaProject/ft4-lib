import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode: "development",
  entry: "./client/src/main.ts",
  module: {
    rules: [{ test: /\.ts$/, use: "ts-loader", exclude: /node_modules/ }],
  },
  resolve: { extensions: [".ts", ".js"] },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  plugins: [new HtmlWebpackPlugin({ template: "./client/src/index.html" })],
  devServer: {
    static: path.resolve(__dirname, "dist"),
    port: 8080,
    host: "0.0.0.0",
    hot: true,
    watchFiles: ["client/src/**/*"],
  },
  devtool: "source-map",
};
