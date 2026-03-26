const fs = require('node:fs');
const path = require('node:path');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const rawTag = process.argv[2] || process.env.GITHUB_REF_NAME || '';
  const outputPath =
    process.argv[3] || process.env.RELEASE_NOTES_OUTPUT || path.join(process.cwd(), 'release-notes.md');

  if (!rawTag) {
    throw new Error('Missing tag name. Pass a tag like v1.1.0.');
  }

  const version = rawTag.startsWith('v') ? rawTag.slice(1) : rawTag;
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

  if (!fs.existsSync(changelogPath)) {
    throw new Error(`CHANGELOG.md not found at ${changelogPath}`);
  }

  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const pattern = new RegExp(
    `^##\\s+${escapeRegExp(version)}\\b[\\s\\S]*?(?=^##\\s+|\\Z)`,
    'm'
  );
  const match = changelog.match(pattern);

  const notes = match
    ? match[0].trim()
    : `## ${version}\n\nRelease ${rawTag} published automatically.`;

  fs.writeFileSync(outputPath, `${notes}\n`, 'utf8');
  console.log(`Release notes written to ${outputPath}`);
}

main();
