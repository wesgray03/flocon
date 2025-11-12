#!/usr/bin/env node
// Simple source analysis: list largest TS/TSX files and basic React hook counts
// Usage: node scripts/analyze-sizes.mjs [rootDir]
// Defaults to src

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.argv[2] || 'src';

/** @typedef {{
 *  file: string,
 *  size: number,
 *  lines: number,
 *  hooks: { useEffect: number, useState: number, useReducer: number, useMemo: number, useCallback: number },
 * }} FileStat */

const includeExt = new Set(['.ts', '.tsx']);

async function* walk(dir) {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip common build/output
      if (
        entry.name === 'node_modules' ||
        entry.name === '.next' ||
        entry.name === 'dist'
      )
        continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (!includeExt.has(ext)) continue;
      if (entry.name.endsWith('.d.ts')) continue;
      yield full;
    }
  }
}

/** @returns {Promise<FileStat>} */
async function analyzeFile(file) {
  const stat = await fsp.stat(file);
  const size = stat.size;
  let text;
  try {
    text = await fsp.readFile(file, 'utf8');
  } catch {
    text = '';
  }
  const lines = text ? text.split(/\r?\n/).length : 0;
  const hooks = {
    useEffect: (text.match(/\buseEffect\s*\(/g) || []).length,
    useState: (text.match(/\buseState\s*\(/g) || []).length,
    useReducer: (text.match(/\buseReducer\s*\(/g) || []).length,
    useMemo: (text.match(/\buseMemo\s*\(/g) || []).length,
    useCallback: (text.match(/\buseCallback\s*\(/g) || []).length,
  };
  return { file, size, lines, hooks };
}

function formatBytes(n) {
  const units = ['B', 'KB', 'MB'];
  let i = 0;
  let val = n;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

async function main() {
  const cwd = process.cwd();
  const root = path.isAbsolute(ROOT) ? ROOT : path.join(cwd, ROOT);
  if (!fs.existsSync(root)) {
    console.error(`Directory not found: ${root}`);
    process.exit(1);
  }

  const files = [];
  for await (const f of walk(root)) files.push(f);

  const stats = await Promise.all(files.map(analyzeFile));
  const bySize = [...stats].sort((a, b) => b.size - a.size);
  const byLines = [...stats].sort((a, b) => b.lines - a.lines);

  const topN = (arr, n) => arr.slice(0, Math.min(n, arr.length));

  const printTable = (rows, title) => {
    console.log(`\n=== ${title} ===`);
    console.log(
      'Size\tLines\tuseEffect\tuseState\tuseReducer\tuseMemo\tuseCallback\tFile'
    );
    for (const r of rows) {
      console.log(
        `${formatBytes(r.size)}\t${r.lines}\t${r.hooks.useEffect}\t${r.hooks.useState}\t${r.hooks.useReducer}\t${r.hooks.useMemo}\t${r.hooks.useCallback}\t${path.relative(cwd, r.file)}`
      );
    }
  };

  printTable(
    topN(bySize, 25),
    `Top ${Math.min(25, stats.length)} by size in ${path.relative(cwd, root)}`
  );
  printTable(
    topN(byLines, 25),
    `Top ${Math.min(25, stats.length)} by lines in ${path.relative(cwd, root)}`
  );

  // Aggregate: files that likely need splitting (heuristics)
  const candidates = stats
    .filter(
      (s) => s.lines >= 400 || s.hooks.useEffect >= 6 || s.hooks.useState >= 10
    )
    .sort((a, b) => b.lines - a.lines || b.size - a.size);
  if (candidates.length) {
    console.log(`\n=== Potential refactor candidates (heuristic) ===`);
    for (const r of candidates) {
      console.log(
        `${r.lines} lines, ${formatBytes(r.size)}, hooks e:${r.hooks.useEffect}/s:${r.hooks.useState}/r:${r.hooks.useReducer}/m:${r.hooks.useMemo}/c:${r.hooks.useCallback} \t${path.relative(cwd, r.file)}`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
