# Production performance analysis

`analyze.ts` turns the budgets in
`src/performance/performance-budgets.json` into a reproducible build gate. It
walks the complete static build, follows the HTML/CSS/static-JavaScript entry
graph, estimates gzip transfer size, excludes source maps from public transfer,
and estimates decoded PNG texture memory including mip overhead.

Run after a production build:

```powershell
node --experimental-strip-types tools/analyze-build/analyze.ts --dir dist
```

Optional flags:

- `--json`: emit the complete machine-readable report;
- `--report reports/build-performance.json`: persist that report;
- `--fail-on-warning`: use the 85% headroom warning as a hard CI gate.

The default command exits non-zero only when a hard budget is exceeded. Source
maps are reported separately because they should not be served as initial game
downloads in production.

The runtime counterpart is `RuntimePerformanceMonitor`. Its `recordFrame`
method writes into fixed typed-array rings without allocating per frame;
`snapshot()` and `evaluate()` should run only on a slow debug/QA cadence.
