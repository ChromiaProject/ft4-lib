import { cwd } from "process";
import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import inject from "@rollup/plugin-inject";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

export default [
  //ESM
  {
    input: "./dist/index.js",
    output: {
      dir: "./dist/esm",
      format: "es",
      name: "FT4 lib",
      sourcemap: true,
    },
    plugins: [
      alias({
        entries: [
          { find: /^@ft4\/(.*)/, replacement: `${cwd()}/dist/$1` }
        ]
      }),
      nodeResolve(),
      commonjs({ transformMixedEsModules: true }),
      peerDepsExternal(),
      json(),
    ],
  },
  //UMD
  {
    input: "./dist/index.js",
    output: {
      dir: "./dist/umd",
      format: "umd",
      name: "FT4 lib",
      sourcemap: true,
      globals: {
        buffer: 'buffer',
        'postchain-client': 'postchain-client',
      }
    },
    plugins: [
      alias({
        entries: [
          { find: /^@ft4\/(.*)/, replacement: `${cwd()}/dist/$1` }
        ]
      }),
      peerDepsExternal(),
      nodeResolve({ browser: true }),
      commonjs({ transformMixedEsModules: true }),
      json(),
    ],
  },  
  //NODE
  {
    input: "./dist/index.js",
    output: {
      dir: "./dist/cjs",
      format: "cjs",
      name: "FT4 lib",
      sourcemap: true,
    },
    plugins: [
      alias({
        entries: [
          { find: /^@ft4\/(.*)/, replacement: `${cwd()}/dist/$1` }
        ]
      }),
      nodeResolve({ preferBuiltins: true }),
      commonjs({ transformMixedEsModules: false }),
      peerDepsExternal(),
      json()
    ],
  },
];
