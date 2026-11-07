import type {
  CoverageReport,
  DependencyUsageReport,
  ImpactReport,
  MergeDecision,
  RemediationReport,
  ValidationReport,
  VulnerabilityReport,
} from '../contracts/types';

export const DECISION_MARKER = '<!-- sentinel:decision -->';
export const BODY_MARKER = '<!-- sentinel:remediation -->';

/**
 * Escapes text from reports for Markdown tables: pipes, backticks, HTML and @-mentions (a file
 * or advisory name must never notify someone or inject markup).
 */
export function md(text: string | number | null | undefined): string {
  return String(text ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\\`*_[\]<>|]/g, (c) => `\\${c}`)
    .replace(/@(?=[A-Za-z0-9])/g, '@​');
}

/** A code span: backticks cannot be escaped inside one, so they are replaced. */
export function code(text: string | number | null | undefined): string {
  return `\`${String(text ?? '')
    .replace(/`/g, "'")
    .replace(/[\r\n]+/g, ' ')}\``;
}

function advisoryLink(v: VulnerabilityReport['vulnerabilities'][number]): string {
  const ids = [v.ids.ghsa, ...v.ids.cve].filter((x): x is string => !!x);
  return (
    ids
      .map((id) =>
        id.startsWith('GHSA')
          ? `[${md(id)}](https://github.com/advisories/${encodeURIComponent(id)})`
          : md(id),
      )
      .join(', ') || md(v.key)
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const note = '\n\n_Truncated: the full detail is in the workflow artifacts._\n';
  return `${text.slice(0, max - note.length)}${note}`;
}

/** Pull request body written by the weekly workflow from the pre-validation plan. */
export function renderPullRequestBody(
  vulnerabilities: VulnerabilityReport,
  usage: DependencyUsageReport,
  impact: ImpactReport,
  remediation: RemediationReport,
  maxChars: number,
): string {
  const targeted = new Set(remediation.verification.targeted);
  const fixed = vulnerabilities.vulnerabilities.filter((v) => targeted.has(v.key));
  const lines: string[] = [BODY_MARKER, '## Project Sentinel dependency remediation', ''];
  lines.push(
    `This pull request remediates **${fixed.length}** of ${vulnerabilities.summary.total} ` +
      'known vulnerabilities using patch and minor upgrades only. ' +
      'It was produced without AI by deterministic analysis; ' +
      'the merge decision is made by the Sentinel PR validation workflow for each commit.',
    '',
    '### Vulnerabilities remediated',
    '',
    '| Severity | Package | Advisory | Change |',
    '|---|---|---|---|',
  );
  for (const v of fixed) {
    const changes = remediation.changes.filter(
      (c) => c.name === v.package && c.relation === 'targeted',
    );
    const change =
      changes.map((c) => `${md(c.from)} → ${md(c.to)}`).join(', ') ||
      v.instances.map((i) => md(i.fix.strategy)).join(', ');
    lines.push(`| ${v.severity} | ${code(v.package)} | ${advisoryLink(v)} | ${change} |`);
  }
  if (remediation.escalations.length > 0) {
    lines.push(
      '',
      '### Not remediated automatically',
      '',
      '| Package | Reason | Detail |',
      '|---|---|---|',
    );
    for (const e of remediation.escalations) {
      lines.push(`| ${code(e.package)} | ${md(e.reason)} | ${md(e.detail)} |`);
    }
  }
  lines.push('', '### Dependency changes', '');
  const byRelation = (rel: string): number =>
    remediation.changes.filter((c) => c.relation === rel).length;
  lines.push(
    `${remediation.changes.length} lockfile entries changed: ${byRelation('targeted')} targeted, ` +
      `${byRelation('dependency-of-targeted')} dependencies of targeted packages, ` +
      `${byRelation('unrelated')} unrelated.`,
  );
  for (const m of remediation.manifestChanges) {
    lines.push(
      `- ${code(`${m.field}.${m.package}`)}: ${md(m.from)} → ${md(m.to)}` +
        (m.allowed ? '' : ' (not an allowed change)'),
    );
  }
  lines.push(
    '',
    '### Where the vulnerable packages are used',
    '',
    '| Package | Usage | Impacted files | Entry points |',
    '|---|---|---|---|',
  );
  for (const p of impact.packages.filter((x) => fixed.some((v) => v.package === x.package))) {
    const u = usage.packages.find((x) => x.package === p.package);
    const files = new Set([...p.directFiles, ...p.transitiveFiles, ...p.configurationFiles]);
    const entries = p.entryPoints
      .slice(0, 5)
      .map((f) => code(f))
      .join(', ');
    const more = p.entryPoints.length > 5 ? ', …' : '';
    lines.push(
      `| ${code(p.package)} | ${md(u?.status)} (${md(u?.completeness)}) | ${files.size} | ` +
        `${entries}${more} |`,
    );
  }
  lines.push(
    '',
    '### Merge eligibility',
    '',
    'Pending: Sentinel PR validation re-runs the tests, coverage and security checks ' +
      'on this commit and posts its decision below.',
    '',
    `<sub>Execution ${md(remediation.executionId)} · ` +
      `patch sha256 ${md(remediation.patch.sha256 ?? 'n/a')}</sub>`,
  );
  return truncate(lines.join('\n'), maxChars);
}

/** The sticky decision comment, written by the PR validation workflow. */
export function renderDecisionComment(
  decision: MergeDecision,
  coverage: CoverageReport | null,
  validation: ValidationReport | null,
  remediation: RemediationReport,
  runUrl: string | null,
  maxChars: number,
): string {
  const lines: string[] = [
    DECISION_MARKER,
    `## Sentinel decision: ${decision.decision.replace('_', ' ')}`,
    '',
  ];
  const head = decision.pullRequest.headSha
    ? `\`${decision.pullRequest.headSha.slice(0, 12)}\``
    : 'unknown';
  lines.push(
    `Evaluated commit ${head}. ${explain(decision.decision)}`,
    '',
    '| Gate | Status |',
    '|---|---|',
  );
  for (const g of decision.gates) lines.push(`| ${g.id} ${md(g.name)} | ${g.status} |`);
  const attention = decision.reasons.filter((r) => r.effect !== 'INFO');
  if (attention.length > 0) {
    lines.push('', '### What needs attention', '');
    for (const r of attention) {
      const subjects = r.subjects
        .slice(0, 8)
        .map((s) => `${code(s)}`)
        .join(', ');
      const more = r.subjects.length > 8 ? ', …' : '';
      lines.push(
        `- **${r.effect}** ${r.gate} \`${r.code}\`: ${md(r.message)}` +
          (subjects ? ` (${subjects}${more})` : ''),
      );
    }
  }
  const required = coverage?.files.filter((f) => f.evidenceRequired) ?? [];
  if (required.length > 0) {
    lines.push(
      '',
      '### Test coverage of impacted files',
      '',
      '| File | Status | Lines | Exercised by |',
      '|---|---|---|---|',
    );
    for (const f of required) {
      const tests = f.associatedTests
        .filter((t) => t.executionStrength === 'EXERCISED')
        .map((t) => `${code(t.testFile)}`)
        .join(', ');
      const lines_ = f.metrics
        ? `${f.metrics.lines.pct}%`
        : f.validatedBy.length > 0
          ? `validated by ${md(f.validatedBy.join(', '))}`
          : 'n/a';
      lines.push(`| ${code(f.file)} | ${f.status} | ${lines_} | ${tests || '-'} |`);
    }
  }
  if (validation) {
    lines.push('', '### Validation', '', '| Check | Required | Result |', '|---|---|---|');
    for (const c of validation.commands)
      lines.push(`| ${md(c.id)} | ${c.required ? 'yes' : 'no'} | ${c.status} |`);
    const t = validation.tests;
    lines.push(
      '',
      `Tests: ${t.passed} passed, ${t.failed} failed, ${t.skipped} skipped, ${t.todo} todo ` +
        `across ${t.executedFiles} files.`,
    );
  }
  const v = remediation.verification;
  const integrity = remediation.integrity;
  lines.push(
    '',
    '### Security',
    '',
    `Advisories before: ${v.before.advisoryKeys.length}; ` +
      `after: ${v.after.advisoryKeys.length} (audit ${v.after.status}). ` +
      `Targeted ${v.targeted.length}, resolved ${v.resolved.length}, ` +
      `remaining ${v.remaining.length}, introduced ${v.introduced.length}.`,
    `Lockfile: consistency ${integrity.lockfileConsistent}, ` +
      `${integrity.registry.violations.length} registry violations, ` +
      `${integrity.missingIntegrity.length} entries without integrity.`,
  );
  const own = decision.ownership;
  lines.push('', '### Ownership', '');
  lines.push(
    own.owners.length > 0
      ? `Owners of impacted files: ${own.owners.map((o) => `${code(o)}`).join(', ')}`
      : 'No owners resolved.',
  );
  if (own.unresolvedFiles.length > 0) {
    const fallback = own.fallbackApplied ? ' (fallback owners requested)' : '';
    const listed = own.unresolvedFiles
      .slice(0, 15)
      .map((f) => code(f))
      .join(', ');
    const more = own.unresolvedFiles.length > 15 ? ', …' : '';
    lines.push(`Files without a CODEOWNERS owner${fallback}: ${listed}${more}`);
  }
  lines.push(
    '',
    `<sub>Decision ${md(decision.decisionDigest.slice(0, 16))} · ` +
      `policy ${md(decision.inputs.policyDigest.slice(0, 16))} · ` +
      (runUrl ? `[workflow run](${runUrl}) · ` : '') +
      'reproducible from the artifacts of this run. No AI was used.</sub>',
  );
  return truncate(lines.join('\n'), maxChars);
}

const EXPLANATIONS: Record<MergeDecision['decision'], string> = {
  AUTO_MERGE:
    'All eight gates passed; GitHub auto-merge is enabled and still waits for branch protection.',
  HUMAN_REVIEW:
    'A person needs to review this change; auto-merge is off and the owners of impacted files ' +
    'are requested.',
  BLOCKED:
    'Validation failed or a security condition is unresolved; this check fails so branch ' +
    'protection prevents merging.',
};

function explain(outcome: MergeDecision['decision']): string {
  return EXPLANATIONS[outcome];
}
