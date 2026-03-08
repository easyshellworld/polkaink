export interface VersionNode {
  id: number;
  parentId: number | null;
  depth: number;
}

export function buildVersionTree(
  versions: { id: number; parentVersionId: number }[]
): VersionNode[] {
  const nodes: VersionNode[] = versions.map((v) => ({
    id: v.id,
    parentId: v.parentVersionId === 0 ? null : v.parentVersionId,
    depth: 0,
  }));

  const map = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    let depth = 0;
    let current = node;
    while (current.parentId !== null) {
      const parent = map.get(current.parentId);
      if (!parent) break;
      current = parent;
      depth++;
    }
    node.depth = depth;
  }

  return nodes.sort((a, b) => a.id - b.id);
}

export function getVersionPath(
  nodes: VersionNode[],
  targetId: number
): number[] {
  const map = new Map(nodes.map((n) => [n.id, n]));
  const path: number[] = [];
  let current = map.get(targetId);
  while (current) {
    path.unshift(current.id);
    current = current.parentId !== null ? map.get(current.parentId) : undefined;
  }
  return path;
}
