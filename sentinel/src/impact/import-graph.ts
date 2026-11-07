/** One resolved local import: `from` imports `to`. */
export interface ImportEdge {
  from: string;
  to: string;
  typeOnly: boolean;
  line: number;
  text: string;
}

/** Repository-local module graph built from AST import references. */
export class ImportGraph {
  private readonly forward = new Map<string, ImportEdge[]>();
  private readonly reverse = new Map<string, ImportEdge[]>();

  add(edge: ImportEdge): void {
    if (edge.from === edge.to) return;
    this.forward.set(edge.from, [...(this.forward.get(edge.from) ?? []), edge]);
    this.reverse.set(edge.to, [...(this.reverse.get(edge.to) ?? []), edge]);
  }

  /** Edges from files that import `file`. */
  importersOf(file: string, runtimeOnly = true): ImportEdge[] {
    return (this.reverse.get(file) ?? []).filter((e) => !runtimeOnly || !e.typeOnly);
  }

  /** Edges from `file` to the files it imports. */
  importsOf(file: string, runtimeOnly = true): ImportEdge[] {
    return (this.forward.get(file) ?? []).filter((e) => !runtimeOnly || !e.typeOnly);
  }

  /**
   * Files that (transitively, through runtime imports) depend on any seed, restricted by
   * `include`. Each result maps to the chain of edges from a seed to that file, so every dependent
   * is traceable.
   */
  dependentsOf(
    seeds: Iterable<string>,
    include: (file: string) => boolean,
  ): Map<string, ImportEdge[]> {
    const chains = new Map<string, ImportEdge[]>();
    const queue: string[] = [];
    for (const seed of seeds) {
      chains.set(seed, []);
      queue.push(seed);
    }
    const seedSet = new Set(queue);
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const edge of this.importersOf(current)) {
        if (chains.has(edge.from) || !include(edge.from)) continue;
        chains.set(edge.from, [...(chains.get(current) ?? []), edge]);
        queue.push(edge.from);
      }
    }
    for (const seed of seedSet) chains.delete(seed);
    return chains;
  }

  /**
   * Files reachable from `start` through runtime imports (its static import closure), used to
   * associate test files with the production files they load.
   */
  closureOf(start: string): Set<string> {
    const seen = new Set<string>();
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const edge of this.importsOf(current)) {
        if (!seen.has(edge.to)) {
          seen.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    return seen;
  }

  edgeCount(): number {
    let n = 0;
    for (const list of this.forward.values()) n += list.length;
    return n;
  }
}
