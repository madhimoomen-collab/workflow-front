const fs = require('fs');
const path = require('path');

const repoPath = path.resolve('.');
const outputPath = path.resolve('..', 'upload_manifest.json');

const excludedDirs = new Set(['.angular', 'dist', 'node_modules', '.git']);

function shouldExclude(fullPath) {
    const parts = fullPath.split(path.sep);
    for (const part of parts) {
        if (excludedDirs.has(part)) {
            return true;
        }
    }
    return false;
}

function getFilesRecursively(dir) {
    const files = [];
    
    function walk(currentPath) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            
            if (shouldExclude(fullPath)) {
                continue;
            }
            
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile()) {
                files.push(fullPath);
            }
        }
    }
    
    walk(dir);
    return files;
}

// Collect all files
const allFiles = getFilesRecursively(repoPath);
console.log(`Found ${allFiles.length} files after filtering`);

// Sort by relative path
const sortedFiles = allFiles
    .map(file => ({
        full: file,
        relative: path.relative(repoPath, file)
    }))
    .sort((a, b) => a.relative.localeCompare(b.relative));

// Process each file
const manifestFiles = [];

for (const file of sortedFiles) {
    let content;
    
    try {
        // Try to read as UTF-8 text
        content = fs.readFileSync(file.full, 'utf-8');
    } catch (error) {
        // If UTF-8 decode fails, use base64
        const bytes = fs.readFileSync(file.full);
        const b64 = bytes.toString('base64');
        content = `base64:${b64}`;
    }
    
    // Normalize path to forward slashes
    const normalizedPath = file.relative.replace(/\\/g, '/');
    
    manifestFiles.push({
        path: normalizedPath,
        content: content
    });
}

// Create manifest object
const manifest = {
    count: manifestFiles.length,
    files: manifestFiles
};

// Write JSON with pretty-print
const json = JSON.stringify(manifest, null, 2);
fs.writeFileSync(outputPath, json, 'utf-8');

console.log(`Manifest created: ${outputPath}`);
console.log(`Final count: ${manifest.count}`);
console.log('');
console.log('Included files:');
manifestFiles.forEach(file => console.log(file.path));
