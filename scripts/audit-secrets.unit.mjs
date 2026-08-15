import assert from "node:assert/strict";
import { sourceContainsPrivateKeyMaterial } from "./audit-secrets.mjs";

const dummyAbc = `-----BEGIN PRIVATE KEY-----
ABC
-----END PRIVATE KEY-----`;

const parserMarker = ".replace(/-----BEGIN PRIVATE KEY-----/g, '')";

const plausible =
  "-----BEGIN PRIVATE KEY-----\n" +
  "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7veryreallookingprivatekeymaterialbase64paddingXX\n" +
  "-----END PRIVATE KEY-----";

const rsa =
  "-----BEGIN RSA PRIVATE KEY-----\n" +
  "MIIEowIBAAKCAQEAabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLmn\n" +
  "-----END RSA PRIVATE KEY-----";

const ec =
  "-----BEGIN EC PRIVATE KEY-----\n" +
  "MHcCAQEEIOabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLmnopqrst\n" +
  "-----END EC PRIVATE KEY-----";

const openssh =
  "-----BEGIN OPENSSH PRIVATE KEY-----\n" +
  "b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAAAAAAAAAAAAAAAAAAAAABAAAAMwAAAAtzc2gtZW\n" +
  "-----END OPENSSH PRIVATE KEY-----";

assert.equal(sourceContainsPrivateKeyMaterial(dummyAbc), false, "dummy ABC fixture must pass");
assert.equal(sourceContainsPrivateKeyMaterial(parserMarker), false, "parser PEM marker must pass");
assert.equal(sourceContainsPrivateKeyMaterial(plausible), true, "realistic private key must fail");
assert.equal(sourceContainsPrivateKeyMaterial(rsa), true, "RSA private key must fail");
assert.equal(sourceContainsPrivateKeyMaterial(ec), true, "EC private key must fail");
assert.equal(sourceContainsPrivateKeyMaterial(openssh), true, "OpenSSH private key must fail");

console.log("audit-secrets.unit.mjs passed");
