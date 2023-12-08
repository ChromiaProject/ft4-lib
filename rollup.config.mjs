import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import inject from "@rollup/plugin-inject";
import alias from "@rollup/plugin-alias";
import { nodeResolve } from "@rollup/plugin-node-resolve";

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
    external: ['postchain-client'],
    plugins: [
      nodeResolve(),
      commonjs({transformMixedEsModules: true}),
      inject({ Buffer: ["buffer", "Buffer"] }),
      json(),
      alias({
        entries: [
          { find: "crypto", replacement: "crypto-browserify" },
          { find: "stream", replacement: "stream-browserify" },
        ],
      }),
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
    },
    external: ['postchain-client'],
    plugins: [
      commonjs(),
      inject({ Buffer: ["buffer", "Buffer"] }),
      json(),
      nodeResolve(),
      alias({
        entries: [
          { find: "crypto", replacement: "crypto-browserify" },
          { find: "stream", replacement: "stream-browserify" },
        ],
      }),
    ],
  },  //NODE
  {
    input: "./dist/index.js",
    output: {
      dir: "./dist/cjs",
      format: "cjs",
      name: "FT4 lib",
      sourcemap: true,
    },
    plugins: [
      commonjs(),
      json()
    ],
  },
];
