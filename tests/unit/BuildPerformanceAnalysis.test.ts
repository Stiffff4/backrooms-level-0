import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  analyzeBuildDirectory,
  formatBuildReport,
  loadBuildBudgets,
  type BuildBudgets,
} from '../../tools/analyze-build/analyze';

const temporaryDirectories: string[] = [];

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'threshold-build-analysis-'));
  temporaryDirectories.push(root);
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(
    join(root, 'index.html'),
    '<link rel="stylesheet" href="/threshold/assets/main.css"><script type="module" src="/threshold/assets/main.js"></script>',
  );
  await writeFile(
    join(root, 'assets', 'main.js'),
    'import{shared}from"./shared.js"; import("./lazy.js"); console.log(shared);',
  );
  await writeFile(join(root, 'assets', 'shared.js'), 'export const shared = true;');
  await writeFile(join(root, 'assets', 'lazy.js'), 'export const lazy = true;');
  await writeFile(join(root, 'assets', 'main.css'), 'body{background:url("./texture.png")}');
  const pngHeader = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(pngHeader);
  pngHeader.writeUInt32BE(16, 16);
  pngHeader.writeUInt32BE(8, 20);
  await writeFile(join(root, 'assets', 'texture.png'), pngHeader);
  await writeFile(join(root, 'assets', 'main.js.map'), 'x'.repeat(10_000));
  return root;
}

function budgets(overrides: Partial<BuildBudgets> = {}): BuildBudgets {
  return {
    maximumInitialTransferBytes: 1_000_000,
    maximumTotalTransferBytes: 1_000_000,
    maximumDecodedAssetBytes: 1_000_000,
    maximumEntryJavaScriptBytes: 1_000_000,
    maximumEntryJavaScriptGzipBytes: 1_000_000,
    maximumTotalJavaScriptBytes: 1_000_000,
    warningRatio: 0.85,
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('production build analysis', () => {
  it('follows the static entry graph and excludes lazy chunks and maps', async () => {
    const root = await createFixture();
    const report = await analyzeBuildDirectory(root, budgets());
    const byPath = new Map(
      report.artifacts.map((artifact) => [artifact.relativePath, artifact] as const),
    );

    expect(report.status).toBe('pass');
    expect(byPath.get('index.html')?.initial).toBe(true);
    expect(byPath.get('assets/main.js')?.initial).toBe(true);
    expect(byPath.get('assets/shared.js')?.initial).toBe(true);
    expect(byPath.get('assets/main.css')?.initial).toBe(true);
    expect(byPath.get('assets/texture.png')?.initial).toBe(true);
    expect(byPath.get('assets/lazy.js')?.initial).toBe(false);
    expect(byPath.get('assets/main.js.map')).toMatchObject({
      kind: 'source-map',
      transferBytes: 0,
    });
    expect(report.totals.transportFileCount).toBe(6);
    expect(report.totals.sourceMapBytes).toBe(10_000);
    expect(report.totals.decodedAssetBytes).toBe(Math.ceil(16 * 8 * 4 * (4 / 3)));
    expect(formatBuildReport(report)).toContain('Build performance: PASS');
  });

  it('warns near a ceiling and fails when a hard build budget is exceeded', async () => {
    const root = await createFixture();
    const baseline = await analyzeBuildDirectory(root, budgets());
    const entryBytes = baseline.totals.entryJavaScriptBytes;

    const warning = await analyzeBuildDirectory(
      root,
      budgets({ maximumEntryJavaScriptBytes: Math.ceil(entryBytes / 0.9) }),
    );
    expect(warning.status).toBe('warning');
    expect(warning.findings).toContainEqual(
      expect.objectContaining({ metric: 'entry-javascript-raw', severity: 'warning' }),
    );

    const failure = await analyzeBuildDirectory(
      root,
      budgets({ maximumEntryJavaScriptBytes: entryBytes - 1 }),
    );
    expect(failure.status).toBe('fail');
    expect(failure.findings).toContainEqual(
      expect.objectContaining({ metric: 'entry-javascript-raw', severity: 'error' }),
    );
  });

  it('loads the shared checked-in budget source', async () => {
    await expect(loadBuildBudgets()).resolves.toMatchObject({
      maximumInitialTransferBytes: 30 * 1_024 * 1_024,
      maximumTotalTransferBytes: 80 * 1_024 * 1_024,
      maximumDecodedAssetBytes: 250 * 1_024 * 1_024,
      maximumEntryJavaScriptBytes: 2.25 * 1_024 * 1_024,
      maximumEntryJavaScriptGzipBytes: 400 * 1_024,
      maximumTotalJavaScriptBytes: 3.25 * 1_024 * 1_024,
      warningRatio: 0.85,
    });
  });
});
