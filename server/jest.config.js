/**
 * 测试配置（issue #43）：两个 project
 * - unit：src 下的 *.spec.ts（service / store 单元测试）
 * - e2e ：test 下的 *.e2e-spec.ts（HTTP 冒烟，file 模式 + 临时 DB_FILE，不依赖 PG）
 *
 * node_modules 里的 ESM-only 依赖（uuid@14 / @nestjs 12 等）经 babel-jest 转 CJS，
 * 故 transformIgnorePatterns 置空放行 node_modules 转换。
 */
const tsJest = { tsconfig: '<rootDir>/tsconfig.json' };
// 直接在 transform 选项里传 preset（而非依赖 babel.config.js），
// 以绕过 Babel 不对 node_modules 应用 root config 的限制。
const babelJest = [
  'babel-jest',
  {
    presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
    // preset-env 不处理 import.meta，@nestjs/common 的 load-package.util.js 用到，需单独降级
    plugins: ['babel-plugin-transform-import-meta'],
  },
];
const transform = {
  '^.+\\.ts$': ['ts-jest', tsJest],
  '^.+\\.m?js$': babelJest,
};

module.exports = {
  rootDir: __dirname,
  projects: [
    {
      displayName: 'unit',
      rootDir: __dirname,
      testEnvironment: 'node',
      testRegex: 'src/.*\\.spec\\.ts$',
      transform,
      transformIgnorePatterns: [],
      moduleFileExtensions: ['ts', 'js', 'mjs', 'json'],
    },
    {
      displayName: 'e2e',
      rootDir: __dirname,
      testEnvironment: 'node',
      testRegex: 'test/.*\\.e2e-spec\\.ts$',
      transform,
      transformIgnorePatterns: [],
      moduleFileExtensions: ['ts', 'js', 'mjs', 'json'],
    },
  ],
};
