import ts from 'typescript';
import type { CoverageThresholds, Limitation } from '../contracts/types';

export interface ThresholdExtraction {
  coverageConfigured: boolean;
  thresholds: CoverageThresholds | null;
  limitations: Limitation[];
}

const METRICS = ['lines', 'branches', 'functions', 'statements'] as const;

function propertyName(node: ts.PropertyName): string | null {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  return null;
}

function numericValue(node: ts.Expression): number | null {
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  ) {
    return -Number(node.operand.text);
  }
  return null;
}

function fromObject(value: unknown, source: string): ThresholdExtraction {
  const limitations: Limitation[] = [];
  const config = (value ?? {}) as Record<string, unknown>;
  const configured =
    config.collectCoverage === true ||
    config.collectCoverageFrom !== undefined ||
    config.coverageThreshold !== undefined;
  const threshold = config.coverageThreshold as Record<string, Record<string, unknown>> | undefined;
  if (!threshold) {
    return { coverageConfigured: configured, thresholds: null, limitations };
  }
  const global = threshold.global ?? {};
  const thresholds: CoverageThresholds = {
    lines: null,
    branches: null,
    functions: null,
    statements: null,
  };
  for (const metric of METRICS) {
    const v = global[metric];
    if (typeof v === 'number' && v >= 0) {
      thresholds[metric] = v;
    } else if (typeof v === 'number') {
      limitations.push({
        code: 'THRESHOLD_NOT_PERCENTAGE',
        message:
          `${source}: coverageThreshold.global.${metric} ` +
          `is an absolute count (${v}); not applied`,
      });
    }
  }
  if (Object.keys(threshold).some((k) => k !== 'global')) {
    limitations.push({
      code: 'PATH_THRESHOLDS_IGNORED',
      message: `${source}: path-specific coverage thresholds are reported but not applied per file`,
    });
  }
  return { coverageConfigured: true, thresholds, limitations };
}

function literalToValue(node: ts.Expression): unknown {
  if (ts.isObjectLiteralExpression(node)) {
    const out: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const name = propertyName(prop.name);
        if (name !== null) {
          out[name] = literalToValue(prop.initializer);
        }
      }
    }
    return out;
  }
  const n = numericValue(node);
  if (n !== null) return n;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((e) => literalToValue(e));
  return { __unevaluated: node.getText() };
}

/**
 * Reads Jest coverage settings by parsing the config file's syntax tree (never by executing it,
 * because in pull-request evaluation the file comes from untrusted code).
 */
export function extractJestThresholds(fileName: string, text: string): ThresholdExtraction {
  if (fileName.endsWith('.json')) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return fromObject(fileName.endsWith('package.json') ? parsed.jest : parsed, fileName);
    } catch {
      return {
        coverageConfigured: false,
        thresholds: null,
        limitations: [{ code: 'CONFIG_UNPARSEABLE', message: `${fileName} is not valid JSON` }],
      };
    }
  }
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const found: Record<string, unknown> = {};
  let unevaluated = false;
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node)) {
      const name = propertyName(node.name);
      if (
        name === 'coverageThreshold' ||
        name === 'collectCoverage' ||
        name === 'collectCoverageFrom'
      ) {
        const value = literalToValue(node.initializer);
        if (JSON.stringify(value).includes('__unevaluated')) {
          unevaluated = true;
        }
        found[name] = value;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const result = fromObject(found, fileName);
  if (unevaluated) {
    result.limitations.push({
      code: 'CONFIG_NOT_STATIC',
      message:
        `${fileName}: some coverage settings are computed at runtime ` +
        'and could not be read statically',
    });
  }
  return result;
}
