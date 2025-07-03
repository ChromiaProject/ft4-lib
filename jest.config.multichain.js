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
    "testEnvironment": "<rootDir>/jest.test-environment.ts",
    "setupFilesAfterEnv": [
        "<rootDir>/jest.setup.ts",
    ],
    'moduleNameMapper': {
        '^@ft4/(.*)$': ['<rootDir>/client/lib/ft4/$1'],
        '^@ft4-test/(.*)$': ['<rootDir>/test/$1'],
    }
};
