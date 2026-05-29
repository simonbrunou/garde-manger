export function hashPassword(password: string): Promise<string> {
	return Bun.password.hash(password); // argon2id by default
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	try {
		return await Bun.password.verify(password, hash);
	} catch {
		return false; // malformed/legacy hash → treat as a failed verification, not a crash
	}
}
