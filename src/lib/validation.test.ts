import { describe, it, expect } from 'bun:test';
import { safeLocalPath } from './validation';

describe('safeLocalPath', () => {
	it('passes through genuine local paths', () => {
		expect(safeLocalPath('/dashboard')).toBe('/dashboard');
		expect(safeLocalPath('/')).toBe('/');
		expect(safeLocalPath('/join/abc?x=1')).toBe('/join/abc?x=1');
	});

	it('falls back for non-local or missing input', () => {
		expect(safeLocalPath(null)).toBe('/');
		expect(safeLocalPath(undefined)).toBe('/');
		expect(safeLocalPath('')).toBe('/');
		expect(safeLocalPath('relative/path')).toBe('/');
		expect(safeLocalPath('https://evil.com')).toBe('/');
	});

	it('rejects protocol-relative URLs', () => {
		expect(safeLocalPath('//evil.com')).toBe('/');
		expect(safeLocalPath('//evil.com/path')).toBe('/');
	});

	it('rejects backslash tricks (browsers treat \\ as /)', () => {
		expect(safeLocalPath('/\\evil.com')).toBe('/');
		expect(safeLocalPath('/\\\\evil.com')).toBe('/');
		expect(safeLocalPath('\\\\evil.com')).toBe('/');
		expect(safeLocalPath('/\\/evil.com')).toBe('/');
	});

	it('rejects leading control characters that browsers strip', () => {
		expect(safeLocalPath('/\t/evil.com')).toBe('/');
		expect(safeLocalPath('/\n//evil.com')).toBe('/');
	});

	it('uses the provided fallback only when it is itself local', () => {
		expect(safeLocalPath(null, '/home')).toBe('/home');
		expect(safeLocalPath('//evil.com', '//evil.com')).toBe('/');
	});
});
