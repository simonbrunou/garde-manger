import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

// #67 keeps TypeScript 6 until Renovate's #43 passes CI on 7, which ships no compiler API. Code
// that loads the typescript package would keep #43 red, as a test nearly did on #113.
const TYPESCRIPT_API =
	'TypeScript 7 ships no compiler API (#67). Spawn node_modules/typescript/bin/tsc as scripts/e2e-tsconfig.test.ts does, and expect a non-zero exit rather than 2: TypeScript 7 exits 1 where 6 exits 2.';
const TYPESCRIPT_MODULE = '/^typescript(\\/|$)/';

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
			'no-restricted-imports': [
				'error',
				{
					paths: [{ name: 'typescript', message: TYPESCRIPT_API }],
					patterns: [{ group: ['typescript/*'], message: TYPESCRIPT_API }]
				}
			],
			// import(), import('typescript').X types, and require or createRequire(...) calls. A
			// specifier written as a template literal or a variable passes, and so does a require
			// bound to another name (const req = createRequire(...)). Resolving the package
			// (import.meta.resolve) loads nothing and passes too.
			'no-restricted-syntax': [
				'error',
				{
					selector: `ImportExpression[source.value=${TYPESCRIPT_MODULE}]`,
					message: TYPESCRIPT_API
				},
				{
					selector: `TSImportType[source.value=${TYPESCRIPT_MODULE}]`,
					message: TYPESCRIPT_API
				},
				{
					selector: `CallExpression:matches([callee.name='require'], [callee.callee.name='createRequire'])[arguments.0.value=${TYPESCRIPT_MODULE}]`,
					message: TYPESCRIPT_API
				}
			]
		}
	}
);
