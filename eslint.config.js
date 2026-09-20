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
			// Requires a rethrown error to carry its cause. On its own this rule is trivially
			// bypassed by an optional catch binding (`catch { throw new Error(...) }`), which it
			// cannot see — so it is paired with the restriction below.
			'preserve-caught-error': 'error',
			'no-restricted-syntax': [
				'error',
				{
					selector: 'CatchClause[param=null]',
					message:
						'Bind the caught error and propagate it with diagnostic() from src/errors/redaction.ts. If the catch is deliberate control flow that swallows the error, disable this rule on the line with a reason.',
				},
			],
		},
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
		},
	},
	{
		// Unit tests assert on redaction behaviour and deliberately construct unsafe errors.
		files: ['test/unit/**/*.ts'],
		rules: { 'no-restricted-syntax': 'off' },
	},
	prettier,
]
