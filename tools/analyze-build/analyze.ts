import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, posix, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

export type BuildArtifactKind =
  | 'html'
  | 'javascript'
  | 'stylesheet'
  | 'image'
  | 'audio'
  | 'font'
  | 'data'
  | 'source-map'
  | 'other';

export interface BuildBudgets {
  readonly maximumInitialTransferBytes: number;
  readonly maximumTotalTransferBytes: number;
  readonly maximumDecodedAssetBytes: number;
  readonly maximumEntryJavaScriptBytes: number;
  readonly maximumEntryJavaScriptGzipBytes: number;
  readonly maximumTotalJavaScriptBytes: number;
  readonly warningRatio: number;
}

export interface BuildArtifactMeasurement {
  readonly relativePath: string;
  readonly kind: BuildArtifactKind;
  readonly rawBytes: number;
  readonly transferBytes: number;
  readonly decodedAssetBytes: number;
  readonly initial: boolean;
}

export interface BuildBudgetFinding {
  readonly metric: string;
  readonly severity: 'warning' | 'error';
  readonly observed: number;
  readonly budget: number;
  readonly message: string;
}

export interface BuildAnalysisReport {
  readonly generatedAt: string;
  readonly rootDirectory: string;
  readonly status: 'pass' | 'warning' | 'fail';
  readonly totals: {
    readonly fileCount: number;
    readonly transportFileCount: number;
    readonly initialRawBytes: number;
    readonly initialTransferBytes: number;
    readonly totalRawBytes: number;
    readonly totalTransferBytes: number;
    readonly totalJavaScriptBytes: number;
    readonly totalJavaScriptGzipBytes: number;
    readonly entryJavaScriptBytes: number;
    readonly entryJavaScriptGzipBytes: number;
    readonly decodedAssetBytes: number;
    readonly sourceMapBytes: number;
  };
  readonly budgets: BuildBudgets;
  readonly findings: readonly BuildBudgetFinding[];
  readonly artifacts: readonly BuildArtifactMeasurement[];
}

interface MutableArtifactMeasurement {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly kind: BuildArtifactKind;
  readonly rawBytes: number;
  readonly transferBytes: number;
  readonly decodedAssetBytes: number;
}

interface CliOptions {
  readonly directory: string;
  readonly json: boolean;
  readonly failOnWarning: boolean;
  readonly reportPath?: string;
}

const COMPRESSIBLE_EXTENSIONS = new Set([
  '.css',
  '.csv',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.svg',
  '.txt',
  '.wasm',
  '.xml',
]);
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const AUDIO_EXTENSIONS = new Set(['.aac', '.flac', '.m4a', '.mp3', '.ogg', '.wav']);
const FONT_EXTENSIONS = new Set(['.eot', '.otf', '.ttf', '.woff', '.woff2']);

function normalizeRelativePath(rootDirectory: string, absolutePath: string): string {
  return relative(rootDirectory, absolutePath).replaceAll('\\', '/');
}

function classifyArtifact(relativePath: string): BuildArtifactKind {
  if (relativePath.endsWith('.map')) {
    return 'source-map';
  }
  const extension = extname(relativePath).toLowerCase();
  if (extension === '.html') {
    return 'html';
  }
  if (extension === '.js' || extension === '.mjs') {
    return 'javascript';
  }
  if (extension === '.css') {
    return 'stylesheet';
  }
  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }
  if (AUDIO_EXTENSIONS.has(extension)) {
    return 'audio';
  }
  if (FONT_EXTENSIONS.has(extension)) {
    return 'font';
  }
  if (extension === '.json' || extension === '.txt' || extension === '.xml') {
    return 'data';
  }
  return 'other';
}

function estimateDecodedAssetBytes(relativePath: string, bytes: Buffer): number {
  const extension = extname(relativePath).toLowerCase();
  if (
    extension === '.png' &&
    bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    // RGBA8 plus the conventional one-third mip-chain overhead.
    return Math.ceil(width * height * 4 * (4 / 3));
  }
  if (IMAGE_EXTENSIONS.has(extension) || AUDIO_EXTENSIONS.has(extension)) {
    // Unknown compressed formats retain a conservative floor rather than being
    // silently omitted from the decoded-assets report.
    return bytes.length * 4;
  }
  return 0;
}

async function collectFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((first, second) => first.name.localeCompare(second.name));
  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await collectFiles(entryPath)));
    } else if (entry.isFile()) {
      result.push(entryPath);
    }
  }
  return result;
}

function extractReferences(kind: BuildArtifactKind, text: string): readonly string[] {
  const references = new Set<string>();
  const collect = (expression: RegExp): void => {
    for (const match of text.matchAll(expression)) {
      const value = match[1]?.trim();
      if (value) {
        references.add(value);
      }
    }
  };

  if (kind === 'html') {
    collect(/(?:src|href)\s*=\s*["']([^"']+)["']/gi);
  } else if (kind === 'javascript') {
    collect(
      /\b(?:import|export)\s*(?:\{[^}]*\}|\*\s+as\s+[\w$]+|[\w$]+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+[\w$]+))?)\s*from\s*["']([^"']+)["']/g,
    );
    collect(/(?:import|export)\s+(?:[^"']*?\sfrom\s*)?["']([^"']+)["']/g);
    collect(/\bimport\s*["']([^"']+)["']/g);
  } else if (kind === 'stylesheet') {
    collect(/@import\s+(?:url\()?\s*["']?([^"')\s;]+)["']?\s*\)?/gi);
    collect(/url\(\s*["']?([^"')]+)["']?\s*\)/gi);
  }
  return [...references];
}

function resolveReference(
  fromPath: string,
  rawReference: string,
  knownPaths: ReadonlySet<string>,
): string | null {
  if (/^(?:data:|https?:|blob:|#)/i.test(rawReference)) {
    return null;
  }
  let cleanReference: string;
  try {
    cleanReference = decodeURIComponent(rawReference.split(/[?#]/, 1)[0] ?? '');
  } catch {
    return null;
  }
  if (!cleanReference) {
    return null;
  }

  const normalized = cleanReference.startsWith('/')
    ? posix.normalize(cleanReference.slice(1))
    : posix.normalize(posix.join(posix.dirname(fromPath), cleanReference));
  if (knownPaths.has(normalized)) {
    return normalized;
  }

  // A configurable Vite base may prefix absolute references with one or more
  // path segments that do not exist inside dist.
  const segments = normalized.split('/');
  for (let index = 1; index < segments.length; index += 1) {
    const candidate = segments.slice(index).join('/');
    if (knownPaths.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function findInitialPaths(
  artifacts: readonly MutableArtifactMeasurement[],
): Promise<ReadonlySet<string>> {
  const knownPaths = new Set(artifacts.map((artifact) => artifact.relativePath));
  const entryPath = knownPaths.has('index.html')
    ? 'index.html'
    : artifacts.find((artifact) => artifact.kind === 'html')?.relativePath;
  if (entryPath === undefined) {
    throw new Error('The production build does not contain an HTML entry point.');
  }

  const artifactsByPath = new Map(
    artifacts.map((artifact) => [artifact.relativePath, artifact] as const),
  );
  const initialPaths = new Set<string>([entryPath]);
  const queue = [entryPath];
  let cursor = 0;
  while (cursor < queue.length) {
    const currentPath = queue[cursor];
    cursor += 1;
    if (currentPath === undefined) {
      continue;
    }
    const artifact = artifactsByPath.get(currentPath);
    if (
      artifact === undefined ||
      (artifact.kind !== 'html' && artifact.kind !== 'javascript' && artifact.kind !== 'stylesheet')
    ) {
      continue;
    }
    const content = await readFile(artifact.absolutePath, 'utf8');
    for (const reference of extractReferences(artifact.kind, content)) {
      const resolvedReference = resolveReference(currentPath, reference, knownPaths);
      if (resolvedReference === null || initialPaths.has(resolvedReference)) {
        continue;
      }
      initialPaths.add(resolvedReference);
      queue.push(resolvedReference);
    }
  }
  return initialPaths;
}

function sum(
  artifacts: readonly BuildArtifactMeasurement[],
  select: (artifact: BuildArtifactMeasurement) => number,
): number {
  let total = 0;
  for (const artifact of artifacts) {
    total += select(artifact);
  }
  return total;
}

function pushBudgetFinding(
  findings: BuildBudgetFinding[],
  metric: string,
  observed: number,
  budget: number,
  warningRatio: number,
  label: string,
): void {
  if (observed > budget) {
    findings.push({
      metric,
      severity: 'error',
      observed,
      budget,
      message: `${label} exceeds its production budget.`,
    });
  } else if (observed > budget * warningRatio) {
    findings.push({
      metric,
      severity: 'warning',
      observed,
      budget,
      message: `${label} has less than ${Math.round((1 - warningRatio) * 100)}% headroom.`,
    });
  }
}

function validateBudgets(value: unknown): BuildBudgets {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Build performance budgets are missing.');
  }
  const candidate = value as Partial<Record<keyof BuildBudgets, unknown>>;
  const readPositive = (key: keyof BuildBudgets): number => {
    const numberValue = candidate[key];
    if (typeof numberValue !== 'number' || !Number.isFinite(numberValue) || numberValue <= 0) {
      throw new Error(`Invalid build performance budget: ${key}.`);
    }
    return numberValue;
  };
  const warningRatio = readPositive('warningRatio');
  if (warningRatio >= 1) {
    throw new Error('Build warningRatio must be lower than one.');
  }
  return Object.freeze({
    maximumInitialTransferBytes: readPositive('maximumInitialTransferBytes'),
    maximumTotalTransferBytes: readPositive('maximumTotalTransferBytes'),
    maximumDecodedAssetBytes: readPositive('maximumDecodedAssetBytes'),
    maximumEntryJavaScriptBytes: readPositive('maximumEntryJavaScriptBytes'),
    maximumEntryJavaScriptGzipBytes: readPositive('maximumEntryJavaScriptGzipBytes'),
    maximumTotalJavaScriptBytes: readPositive('maximumTotalJavaScriptBytes'),
    warningRatio,
  });
}

export async function loadBuildBudgets(): Promise<BuildBudgets> {
  const budgetUrl = new URL('../../src/performance/performance-budgets.json', import.meta.url);
  const parsed = JSON.parse(await readFile(budgetUrl, 'utf8')) as { readonly build?: unknown };
  return validateBudgets(parsed.build);
}

export async function analyzeBuildDirectory(
  directory: string,
  budgets?: BuildBudgets,
): Promise<BuildAnalysisReport> {
  const rootDirectory = resolve(directory);
  const rootStats = await stat(rootDirectory).catch(() => null);
  if (rootStats === null || !rootStats.isDirectory()) {
    throw new Error(`Build directory does not exist: ${rootDirectory}`);
  }

  const absolutePaths = await collectFiles(rootDirectory);
  const mutableArtifacts: MutableArtifactMeasurement[] = [];
  for (const absolutePath of absolutePaths) {
    const relativePath = normalizeRelativePath(rootDirectory, absolutePath);
    const kind = classifyArtifact(relativePath);
    const bytes = await readFile(absolutePath);
    mutableArtifacts.push({
      absolutePath,
      relativePath,
      kind,
      rawBytes: bytes.length,
      transferBytes:
        kind === 'source-map'
          ? 0
          : COMPRESSIBLE_EXTENSIONS.has(extname(relativePath).toLowerCase())
            ? gzipSync(bytes, { level: 9 }).length
            : bytes.length,
      decodedAssetBytes: estimateDecodedAssetBytes(relativePath, bytes),
    });
  }

  const initialPaths = await findInitialPaths(mutableArtifacts);
  const artifacts = mutableArtifacts
    .map((artifact): BuildArtifactMeasurement =>
      Object.freeze({
        relativePath: artifact.relativePath,
        kind: artifact.kind,
        rawBytes: artifact.rawBytes,
        transferBytes: artifact.transferBytes,
        decodedAssetBytes: artifact.decodedAssetBytes,
        initial: initialPaths.has(artifact.relativePath),
      }),
    )
    .sort(
      (first, second) =>
        second.rawBytes - first.rawBytes || first.relativePath.localeCompare(second.relativePath),
    );

  const transportArtifacts = artifacts.filter((artifact) => artifact.kind !== 'source-map');
  const initialArtifacts = transportArtifacts.filter((artifact) => artifact.initial);
  const javascriptArtifacts = transportArtifacts.filter(
    (artifact) => artifact.kind === 'javascript',
  );
  const entryJavaScript = initialArtifacts
    .filter((artifact) => artifact.kind === 'javascript')
    .sort((first, second) => second.rawBytes - first.rawBytes)[0];
  const activeBudgets = budgets ?? (await loadBuildBudgets());
  const totals = Object.freeze({
    fileCount: artifacts.length,
    transportFileCount: transportArtifacts.length,
    initialRawBytes: sum(initialArtifacts, (artifact) => artifact.rawBytes),
    initialTransferBytes: sum(initialArtifacts, (artifact) => artifact.transferBytes),
    totalRawBytes: sum(transportArtifacts, (artifact) => artifact.rawBytes),
    totalTransferBytes: sum(transportArtifacts, (artifact) => artifact.transferBytes),
    totalJavaScriptBytes: sum(javascriptArtifacts, (artifact) => artifact.rawBytes),
    totalJavaScriptGzipBytes: sum(javascriptArtifacts, (artifact) => artifact.transferBytes),
    entryJavaScriptBytes: entryJavaScript?.rawBytes ?? 0,
    entryJavaScriptGzipBytes: entryJavaScript?.transferBytes ?? 0,
    decodedAssetBytes: sum(transportArtifacts, (artifact) => artifact.decodedAssetBytes),
    sourceMapBytes: sum(
      artifacts.filter((artifact) => artifact.kind === 'source-map'),
      (artifact) => artifact.rawBytes,
    ),
  });

  const findings: BuildBudgetFinding[] = [];
  pushBudgetFinding(
    findings,
    'initial-transfer',
    totals.initialTransferBytes,
    activeBudgets.maximumInitialTransferBytes,
    activeBudgets.warningRatio,
    'Initial compressed transfer',
  );
  pushBudgetFinding(
    findings,
    'total-transfer',
    totals.totalTransferBytes,
    activeBudgets.maximumTotalTransferBytes,
    activeBudgets.warningRatio,
    'Total compressed transfer',
  );
  pushBudgetFinding(
    findings,
    'decoded-assets',
    totals.decodedAssetBytes,
    activeBudgets.maximumDecodedAssetBytes,
    activeBudgets.warningRatio,
    'Estimated decoded asset memory',
  );
  pushBudgetFinding(
    findings,
    'entry-javascript-raw',
    totals.entryJavaScriptBytes,
    activeBudgets.maximumEntryJavaScriptBytes,
    activeBudgets.warningRatio,
    'Largest initial JavaScript chunk',
  );
  pushBudgetFinding(
    findings,
    'entry-javascript-gzip',
    totals.entryJavaScriptGzipBytes,
    activeBudgets.maximumEntryJavaScriptGzipBytes,
    activeBudgets.warningRatio,
    'Largest initial JavaScript chunk (gzip)',
  );
  pushBudgetFinding(
    findings,
    'total-javascript-raw',
    totals.totalJavaScriptBytes,
    activeBudgets.maximumTotalJavaScriptBytes,
    activeBudgets.warningRatio,
    'Total JavaScript',
  );

  const status = findings.some((finding) => finding.severity === 'error')
    ? 'fail'
    : findings.length > 0
      ? 'warning'
      : 'pass';
  return Object.freeze({
    generatedAt: new Date().toISOString(),
    rootDirectory,
    status,
    totals,
    budgets: activeBudgets,
    findings: Object.freeze(findings),
    artifacts: Object.freeze(artifacts),
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1_024) {
    return `${bytes} B`;
  }
  if (bytes < 1_048_576) {
    return `${(bytes / 1_024).toFixed(2)} KiB`;
  }
  return `${(bytes / 1_048_576).toFixed(2)} MiB`;
}

export function formatBuildReport(report: BuildAnalysisReport): string {
  const lines = [
    `Build performance: ${report.status.toUpperCase()}`,
    `Initial transfer: ${formatBytes(report.totals.initialTransferBytes)} / ${formatBytes(report.budgets.maximumInitialTransferBytes)}`,
    `Total transfer: ${formatBytes(report.totals.totalTransferBytes)} / ${formatBytes(report.budgets.maximumTotalTransferBytes)}`,
    `Entry JavaScript: ${formatBytes(report.totals.entryJavaScriptBytes)} raw, ${formatBytes(report.totals.entryJavaScriptGzipBytes)} gzip`,
    `All JavaScript: ${formatBytes(report.totals.totalJavaScriptBytes)} raw, ${formatBytes(report.totals.totalJavaScriptGzipBytes)} gzip`,
    `Decoded assets estimate: ${formatBytes(report.totals.decodedAssetBytes)} / ${formatBytes(report.budgets.maximumDecodedAssetBytes)}`,
    `Source maps (not transfer): ${formatBytes(report.totals.sourceMapBytes)}`,
  ];
  if (report.findings.length === 0) {
    lines.push('Budget findings: none');
  } else {
    lines.push('Budget findings:');
    for (const finding of report.findings) {
      lines.push(
        `- ${finding.severity.toUpperCase()} ${finding.metric}: ${formatBytes(finding.observed)} / ${formatBytes(finding.budget)} — ${finding.message}`,
      );
    }
  }
  lines.push('Largest transport artifacts:');
  for (const artifact of report.artifacts
    .filter((candidate) => candidate.kind !== 'source-map')
    .slice(0, 10)) {
    lines.push(
      `- ${artifact.relativePath}: ${formatBytes(artifact.rawBytes)} raw, ${formatBytes(artifact.transferBytes)} transfer${artifact.initial ? ' [initial]' : ''}`,
    );
  }
  return lines.join('\n');
}

function parseCliOptions(argumentsList: readonly string[]): CliOptions {
  let directory = 'dist';
  let json = false;
  let failOnWarning = false;
  let reportPath: string | undefined;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--dir') {
      const value = argumentsList[index + 1];
      if (!value) {
        throw new Error('--dir needs a directory path.');
      }
      directory = value;
      index += 1;
    } else if (argument === '--report') {
      const value = argumentsList[index + 1];
      if (!value) {
        throw new Error('--report needs a file path.');
      }
      reportPath = value;
      index += 1;
    } else if (argument === '--json') {
      json = true;
    } else if (argument === '--fail-on-warning') {
      failOnWarning = true;
    } else if (argument !== undefined) {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return reportPath === undefined
    ? { directory, json, failOnWarning }
    : { directory, json, failOnWarning, reportPath };
}

async function runCli(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const report = await analyzeBuildDirectory(options.directory);
  if (options.reportPath !== undefined) {
    const absoluteReportPath = resolve(options.reportPath);
    await mkdir(dirname(absoluteReportPath), { recursive: true });
    await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  console.log(options.json ? JSON.stringify(report, null, 2) : formatBuildReport(report));
  if (report.status === 'fail' || (options.failOnWarning && report.status === 'warning')) {
    process.exitCode = 1;
  }
}

const entryArgument = process.argv[1];
if (entryArgument !== undefined && pathToFileURL(resolve(entryArgument)).href === import.meta.url) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
