/**
 * Pure, framework-free barcode utilities.
 *
 * No imports from `$app`, `$env`, the DOM, or `bun:sqlite` — this module is shared
 * by both browser islands and server code, so it must stay dependency-free.
 */

/** GTIN-13/8/12 mod-10 check digit, computed over the data digits (no check digit included). */
export function gtinCheckDigit(dataDigits: string): number {
	let sum = 0;
	for (let i = 0; i < dataDigits.length; i++) {
		const d = Number(dataDigits[dataDigits.length - 1 - i]);
		sum += d * (i % 2 === 0 ? 3 : 1);
	}
	return (10 - (sum % 10)) % 10;
}

/** True if `code` is all digits, length 8 or 13, and its last digit is the correct GTIN check digit. */
export function isValidBarcode(code: string): boolean {
	if (!/^\d+$/.test(code)) return false;
	if (code.length !== 8 && code.length !== 13) return false;
	const dataDigits = code.slice(0, -1);
	const check = Number(code[code.length - 1]);
	return gtinCheckDigit(dataDigits) === check;
}

/**
 * Expand an 8-digit UPC-E code to its 12-digit UPC-A form.
 * Returns null if the input is not 8 digits or the number system (first digit) is not 0/1.
 *
 * The 8 digits are `N D1 D2 D3 D4 D5 D6 C` (N = number system; C = check digit).
 */
function upcEToUpcA(upce: string): string | null {
	if (!/^\d{8}$/.test(upce)) return null;
	const n = upce[0];
	if (n !== '0' && n !== '1') return null;

	const d1 = upce[1];
	const d2 = upce[2];
	const d3 = upce[3];
	const d4 = upce[4];
	const d5 = upce[5];
	const d6 = upce[6];
	const c = upce[7];

	let upca: string;
	switch (d6) {
		case '0':
		case '1':
		case '2':
			upca = `${n}${d1}${d2}${d6}0000${d3}${d4}${d5}${c}`;
			break;
		case '3':
			upca = `${n}${d1}${d2}${d3}00000${d4}${d5}${c}`;
			break;
		case '4':
			upca = `${n}${d1}${d2}${d3}${d4}00000${d5}${c}`;
			break;
		default:
			// 5, 6, 7, 8, 9
			upca = `${n}${d1}${d2}${d3}${d4}${d5}0000${d6}${c}`;
			break;
	}
	return upca;
}

/**
 * Normalize a scanned/typed barcode to EAN-13 or EAN-8 (digits only).
 * - strip whitespace; reject if it contains non-digits
 * - UPC-A (12 digits) -> EAN-13 by prefixing '0'
 * - UPC-E (8 digits)  -> expand to UPC-A -> EAN-13
 * - EAN-13 (13) and EAN-8 (8, non-UPC-E) -> as-is
 * Returns the normalized string, or null if it cannot be a valid GTIN.
 * The returned value MUST pass isValidBarcode().
 */
export function normalizeBarcode(raw: string): string | null {
	const code = raw.trim();
	if (code.length === 0) return null;
	if (!/^\d+$/.test(code)) return null;

	switch (code.length) {
		case 12: {
			// UPC-A -> EAN-13 by prefixing '0'.
			const ean13 = `0${code}`;
			return isValidBarcode(ean13) ? ean13 : null;
		}
		case 8: {
			// RESIDUAL AMBIGUITY: an 8-digit, 0/1-prefixed code can be valid as BOTH a
			// UPC-E and an EAN-8 (the UPC-A check digit sometimes coincides with the
			// EAN-8 check). There is no context-free way to disambiguate. We
			// DELIBERATELY prefer the UPC-E reading for 0/1-prefixed codes (US small
			// packages overwhelmingly use UPC-E), expanding to EAN-13; only if that
			// expansion is not itself a valid GTIN do we fall back to EAN-8 as-is.
			if (code[0] === '0' || code[0] === '1') {
				const upca = upcEToUpcA(code);
				if (upca) {
					const ean13 = `0${upca}`;
					if (isValidBarcode(ean13)) return ean13;
				}
			}
			return isValidBarcode(code) ? code : null;
		}
		case 13: {
			// EAN-13 as-is.
			return isValidBarcode(code) ? code : null;
		}
		default:
			return null;
	}
}
