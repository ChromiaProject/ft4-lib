module.exports = {
    "roots": [
        "<rootDir>/test"
    ],
    "transform": {
        "^.+\\.tsx?$": "ts-jest"
    },
    "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "node"
    ],
    "setupFilesAfterEnv": [
        "<rootDir>/jest.setup.js"
    ],
    // https://github.com/jestjs/jest/issues/11617
    // faster, but loses error messages
    // "workerThreads": true
    // "maxWorkers": 1,
};