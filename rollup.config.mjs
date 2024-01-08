import { cwd } from "process";
import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import terser from "@rollup/plugin-terser";
import pkg from "./package.json" with { type: "json"};

const input = "./dist/index.js";

export default [
  //ESM
  {
    input,
    output: {
      file: pkg.exports.browser,
      format: "es",
      name: "FT4 lib",
      sourcemap: true,
    },
    plugins: [
      nodeResolve({ browser: true }),
      commonjs({ transformMixedEsModules: true }),
      peerDepsExternal(),
      json(),
      terser(),
    ],
  },
  //UMD
  {
    input,
    output: {
      format: "umd",
      file: pkg.exports.script,
      name: "FT4 lib",
      sourcemap: true,
      globals: {
        buffer: 'buffer',
        'postchain-client': 'postchain-client',
      }
    },
    plugins: [
      peerDepsExternal(),
      nodeResolve({ browser: true }),
      commonjs({ transformMixedEsModules: true }),
      json(),
      terser(),
    ],
  },  
  //NODE
  {
    input,
    output: {
      file: pkg.exports.require,
      format: "cjs",
      name: "FT4 lib",
      sourcemap: true,
    },
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs({ transformMixedEsModules: false }),
      peerDepsExternal(),
      json(),
    ],
  },
];
