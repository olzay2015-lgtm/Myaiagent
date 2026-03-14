module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  parserOptions: {
    babelOptions: {
      presets: [require.resolve('next/babel')],
    },
  },
};
