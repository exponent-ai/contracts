module.exports = {
  extends: ["prettier"],
  plugins: ["prettier"],
  parserOptions: {
    ecmaVersion: 2017,
  },
  env: {
    es6: true,
  },
  globals: {
    ethers: true,
    require: true,
    hre: true,
    describe: true,
    it: true,
    after: true,
    before: true,
    module: true,
    process: true,
    console: true,
    beforeEach: true,
    task: true,
  },
  ignorePatterns: ["/coverage"],
  rules: {
    "prettier/prettier": "error",
  },
};
