export function hashPassword(password: string): Promise<string> {
	return Bun.password.hash(password); // argon2id by default
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
	return Bun.password.verify(password, hash);
}
