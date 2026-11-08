import type { FileClass } from '../contracts/types';
import type { SentinelConfig } from '../config/types';
import { matchesAny } from '../core/glob';

/** Precedence: a test inside `src/` is a test, a workflow is CI, and so on. */
export const CLASS_ORDER: Exclude<FileClass, 'other'>[] = [
  'test',
  'documentation',
  'ci',
  'infrastructure',
  'tooling',
  'configuration',
  'production',
];

/** Classifies a repository-relative path using the policy's ordered glob lists. */
export function classifyFile(
  file: string,
  classification: SentinelConfig['analysis']['classification'],
): FileClass {
  for (const cls of CLASS_ORDER) {
    if (matchesAny(file, classification[cls])) {
      return cls;
    }
  }
  return 'other';
}
