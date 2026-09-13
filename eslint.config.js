import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		// Les regles de AGENTS.md section 1, rendues executables.
		rules: {
			// 1.3 « If you need more than 3 levels of indentation, you're screwed. »
			'max-depth': ['error', 3],
			complexity: ['warn', 12],
			'max-nested-callbacks': ['error', 3],

			// 1.5 Chercher avant d'ecrire : le code mort masque les doublons.
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
			],

			// 3.1 La ligne de base est zero : un `any` est un bug deguise.
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ prefer: 'type-imports', fixStyle: 'inline-type-imports' }
			],

			eqeqeq: ['error', 'always'],
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'prefer-const': 'error',
			'no-var': 'error',
			'object-shorthand': 'error'
		}
	},
	{
		// Les tests decrivent des cas limites : la profondeur y est structurelle.
		files: ['**/*.{test,spec}.ts'],
		rules: { 'max-nested-callbacks': 'off' }
	},
	{
		ignores: [
			'.svelte-kit/',
			'build/',
			'node_modules/',
			'coverage/',
			'src/lib/server/prisma-client/',
			'static/'
		]
	}
);
