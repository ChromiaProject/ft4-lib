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
        "<rootDir>/jest.setup.js",
        "<rootDir>/test/setupMocks.ts"
    ],
    'moduleNameMapper': {
        '^@ft4/(.*)$': ['<rootDir>/client/lib/ft4/$1', '<rootDir>/test/$1']
    }
};
