import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import inject from "@rollup/plugin-inject";
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import nodeResolve from "@rollup/plugin-node-resolve";
import alias from "@rollup/plugin-alias";
import { cwd } from "process";
import path from "path";

const applicationRoot = path.resolve(cwd(), 'client', 'lib', 'ft4')

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
          { find: /^\/ft4\/(.*)/, replacement: 'client/lib/ft4/$1' }
        ]
      }),
      nodeResolve(),
      commonjs({transformMixedEsModules: true}),
      peerDepsExternal(),
      inject({ Buffer: ["buffer", "Buffer"] }),
      json(),
      // alias({
      //   // applicationRoot: `${cwd()}/client/lib`,
      //   entries: [
      //     { find: "crypto", replacement: "crypto-browserify" },
      //     { find: "stream", replacement: "stream-browserify" },
      //   ],
      // }),
    ],
  },
  //UMD
  // {
  //   input: "./dist/index.js",
  //   output: {
  //     dir: "./dist/umd",
  //     format: "umd",
  //     name: "FT4 lib",
  //     sourcemap: true,
  //   },
  //   plugins: [
  //     // nodeResolve({ preferBuiltins: false }),
  //     commonjs({ transformMixedEsModules: true }),
  //     peerDepsExternal(),
  //     inject({ Buffer: ["buffer", "Buffer"] }),
  //     json(),
  //     alias({
  //       // applicationRoot: `${cwd()}/client/lib`,
  //       entries: [
  //         { find: "crypto", replacement: "crypto-browserify" },
  //         { find: "stream", replacement: "stream-browserify" },
  //       ],
  //     }),
  //   ],
  // },  //NODE
  // {
  //   input: "./dist/index.js",
  //   output: {
  //     dir: "./dist/cjs",
  //     format: "cjs",
  //     name: "FT4 lib",
  //     sourcemap: true,
  //   },
  //   plugins: [
  //     commonjs(),
  //     json()
  //   ],
  // },
];
