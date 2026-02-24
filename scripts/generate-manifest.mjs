import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories where manifest.json needs to be updated relative to project root
const projectRoot = path.resolve(__dirname, '..');
const targetDirs = [
  path.join(projectRoot, 'dist/sboms'),
  path.join(projectRoot, 'public/sboms')
];

function toTitleCase(str) {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Generate a display name logic
function getDisplayName(file, groupName) {
  if (file === 'latest.sbom.json' && groupName === 'self') return 'Self Scan (Latest)';
  if (file === 'sbom-huge.sbom.json') return 'Huge Example (20k)';
  if (file === 'sbom-full.sbom.json') return 'Full SBOM';
  if (file === 'sample-simple.sbom.json') return 'Simple Example';
  if (file === 'signed-sample.sbom.json') return 'Signed SBOM Demo';
  
  return toTitleCase(file.replace('.sbom.json', '').replace('.json', ''));
}

// Group display logic
function getGroupDisplayName(groupName) {
  if (groupName === 'self') return 'Self Scan';
  return toTitleCase(groupName);
}

function generateManifestJson(baseDir) {
  const manifest = {
    default: "self/latest", 
    files: []
  };

  if (!fs.existsSync(baseDir)) {
    console.log(`Directory ${baseDir} does not exist, skipping manifest generation.`);
    return;
  }

  const groups = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory());

  for (const groupDir of groups) {
    const groupName = groupDir.name;
    const groupPath = path.join(baseDir, groupName);
    const files = fs.readdirSync(groupPath).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const id = `${groupName}/${file.replace('.sbom.json', '').replace('.json', '')}`;
      const name = getDisplayName(file, groupName);
      const displayGroupName = getGroupDisplayName(groupName);

      manifest.files.push({
        name,
        path: `sboms/${groupName}/${file}`,
        id,
        group: displayGroupName
      });
    }
  }
  
  // Sort files for consistent output: Examples first, then alphabetical
  manifest.files.sort((a, b) => {
    if (a.group === 'Examples' && b.group !== 'Examples') return -1;
    if (a.group !== 'Examples' && b.group === 'Examples') return 1;
    return a.id.localeCompare(b.id);
  });

  // Ensure default exists
  const defaultFile = manifest.files.find(f => f.id === manifest.default);
  if (!defaultFile && manifest.files.length > 0) {
    manifest.default = manifest.files[0].id;
  }

  const manifestPath = path.join(baseDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Generated ${manifestPath} with ${manifest.files.length} entries.`);
}

targetDirs.forEach(generateManifestJson);
