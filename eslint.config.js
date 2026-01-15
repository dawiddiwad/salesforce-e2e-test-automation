import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
	{ ignores: ['test-reports/**', 'test-results/**', 'node_modules/**', '.sfdx/**', '.sf/**'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['**/*.ts'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
		},
	},
]
