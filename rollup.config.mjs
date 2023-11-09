import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import inject from "@rollup/plugin-inject";
import alias from "@rollup/plugin-alias";
import resolve from "@rollup/plugin-node-resolve";

export default [
  //ESM
  {
    input: "./dist/client/lib/ft4/index.js",
    output: {
      dir: "./dist/client/lib/ft4/esm",
      format: "es",
      name: "FT4 lib",
      sourcemap: true,
    },
    plugins: [
      resolve({ browser: true }),
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
  //NODE
  {
    input: "./dist/client/lib/ft4/index.js",
    output: {
      dir: "./dist/client/lib/ft4/cjs",
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
