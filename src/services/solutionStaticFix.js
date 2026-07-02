import { existsSync, readFileSync } from 'fs';
import { join, dirname, normalize } from 'path';
import { PREVIEW_WORKSPACE } from '../paths.js';
import { SAMPLE_SOLUTION_DIR } from './sampleTemplateMerge.js';

const SCAFFOLD_REL = [
  'package.json',
  'vite.config.js',
  'index.html',
  'src/main.jsx',
  'src/index.css',
  'public/vite.svg',
];

function tryReadUtf8(baseDir, rel) {
  const p = join(baseDir, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

function resolveImportPath(fromFile, importPath) {
  const fromDir = dirname(fromFile.replace(/\\/g, '/'));
  let target = normalize(join(fromDir, importPath)).replace(/\\/g, '/');
  if (!target.startsWith('src/')) return null;
  return target;
}

/** Add runtime deps when generated code imports packages missing from scaffold package.json. */
function augmentPackageJsonForImports(files) {
  const pkgKey = 'package.json';
  if (!files[pkgKey] || typeof files[pkgKey] !== 'string') return;
  let pkg;
  try {
    pkg = JSON.parse(files[pkgKey]);
  } catch {
    return;
  }
  const code = Object.entries(files)
    .filter(([k]) => k !== pkgKey && /\.(jsx|js|tsx|ts)$/i.test(k))
    .map(([, v]) => (typeof v === 'string' ? v : ''))
    .join('\n');
  const optionalDeps = {
    'prop-types': '^15.8.1',
  };
  for (const [dep, version] of Object.entries(optionalDeps)) {
    const pattern = new RegExp(`from\\s+['"]${dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
    if (pattern.test(code)) {
      pkg.dependencies = pkg.dependencies || {};
      pkg.dependencies[dep] = version;
    }
  }
  files[pkgKey] = JSON.stringify(pkg, null, 2);
}

/**
 * Merge AI solution with canonical Vite scaffold so builds match preview.
 * @param {Record<string, string>} solution
 * @returns {Record<string, string>}
 */
export function buildRunnableSolutionProject(solution) {
  const files = {};
  for (const rel of SCAFFOLD_REL) {
    const fromSample = tryReadUtf8(SAMPLE_SOLUTION_DIR, rel);
    const fromPreview = tryReadUtf8(PREVIEW_WORKSPACE, rel);
    const content = fromSample ?? fromPreview;
    if (content != null) files[rel] = content;
  }
  if (!files['package.json']) {
    files['package.json'] = JSON.stringify(
      {
        name: 'rqg-validate',
        private: true,
        type: 'module',
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies: {
          react: '^19.1.0',
          'react-dom': '^19.1.0',
          'react-router-dom': '^7.11.0',
          'js-cookie': '^3.0.5',
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.6.0',
          vite: '^7.0.4',
        },
      },
      null,
      2,
    );
  }
  if (!files['vite.config.js']) {
    files['vite.config.js'] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;
  }
  if (!files['index.html']) {
    files['index.html'] = `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Preview</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>`;
  }
  if (!files['src/main.jsx']) {
    files['src/main.jsx'] = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
)
`;
  }

  for (const [rel, content] of Object.entries(solution || {})) {
    if (rel === 'readme.md') continue;
    if (typeof content !== 'string') continue;
    files[rel.replace(/\\/g, '/')] = content;
  }

  augmentPackageJsonForImports(files);

  return files;
}

/**
 * Cheap fixes before Vite build (missing CSS imports, etc.).
 * @param {{ solution?: Record<string, string> }} generated
 */
export function applyStaticSolutionFixes(generated) {
  if (!generated?.solution || typeof generated.solution !== 'object') return generated;

  const sol = generated.solution;
  const keys = new Set(Object.keys(sol).map((k) => k.replace(/\\/g, '/')));

  for (const [path, content] of Object.entries(sol)) {
    if (typeof content !== 'string') continue;
    if (!/\.(jsx|tsx|js|ts)$/i.test(path)) continue;

    let fixed = content;
    for (const m of content.matchAll(/import\s+['"](\.\/[^'"]+\.css)['"]\s*;?/g)) {
      const cssRel = resolveImportPath(path, m[1]);
      if (cssRel && !keys.has(cssRel)) {
        fixed = fixed.replace(m[0], '');
      }
    }

    if (!/export\s+default/.test(fixed) && /function\s+\w+|const\s+\w+\s*=/.test(fixed)) {
      const nameMatch = fixed.match(/(?:function|const)\s+([A-Z]\w*)/);
      if (nameMatch && !fixed.includes(`export default ${nameMatch[1]}`)) {
        fixed = `${fixed.trim()}\n\nexport default ${nameMatch[1]};\n`;
      }
    }

    sol[path] = fixed;
  }

  return generated;
}
