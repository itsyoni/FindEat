import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  webPackage: path.join(root, "apps/web/package.json"),
  rootLock: path.join(root, "package-lock.json"),
  webLock: path.join(root, "apps/web/package-lock.json"),
};
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function nextVersion(current, release) {
  const match = current.match(semverPattern);
  if (!match) throw new Error(`Invalid current web version: ${current}`);
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (release === "major") return `${major + 1}.0.0`;
  if (release === "minor") return `${major}.${minor + 1}.0`;
  if (release === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown release type: ${release}`);
}

const [command = "check", requestedVersion] = process.argv.slice(2);
const [webPackage, rootLock, webLock] = await Promise.all([
  readJson(files.webPackage),
  readJson(files.rootLock),
  readJson(files.webLock),
]);
const current = webPackage.version;
if (typeof current !== "string" || !semverPattern.test(current)) {
  throw new Error(`Invalid apps/web/package.json version: ${current}`);
}

function versionMismatches() {
  return [
    rootLock.packages?.["apps/web"]?.version !== current
      ? `package-lock.json is ${rootLock.packages?.["apps/web"]?.version ?? "missing"}`
      : null,
    webLock.version !== current
      ? `apps/web/package-lock.json root is ${webLock.version ?? "missing"}`
      : null,
    webLock.packages?.[""]?.version !== current
      ? `apps/web/package-lock.json package is ${webLock.packages?.[""]?.version ?? "missing"}`
      : null,
  ].filter(Boolean);
}

if (command === "check") {
  const mismatches = versionMismatches();
  if (mismatches.length) {
    throw new Error(
      `Web version mismatch: package.json is ${current}; ${mismatches.join("; ")}`,
    );
  }
  console.log(`FindEat web version ${current} is synchronized.`);
  process.exit(0);
}

const next = command === "set" ? requestedVersion : nextVersion(current, command);
if (!next || !semverPattern.test(next)) {
  throw new Error(
    "Provide a version in major.minor.patch format, for example 1.2.0",
  );
}
if (next === current) throw new Error(`FindEat web is already at version ${current}`);

webPackage.version = next;
if (!rootLock.packages?.["apps/web"]) {
  throw new Error("apps/web is missing from package-lock.json");
}
rootLock.packages["apps/web"].version = next;
webLock.version = next;
if (!webLock.packages?.[""]) {
  throw new Error("root package is missing from apps/web/package-lock.json");
}
webLock.packages[""].version = next;

await Promise.all([
  writeFile(files.webPackage, `${JSON.stringify(webPackage, null, 2)}\n`),
  writeFile(files.rootLock, `${JSON.stringify(rootLock, null, 2)}\n`),
  writeFile(files.webLock, `${JSON.stringify(webLock, null, 2)}\n`),
]);

console.log(`FindEat web version updated: ${current} → ${next}`);
