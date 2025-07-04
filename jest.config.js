export default {
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
        "<rootDir>/jest.setup.ts",
    ],
    "testEnvironment": "<rootDir>/jest.test-environment.ts",
    "testPathIgnorePatterns": [
      "<rootDir>/test/__multichain__/"
    ],
    /*
     * https://github.com/jestjs/jest/issues/11617
     * commenting out all lines when tests pass works.
     * when you get errors which return BNs, jest crashes.
     * this is suggested, but doesn't work on my machine:
     */
    //"workerThreads": true
    /*
     * this makes it slower, but preserves error messages.
     * I removed it for the pipeline (no parallel tests):
     */
    //"maxWorkers": 1,
    'moduleNameMapper': {
        '^@ft4/(.*)$': '<rootDir>/client/lib/ft4/$1',
        '^@ft4-test/(.*)$': '<rootDir>/test/$1',
    }
};
