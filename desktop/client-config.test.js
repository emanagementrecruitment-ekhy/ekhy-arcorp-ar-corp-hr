const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveClient, slugify, DEFAULT_CLIENT } = require("./client-config");

test("generates every desktop identifier from the client name", () => {
  const c = resolveClient({
    name: "Bintang Management",
    serverUrl: "https://bintang-management-hr-production.up.railway.app/",
  });
  assert.deepEqual(c, {
    name: "Bintang Management",
    serverUrl: "https://bintang-management-hr-production.up.railway.app",
    slug: "bintang-management",
    productName: "Bintang Management Desktop",
    appId: "id.bintangmanagement.desktop",
    windowTitle: "Bintang Management · E-Management",
    documentsFolder: "Bintang Management",
    installerName: "Bintang-Management-Desktop-Setup.exe",
  });
});

test("empty input keeps the existing AR Corp identity", () => {
  const c = resolveClient({ name: "  ", serverUrl: "" });
  assert.equal(c.productName, "AR Corp Desktop");
  assert.equal(c.windowTitle, "AR Corp · E-Management");
  assert.equal(c.serverUrl, DEFAULT_CLIENT.serverUrl);
  assert.equal(c.slug, "ar-corp");
  assert.equal(c.appId, "id.arcorp.desktop");
  assert.equal(c.installerName, "AR-Corp-Desktop-Setup.exe");
});

test("slug strips accents and punctuation", () => {
  assert.equal(slugify("Café & Co. Ltd"), "cafe-co-ltd");
});

test("rejects names with no usable letters and non-https servers", () => {
  assert.throws(() => resolveClient({ name: "!!!" }), /slug/);
  assert.throws(() => resolveClient({ name: "X", serverUrl: "http://insecure.example" }), /https/);
});
