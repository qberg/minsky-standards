#!/usr/bin/env node
// Loads every published subpath under plain node, the one resolver no dev tool masks.
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(repoRoot, "packages");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const targetsOf = (value) => {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(targetsOf);
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(targetsOf);
  }
  return [];
};

const subpathsOf = (exportsField) => {
  if (!exportsField) {
    return [];
  }
  if (typeof exportsField === "string" || Array.isArray(exportsField)) {
    return [{ subpath: ".", targets: targetsOf(exportsField) }];
  }
  const keys = Object.keys(exportsField);
  const isConditionMap = keys.every((key) => !key.startsWith("."));
  if (isConditionMap) {
    return [{ subpath: ".", targets: targetsOf(exportsField) }];
  }
  return keys.map((subpath) => ({
    subpath,
    targets: targetsOf(exportsField[subpath]),
  }));
};

const IMPORTABLE = /\.(js|mjs|cjs)$/;

const missingPeers = async (pkgDir, pkgJson) => {
  const peers = Object.keys(pkgJson.peerDependencies ?? {});
  const absent = [];
  for (const peer of peers) {
    const optional = pkgJson.peerDependenciesMeta?.[peer]?.optional === true;
    let found = false;
    let dir = pkgDir;
    while (dir.startsWith(repoRoot)) {
      if (existsSync(join(dir, "node_modules", peer, "package.json"))) {
        found = true;
        break;
      }
      dir = dirname(dir);
    }
    if (!found) {
      absent.push(optional ? `${peer} (optional)` : peer);
    }
  }
  return absent;
};

const checkTarget = async (pkgDir, subpath, target) => {
  const abs = join(pkgDir, target);
  if (!existsSync(abs)) {
    return { subpath, target, ok: false, reason: "target file is missing" };
  }
  if (!IMPORTABLE.test(target)) {
    return { subpath, target, ok: true, reason: "exists (not a module)" };
  }
  try {
    await import(pathToFileURL(abs).href);
    return { subpath, target, ok: true, reason: "imported" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { subpath, target, ok: false, reason: message.split("\n")[0] };
  }
};

const checkPackage = async (name) => {
  const pkgDir = join(packagesDir, name);
  const manifestPath = join(pkgDir, "package.json");
  if (!existsSync(manifestPath)) {
    return { name, findings: [], results: [], skippedNoManifest: true };
  }
  const pkgJson = await readJson(manifestPath);
  const findings = [];
  const absent = await missingPeers(pkgDir, pkgJson);
  const hardMissing = absent.filter((peer) => !peer.endsWith("(optional)"));
  if (hardMissing.length > 0) {
    findings.push(`peer dependencies not resolvable: ${hardMissing.join(", ")}`);
  }
  const entries = subpathsOf(pkgJson.exports);
  if (entries.length === 0) {
    findings.push("no exports map declared");
  }
  const results = [];
  for (const entry of entries) {
    if (entry.targets.length === 0) {
      results.push({
        subpath: entry.subpath,
        target: "-",
        ok: false,
        reason: "no resolvable target",
      });
      continue;
    }
    for (const target of entry.targets) {
      results.push(await checkTarget(pkgDir, entry.subpath, target));
    }
  }
  return {
    name: pkgJson.name ?? name,
    version: pkgJson.version ?? "?",
    dependencies: pkgJson.dependencies ?? {},
    findings,
    results,
  };
};

const run = async () => {
  const names = (await readdir(packagesDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  let failed = 0;
  let passed = 0;
  const redPackages = [];
  const workspaceDeps = [];

  for (const name of names) {
    const report = await checkPackage(name);
    if (report.skippedNoManifest) {
      process.stdout.write(`\n${name}\n  no package.json, not a package\n`);
      continue;
    }
    process.stdout.write(`\n${report.name}@${report.version}\n`);
    for (const finding of report.findings) {
      process.stdout.write(`  FINDING ${finding}\n`);
    }
    for (const [dep, range] of Object.entries(report.dependencies)) {
      if (String(range).startsWith("workspace:")) {
        workspaceDeps.push(`${report.name} -> ${dep}@${range}`);
      }
    }
    for (const result of report.results) {
      const mark = result.ok ? "ok  " : "FAIL";
      process.stdout.write(
        `  ${mark} ${result.subpath} -> ${result.target} (${result.reason})\n`
      );
      if (result.ok) {
        passed += 1;
      } else {
        failed += 1;
      }
    }
    const red = report.findings.length > 0 || report.results.some((r) => !r.ok);
    if (red) {
      redPackages.push(report.name);
    }
  }

  // pnpm rewrites workspace: to a real version on publish; npm pack ships it verbatim and no consumer can install it.
  if (workspaceDeps.length > 0) {
    process.stdout.write("\nPUBLISH WITH pnpm, NEVER npm. Workspace-protocol deps found:\n");
    for (const line of workspaceDeps) {
      process.stdout.write(`  ${line}\n`);
    }
  }

  const green = redPackages.length === 0;
  const summary = green
    ? `\nsmoke-exports: ${passed} subpath targets loaded under plain node, 0 failures\n`
    : `\nsmoke-exports: ${failed} of ${passed + failed} subpath targets failed; red packages: ${redPackages.join(", ")}\n`;
  process.stdout.write(summary);
  process.exitCode = green ? 0 : 1;
};

await run();
