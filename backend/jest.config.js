// Configuración de Jest. Las pruebas de API usan una base MySQL real
// (autoventas_test) que se recrea desde db/init en cada archivo de pruebas.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/docs/**'],
  coverageReporters: ['text-summary', 'lcov'],
};
