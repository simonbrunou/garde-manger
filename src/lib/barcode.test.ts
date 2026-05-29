import { test, expect, describe } from 'bun:test';
import { gtinCheckDigit, isValidBarcode, normalizeBarcode } from './barcode';

describe('gtinCheckDigit', () => {
	test('known EAN-13 (Nutella): data 301762042200 -> 3', () => {
		expect(gtinCheckDigit('301762042200')).toBe(3);
	});

	test('known UPC-A data (11 digits) is consistent with isValidBarcode', () => {
		const data = '03600029145'; // 11 data digits
		const check = gtinCheckDigit(data);
		const upca = `${data}${check}`;
		expect(isValidBarcode(`0${upca}`)).toBe(true);
	});

	test('known EAN-8 data (7 digits) is consistent', () => {
		const data = '4006381'; // 7 data digits
		const check = gtinCheckDigit(data);
		expect(isValidBarcode(`${data}${check}`)).toBe(true);
	});
});

describe('isValidBarcode', () => {
	test('accepts valid EAN-13', () => {
		expect(isValidBarcode('3017620422003')).toBe(true);
	});

	test('rejects wrong check digit', () => {
		expect(isValidBarcode('3017620422000')).toBe(false);
	});

	test('rejects non-digit characters', () => {
		expect(isValidBarcode('30176abc')).toBe(false);
	});

	test('rejects wrong lengths (11 and 14 digits)', () => {
		expect(isValidBarcode('30176204220')).toBe(false); // 11
		expect(isValidBarcode('30176204220033')).toBe(false); // 14
	});

	test('rejects empty string', () => {
		expect(isValidBarcode('')).toBe(false);
	});
});

describe('normalizeBarcode — UPC-A', () => {
	test('12-digit UPC-A -> 13-digit EAN with leading 0, passes isValidBarcode', () => {
		// Construct a self-consistent UPC-A: 11 data digits + computed check digit.
		const data = '03600029145';
		const check = gtinCheckDigit(data);
		const upca = `${data}${check}`; // 12 digits
		expect(upca).toHaveLength(12);

		const result = normalizeBarcode(upca);
		expect(result).toBe(`0${upca}`);
		expect(result).not.toBeNull();
		expect(isValidBarcode(result as string)).toBe(true);
	});

	test('invalid 12-digit UPC-A -> null', () => {
		const data = '03600029145';
		const check = gtinCheckDigit(data);
		const wrong = (check + 1) % 10;
		const badUpca = `${data}${wrong}`;
		expect(normalizeBarcode(badUpca)).toBeNull();
	});
});

describe('normalizeBarcode — UPC-E (every D6 branch, self-consistent)', () => {
	// Build a UPC-E `N D1 D2 D3 D4 D5 D6 C` by expanding to UPC-A and computing the
	// correct check digit C from that UPC-A. Asserts the round-trip is valid.
	function makeUpce(
		n: '0' | '1',
		d1: string,
		d2: string,
		d3: string,
		d4: string,
		d5: string,
		d6: string
	): { upce: string; expectedEan13: string } {
		let upcaBody: string; // 11 chars: N + 10 middle digits (no check)
		switch (d6) {
			case '0':
			case '1':
			case '2':
				upcaBody = `${n}${d1}${d2}${d6}0000${d3}${d4}${d5}`;
				break;
			case '3':
				upcaBody = `${n}${d1}${d2}${d3}00000${d4}${d5}`;
				break;
			case '4':
				upcaBody = `${n}${d1}${d2}${d3}${d4}00000${d5}`;
				break;
			default:
				upcaBody = `${n}${d1}${d2}${d3}${d4}${d5}0000${d6}`;
				break;
		}
		const check = gtinCheckDigit(upcaBody); // C == UPC-A check == UPC-E check
		const upca = `${upcaBody}${check}`;
		const upce = `${n}${d1}${d2}${d3}${d4}${d5}${d6}${check}`;
		return { upce, expectedEan13: `0${upca}` };
	}

	const branches: Array<{ name: string; d6: string }> = [
		{ name: 'D6 = 0', d6: '0' },
		{ name: 'D6 = 1', d6: '1' },
		{ name: 'D6 = 2', d6: '2' },
		{ name: 'D6 = 3', d6: '3' },
		{ name: 'D6 = 4', d6: '4' },
		{ name: 'D6 = 5', d6: '5' },
		{ name: 'D6 = 6', d6: '6' },
		{ name: 'D6 = 7', d6: '7' },
		{ name: 'D6 = 8', d6: '8' },
		{ name: 'D6 = 9', d6: '9' }
	];

	for (const { name, d6 } of branches) {
		test(`expands and normalizes correctly (${name})`, () => {
			const { upce, expectedEan13 } = makeUpce('0', '1', '2', '3', '4', '5', d6);
			expect(upce).toHaveLength(8);
			expect(isValidBarcode(expectedEan13)).toBe(true);

			const result = normalizeBarcode(upce);
			expect(result).toBe(expectedEan13);
			expect(isValidBarcode(result as string)).toBe(true);
		});
	}

	test('also works with number system N = 1', () => {
		const { upce, expectedEan13 } = makeUpce('1', '2', '3', '4', '5', '6', '7');
		const result = normalizeBarcode(upce);
		expect(result).toBe(expectedEan13);
		expect(isValidBarcode(result as string)).toBe(true);
	});
});

describe('normalizeBarcode — EAN-8 pass-through', () => {
	test('valid EAN-8 with first digit not 0/1 normalizes to itself', () => {
		// First digit 4 so it is never interpreted as UPC-E.
		const data = '4006381'; // 7 data digits, leading 4
		const check = gtinCheckDigit(data);
		const ean8 = `${data}${check}`; // 8 digits
		expect(ean8).toHaveLength(8);
		expect(ean8[0]).toBe('4');

		const result = normalizeBarcode(ean8);
		expect(result).toBe(ean8);
		expect(isValidBarcode(result as string)).toBe(true);
	});

	test('invalid 8-digit code (bad check, first digit not 0/1) -> null', () => {
		const data = '4006381';
		const check = gtinCheckDigit(data);
		const wrong = (check + 1) % 10;
		expect(normalizeBarcode(`${data}${wrong}`)).toBeNull();
	});
});

describe('normalizeBarcode — EAN-13 pass-through', () => {
	test('valid EAN-13 returns as-is', () => {
		expect(normalizeBarcode('3017620422003')).toBe('3017620422003');
	});

	test('whitespace is trimmed', () => {
		expect(normalizeBarcode('  3017620422003  ')).toBe('3017620422003');
	});

	test('invalid EAN-13 -> null', () => {
		expect(normalizeBarcode('3017620422000')).toBeNull();
	});
});

describe('normalizeBarcode — garbage', () => {
	test("'abc' -> null", () => {
		expect(normalizeBarcode('abc')).toBeNull();
	});

	test("'' -> null", () => {
		expect(normalizeBarcode('')).toBeNull();
	});

	test("'12345' -> null", () => {
		expect(normalizeBarcode('12345')).toBeNull();
	});
});
