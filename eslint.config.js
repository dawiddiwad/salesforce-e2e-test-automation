import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier/flat'

export default [
	{ ignores: ['test-reports/**', 'test-results/**', 'node_modules/**', '.sfdx/**', '.sf/**'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['**/*.ts'],
		rules: {
			'preserve-caught-error': 'error',
		},
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
		},
	},
	prettier,
]
