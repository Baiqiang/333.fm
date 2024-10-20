import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'no-console': 'off',
    'no-alert': 'off',
    'n/prefer-global/process': 'off',
    'vue/max-attributes-per-line': ['error', {
      singleline: {
        max: 6,
      },
      multiline: {
        max: 1,
      },
    }],
    'ts/consistent-type-imports': 'off',
    'regexp/no-super-linear-backtracking': 'off',
    'unused-imports/no-unused-vars': 'warn',
  },
})
