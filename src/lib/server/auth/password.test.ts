import { test, expect } from 'bun:test';
import { hashPassword, verifyPassword } from './password';

test('hashPassword returns a string different from the input', async () => {
	const hash = await hashPassword('correct horse');
	expect(typeof hash).toBe('string');
	expect(hash).not.toBe('correct horse');
});

test('verifyPassword returns true for the correct password', async () => {
	const hash = await hashPassword('correct horse');
	expect(await verifyPassword('correct horse', hash)).toBe(true);
});

test('verifyPassword returns false for a wrong password', async () => {
	const hash = await hashPassword('correct horse');
	expect(await verifyPassword('wrong', hash)).toBe(false);
});
