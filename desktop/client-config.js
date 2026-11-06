// Per-client identity of the desktop app, generated from the client's name so a
// white-label build never needs hand edits. build-desktop.sh writes the result to
// desktop/client.json (bundled into the installer); main.js/config.js read it back.
// Without client.json (e.g. `npm start` in a dev checkout) the AR Corp defaults apply.

const DEFAULT_CLIENT = {
  name: "AR Corp",
  serverUrl: "https://ekhy-arcorp-ar-corp-hr-production.up.railway.app",
};

/** "Bintang Management" -> "bintang-management" (ASCII letters/digits only). */
function slugify(name) {
  return String(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Derives every client-visible desktop identifier from the client name.
 * @param {{ name?: string, serverUrl?: string }} [input]
 */
function resolveClient(input = {}) {
  const name = (input.name || "").trim() || DEFAULT_CLIENT.name;
  const serverUrl = ((input.serverUrl || "").trim() || DEFAULT_CLIENT.serverUrl).replace(/\/+$/, "");
  const slug = slugify(name);
  if (!slug) throw new Error(`Nama client "${name}" tidak menghasilkan slug yang valid.`);
  if (!/^https:\/\/[^\s/]+/.test(serverUrl)) throw new Error(`Alamat server harus https://…, didapat "${serverUrl}".`);

  const productName = `${name} Desktop`;
  return {
    name,
    serverUrl,
    slug,
    productName,
    // Unique per client so two clients' apps can sit side by side on one PC.
    appId: `id.${slug.replace(/-/g, "")}.desktop`,
    windowTitle: `${name} · E-Management`,
    // Folder under Documents where payslip PDFs are filed.
    documentsFolder: name,
    installerName: `${productName.replace(/\s+/g, "-")}-Setup.exe`,
  };
}

/** Reads desktop/client.json written at build time; falls back to the defaults. */
function loadClient() {
  try {
    return resolveClient(require("./client.json"));
  } catch {
    return resolveClient();
  }
}

module.exports = { DEFAULT_CLIENT, slugify, resolveClient, loadClient };

// CLI used by build-desktop.sh and the workflow:
//   node client-config.js <name> <serverUrl>  -> prints the resolved JSON
if (require.main === module) {
  process.stdout.write(JSON.stringify(resolveClient({ name: process.argv[2], serverUrl: process.argv[3] }), null, 2) + "\n");
}
