/**
 * @typedef {import('prettier-plugin-multiline-arrays').MultilineArrayOptions} MultilineOptions
 *
 * @typedef {import('prettier').Options} PrettierOptions
 * @type {PrettierOptions & MultilineOptions}
 */
export default {
  printWidth: 120,
  singleQuote: true,
  semi: false,
  // multilineArraysWrapThreshold: 3,
  plugins: ['prettier-plugin-multiline-arrays'],
}
