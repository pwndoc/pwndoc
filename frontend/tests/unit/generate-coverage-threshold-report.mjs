import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { UNIT_COVERAGE_EXCLUDE, UNIT_COVERAGE_THRESHOLDS } from './vitest.config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')
const coverageOutDir = path.join(rootDir, 'coverage', 'unit')
const summaryPath = path.join(coverageOutDir, 'coverage-summary.json')
const reportPath = path.join(coverageOutDir, 'thresholds.html')
const indexPath = path.join(coverageOutDir, 'index.html')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function toRelativePath(filePath) {
  const normalized = filePath.replaceAll('\\', '/')
  const normalizedRoot = rootDir.replaceAll('\\', '/')
  if (normalized.startsWith(`${normalizedRoot}/`)) {
    return normalized.slice(normalizedRoot.length + 1)
  }

  const srcIndex = normalized.indexOf('/src/')
  if (srcIndex >= 0) {
    return normalized.slice(srcIndex + 1)
  }
  return normalized
}

function globToRegExp(pattern) {
  let normalized = pattern.replaceAll('\\', '/')
  if (normalized.endsWith('/')) {
    normalized += '**'
  }

  let regex = '^'
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i]

    if (char === '*') {
      const next = normalized[i + 1]
      if (next === '*') {
        const after = normalized[i + 2]
        if (after === '/') {
          regex += '(?:.*/)?'
          i += 2
        } else {
          regex += '.*'
          i += 1
        }
      } else {
        regex += '[^/]*'
      }
      continue
    }

    if (char === '?') {
      regex += '[^/]'
      continue
    }

    if ('\\.[]{}()+-^$|'.includes(char)) {
      regex += `\\${char}`
    } else {
      regex += char
    }
  }

  regex += '$'
  return new RegExp(regex)
}

function percent(covered, total) {
  if (total === 0) {
    return 100
  }
  return (covered / total) * 100
}

function evaluateThreshold(actual, minimum) {
  return actual + 1e-9 >= minimum
}

function aggregate(files) {
  const totals = {
    statements: { covered: 0, total: 0, pct: 100 },
    branches: { covered: 0, total: 0, pct: 100 },
    functions: { covered: 0, total: 0, pct: 100 },
    lines: { covered: 0, total: 0, pct: 100 }
  }

  for (const file of files) {
    for (const metric of Object.keys(totals)) {
      totals[metric].covered += file[metric].covered
      totals[metric].total += file[metric].total
    }
  }

  for (const metric of Object.keys(totals)) {
    totals[metric].pct = percent(totals[metric].covered, totals[metric].total)
  }

  return totals
}

function summarizeMetrics(aggregated, thresholds) {
  const order = ['statements', 'lines', 'functions', 'branches']
  const checks = order.map((metric) => {
    const actual = aggregated[metric].pct
    const threshold = thresholds[metric]
    return {
      metric,
      actual,
      threshold,
      pass: evaluateThreshold(actual, threshold)
    }
  })

  return {
    checks,
    pass: checks.every((check) => check.pass)
  }
}

function createSectionRow(group) {
  const metrics = group.summary.checks.map((check) => {
    const status = check.pass ? 'pass' : 'fail'
    return `<td class="${status}"><div>${check.actual.toFixed(2)}%</div><div class="threshold">>= ${check.threshold}%</div></td>`
  }).join('')

  return `<tr>
    <td><code>${escapeHtml(group.name)}</code><div class="files">${group.filesCount} files</div></td>
    ${metrics}
    <td class="${group.summary.pass ? 'pass' : 'fail'}"><strong>${group.summary.pass ? 'PASS' : 'FAIL'}</strong></td>
  </tr>`
}

function htmlReport(groups, overallPass) {
  const rows = groups.map(createSectionRow).join('\n')
  const generatedAt = new Date().toISOString()

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Coverage Threshold Summary</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 2rem; color: #111827; }
    .status { display: inline-block; padding: 0.4rem 0.75rem; border-radius: 0.375rem; font-weight: 700; }
    .status.pass { background: #dcfce7; color: #166534; }
    .status.fail { background: #fee2e2; color: #991b1b; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
    th, td { border: 1px solid #e5e7eb; padding: 0.65rem; text-align: left; vertical-align: top; }
    th { background: #f9fafb; }
    td.pass { background: #f0fdf4; color: #166534; }
    td.fail { background: #fef2f2; color: #991b1b; }
    .threshold { color: #6b7280; font-size: 0.85rem; }
    .files { color: #6b7280; font-size: 0.85rem; margin-top: 0.2rem; }
    .muted { color: #6b7280; font-size: 0.9rem; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Coverage Threshold Summary</h1>
  <p><span class="status ${overallPass ? 'pass' : 'fail'}">${overallPass ? 'PASS' : 'FAIL'}</span></p>
  <p class="muted">Aggregated threshold results by glob. Generated at ${generatedAt}.</p>
  <p><a href="./index.html">Open file-level Istanbul report</a></p>
  <table>
    <thead>
      <tr>
        <th>Group</th>
        <th>Statements</th>
        <th>Lines</th>
        <th>Functions</th>
        <th>Branches</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`
}

function bannerHtml(overallPass) {
  return `<div style="margin: 0 0 12px; padding: 10px 12px; border-radius: 4px; background: ${overallPass ? '#dcfce7' : '#fee2e2'}; color: ${overallPass ? '#166534' : '#991b1b'}; border: 1px solid ${overallPass ? '#86efac' : '#fca5a5'};" data-unit-threshold-banner="true">
  <strong>Thresholds ${overallPass ? 'PASS' : 'FAIL'}</strong>
  <span style="margin-left: 8px;"><a href="./thresholds.html" style="color: inherit; text-decoration: underline;">View aggregate threshold summary</a></span>
</div>`
}

function injectBanner(indexHtml, overallPass) {
  const banner = bannerHtml(overallPass)

  // Remove all previously injected threshold banners to keep insertion idempotent.
  let cleaned = indexHtml.replace(/\s*<div[^>]*data-unit-threshold-banner="true"[\s\S]*?<\/div>\s*/g, '\n')
  cleaned = cleaned.replace(/\s*<div style="margin: 0 0 12px;[\s\S]*?href="\.\/thresholds\.html"[\s\S]*?<\/div>\s*/g, '\n')

  const primaryMarker = /(<div class=['"]pad1['"]>\s*)(<h1>All files<\/h1>)/
  if (primaryMarker.test(cleaned)) {
    return cleaned.replace(primaryMarker, `$1${banner}\n        $2`)
  }

  const fallbackMarker = '<div class="pad1">'
  if (cleaned.includes(fallbackMarker)) {
    return cleaned.replace(fallbackMarker, `${fallbackMarker}\n        ${banner}`)
  }

  return cleaned
}

async function run() {
  const summaryContent = await fs.readFile(summaryPath, 'utf8')
  const summaryJson = JSON.parse(summaryContent)
  const total = summaryJson.total

  const fileEntries = Object.entries(summaryJson)
    .filter(([filePath]) => filePath !== 'total')
    .map(([filePath, metrics]) => ({
      path: toRelativePath(filePath),
      statements: metrics.statements,
      branches: metrics.branches,
      functions: metrics.functions,
      lines: metrics.lines
    }))

  const excludeRegexes = UNIT_COVERAGE_EXCLUDE.map(globToRegExp)
  const includedFiles = fileEntries.filter((entry) =>
    !excludeRegexes.some((regex) => regex.test(entry.path))
  )

  const groups = []
  const globalSummary = summarizeMetrics(total, UNIT_COVERAGE_THRESHOLDS.global)
  groups.push({
    name: 'global',
    filesCount: includedFiles.length,
    summary: globalSummary
  })

  for (const [pattern, threshold] of Object.entries(UNIT_COVERAGE_THRESHOLDS)) {
    if (pattern === 'global') {
      continue
    }
    const matcher = globToRegExp(pattern)
    const matched = includedFiles.filter((entry) => matcher.test(entry.path))
    const aggregated = aggregate(matched)
    groups.push({
      name: pattern,
      filesCount: matched.length,
      summary: summarizeMetrics(aggregated, threshold)
    })
  }

  const overallPass = groups.every((group) => group.summary.pass)
  await fs.writeFile(reportPath, htmlReport(groups, overallPass), 'utf8')

  const indexHtml = await fs.readFile(indexPath, 'utf8')
  const patchedIndex = injectBanner(indexHtml, overallPass)
  await fs.writeFile(indexPath, patchedIndex, 'utf8')

  if (!overallPass) {
    process.exitCode = 1
  }

}

run().catch((error) => {
  console.error('Failed to generate coverage threshold report:', error)
  process.exitCode = 1
})
