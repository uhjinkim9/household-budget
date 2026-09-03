const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createPkceChallenge,
  hasAudience,
  safeAppReturnUrl,
} = require("../dist/auth/oidc-security.js");

test("PKCE S256 challenge follows RFC 7636 example", () => {
  assert.equal(
    createPkceChallenge(
      "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    ),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

test("return URL only accepts an application-relative path", () => {
  assert.equal(safeAppReturnUrl("/transactions?type=VARIABLE"), "/transactions?type=VARIABLE");
  assert.equal(safeAppReturnUrl("https://evil.example"), "/home");
  assert.equal(safeAppReturnUrl("//evil.example"), "/home");
});

test("audience accepts string and array claims", () => {
  assert.equal(hasAudience("mercury-api", "mercury-api"), true);
  assert.equal(hasAudience(["account", "mercury-api"], "mercury-api"), true);
  assert.equal(hasAudience(["account"], "mercury-api"), false);
});
