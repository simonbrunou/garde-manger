import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			// Allow underscore-prefixed parameters to signal intentionally unused args (e.g. _db, _event).
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			// Plain internal hrefs are fine here; resolve() ceremony isn't worth it for
			// grouped/dynamic routes at this scale. Every anchor in this app targets a
			// same-origin SvelteKit route — wrapping each in resolve() adds boilerplate
			// without meaningful benefit.
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		rules: {
			// #67 keeps TypeScript 6 until #43's CI passes on 7, and 7 has no JavaScript API (#113).
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'typescript',
							message:
								'TypeScript 7 has no JavaScript API (#67). Spawn node_modules/typescript/bin/tsc as scripts/check-tsconfig-coverage.ts does, and expect a non-zero exit rather than 2: TypeScript 7 exits 1 where 6 exits 2.'
						}
					]
				}
			]
		}
	}
);
