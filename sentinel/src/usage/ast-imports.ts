import ts from 'typescript';
import { extensionOf } from '../core/paths';

export type ReferenceKind =
  | 'import'
  | 'type-import'
  | 'side-effect'
  | 'export-from'
  | 'import-equals'
  | 'require'
  | 'require-resolve'
  | 'dynamic-import'
  | 'jest-mock';

export interface ModuleReference {
  specifier: string;
  kind: ReferenceKind;
  line: number;
  column: number;
  text: string;
}

export interface DynamicSite {
  kind: 'import()' | 'require()' | 'require.resolve()';
  line: number;
  column: number;
  expression: string;
}

export interface LiteralToken {
  value: string;
  line: number;
  column: number;
  isPropertyName: boolean;
}

export interface ParsedModule {
  references: ModuleReference[];
  dynamicSites: DynamicSite[];
  literals: LiteralToken[];
  syntaxErrors: number;
}

export const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
]);

const MOCK_CALLS = new Set([
  'jest.mock',
  'jest.doMock',
  'jest.unmock',
  'jest.requireActual',
  'jest.requireMock',
  'jest.createMockFromModule',
  'vi.mock',
  'vi.doMock',
  'vi.importActual',
]);

function scriptKind(file: string): ts.ScriptKind {
  switch (extensionOf(file)) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.js':
    case '.mjs':
    case '.cjs':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function literalText(node: ts.Node | undefined): string | null {
  if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
    return node.text;
  }
  return null;
}

function snippet(source: ts.SourceFile, node: ts.Node): string {
  const text = node.getText(source).replace(/\s+/g, ' ');
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function importIsTypeOnly(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  if (clause.name) return false;
  const bindings = clause.namedBindings;
  return (
    !!bindings &&
    ts.isNamedImports(bindings) &&
    bindings.elements.length > 0 &&
    bindings.elements.every((e) => e.isTypeOnly)
  );
}

/**
 * Extracts every module reference from a JS/TS file using the TypeScript parser. Non-literal
 * `import()`/`require()` arguments cannot be resolved statically and are returned separately so
 * callers never mistake "not found" for "not used".
 */
export function parseModule(file: string, text: string, collectLiterals = false): ParsedModule {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file));
  const references: ModuleReference[] = [];
  const dynamicSites: DynamicSite[] = [];
  const literals: LiteralToken[] = [];
  const specifierNodes = new Set<ts.Node>();

  const position = (node: ts.Node): { line: number; column: number } => {
    const lc = source.getLineAndCharacterOfPosition(node.getStart(source));
    return { line: lc.line + 1, column: lc.character + 1 };
  };
  const add = (specifier: string, kind: ReferenceKind, node: ts.Node): void => {
    references.push({ specifier, kind, ...position(node), text: snippet(source, node) });
    const literal =
      ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
        ? node.moduleSpecifier
        : ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)
          ? node.moduleReference.expression
          : ts.isCallExpression(node)
            ? node.arguments[0]
            : ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)
              ? node.argument.literal
              : undefined;
    if (literal) specifierNodes.add(literal);
  };
  const dynamic = (kind: DynamicSite['kind'], node: ts.CallExpression): void => {
    dynamicSites.push({ kind, ...position(node), expression: snippet(source, node) });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const spec = literalText(node.moduleSpecifier);
      if (spec !== null) {
        add(
          spec,
          !node.importClause ? 'side-effect' : importIsTypeOnly(node) ? 'type-import' : 'import',
          node,
        );
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const spec = literalText(node.moduleSpecifier);
      if (spec !== null) {
        add(spec, node.isTypeOnly ? 'type-import' : 'export-from', node);
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      const spec = literalText(node.moduleReference.expression);
      if (spec !== null) {
        add(spec, node.isTypeOnly ? 'type-import' : 'import-equals', node);
      }
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      const spec = literalText(node.argument.literal);
      if (spec !== null) {
        add(spec, 'type-import', node);
      }
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const first = node.arguments[0];
      if (callee.kind === ts.SyntaxKind.ImportKeyword) {
        const spec = literalText(first);
        if (spec !== null) add(spec, 'dynamic-import', node);
        else dynamic('import()', node);
      } else if (
        ts.isIdentifier(callee) &&
        callee.text === 'require' &&
        node.arguments.length >= 1
      ) {
        const spec = literalText(first);
        if (spec !== null) add(spec, 'require', node);
        else dynamic('require()', node);
      } else if (ts.isPropertyAccessExpression(callee)) {
        const name = `${callee.expression.getText(source)}.${callee.name.text}`;
        if (name === 'require.resolve' && first) {
          const spec = literalText(first);
          if (spec !== null) add(spec, 'require-resolve', node);
          else dynamic('require.resolve()', node);
        } else if (MOCK_CALLS.has(name) && first) {
          const spec = literalText(first);
          if (spec !== null) add(spec, 'jest-mock', node);
        }
      }
    }
    if (collectLiterals && !specifierNodes.has(node)) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        literals.push({ value: node.text, ...position(node), isPropertyName: false });
      } else if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
        if (ts.isIdentifier(node.name)) {
          literals.push({ value: node.name.text, ...position(node.name), isPropertyName: true });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  const diagnostics =
    (source as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics ?? [];
  return { references, dynamicSites, literals, syntaxErrors: diagnostics.length };
}

/** Package name of a bare specifier (`@scope/pkg/sub` -> `@scope/pkg`), or null for paths. */
export function packageNameOf(specifier: string): string | null {
  if (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    /^[a-z]+:/i.test(specifier) ||
    specifier.startsWith('#')
  ) {
    return null;
  }
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    return parts.length >= 2 && parts[0].length > 1 && parts[1] ? `${parts[0]}/${parts[1]}` : null;
  }
  return parts[0] || null;
}
