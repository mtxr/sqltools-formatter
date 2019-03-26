module.exports = {
  // preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['**/*.ts', '**/*.js'],
  coverageDirectory: '<rootDir>/../../coverage/formatter',
  coveragePathIgnorePatterns: ['/node_modules/', '/coverage/'],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  roots: ['test'],
  testRegex: ['.*Test\.(js|ts)'],
};
