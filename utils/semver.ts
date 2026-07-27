/**
 * Compare marketing semver strings (major.minor.patch).
 * Pre-release / build metadata after `-` or `+` is ignored.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemverParts(a);
  const pb = parseSemverParts(b);

  for (let i = 0; i < 3; i++) {
    const diff = pa[i] - pb[i];
    if (diff !== 0) return diff;
  }
  return 0;
}

function parseSemverParts(version: string): [number, number, number] {
  const core = String(version ?? '')
    .trim()
    .split(/[-+]/)[0]
    .trim();
  const segments = core.split('.');
  const major = Number.parseInt(segments[0] ?? '0', 10);
  const minor = Number.parseInt(segments[1] ?? '0', 10);
  const patch = Number.parseInt(segments[2] ?? '0', 10);
  return [
    Number.isFinite(major) ? major : 0,
    Number.isFinite(minor) ? minor : 0,
    Number.isFinite(patch) ? patch : 0,
  ];
}
