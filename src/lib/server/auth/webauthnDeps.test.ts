import { test, expect } from 'bun:test';
import { dirname } from 'node:path';

// @simplewebauthn/server parses attestation certificates and EC2 signatures (every
// ES256 passkey login) with AsnParser from the @peculiar/asn1-schema it resolves,
// into schema classes from these packages. Each asn1-schema copy keeps its own
// schema registry, so when one of them resolves another copy, the parse throws
// "Cannot get schema for '<class>' target". Bun 1.4.4 wrote such a lock for
// @simplewebauthn/server 14.1.0, with a nested copy under @peculiar/asn1-android
// (#85). `bun update` of the package re-nests a newer copy; deleting the nested
// entry from bun.lock and running the pinned Bun's install removed it.
const SCHEMA_PACKAGES = [
	'@peculiar/asn1-android',
	'@peculiar/asn1-ecc',
	'@peculiar/asn1-rsa',
	'@peculiar/asn1-x509'
];

// Compare package.json paths: asn1-schema's entry file differs between its
// `main` (cjs) and `module` (es2015) fields.
const SCHEMA = '@peculiar/asn1-schema/package.json';
const serverDir = dirname(Bun.resolveSync('@simplewebauthn/server', import.meta.dir));
const serverSchema = Bun.resolveSync(SCHEMA, serverDir);

test.each(SCHEMA_PACKAGES)('%s resolves the same asn1-schema as @simplewebauthn/server', (pkg) => {
	const pkgDir = dirname(Bun.resolveSync(pkg, serverDir));
	expect(Bun.resolveSync(SCHEMA, pkgDir)).toBe(serverSchema);
});
