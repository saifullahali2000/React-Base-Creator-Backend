import archiver from 'archiver';

const toKebab = (name) => name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

const BASE_PKG = (name) =>
  JSON.stringify(
    {
      name: toKebab(name),
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        lint: 'eslint .',
        preview: 'vite preview',
        test: 'vitest',
      },
      dependencies: {
        'js-cookie': '^3.0.5',
        react: '^19.1.0',
        'react-dom': '^19.1.0',
        'react-router': '^7.12.0',
        'react-router-dom': '^7.11.0',
      },
      devDependencies: {
        '@eslint/js': '^9.30.1',
        '@testing-library/jest-dom': '^6.9.1',
        '@testing-library/react': '^16.3.1',
        '@testing-library/user-event': '^14.6.1',
        '@types/react': '^19.1.8',
        '@types/react-dom': '^19.1.6',
        '@vitejs/plugin-react': '^4.6.0',
        eslint: '^9.30.1',
        'eslint-plugin-react-hooks': '^5.2.0',
        'eslint-plugin-react-refresh': '^0.4.20',
        globals: '^16.3.0',
        history: '^5.3.0',
        jsdom: '^26.1.0',
        msw: '^2.12.7',
        vite: '^7.0.4',
        vitest: '^3.2.4',
      },
    },
    null,
    2
  );

const TESTS_PKG = (name) =>
  JSON.stringify(
    {
      name: toKebab(name),
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'export NODE_OPTIONS="--max-old-space-size=4096" && vite',
        build: 'export NODE_OPTIONS="--max-old-space-size=4096" && vite build',
        lint: 'eslint .',
        preview: 'vite preview',
        test: 'vitest --run',
        preinstall: 'pnpm install ~/.ccbp/ccbp-jest-reporter',
      },
      dependencies: {
        'js-cookie': '^3.0.5',
        react: '^19.1.0',
        'react-dom': '^19.1.0',
        'react-router': '^7.12.0',
        'react-router-dom': '^7.11.0',
      },
      devDependencies: {
        '@eslint/js': '9.21.0',
        '@testing-library/dom': '10.4.0',
        '@testing-library/jest-dom': '6.6.3',
        '@testing-library/react': '16.2.0',
        '@testing-library/user-event': '14.6.1',
        '@types/react': '19.0.10',
        '@types/react-dom': '19.0.4',
        '@vitejs/plugin-react': '4.3.4',
        eslint: '9.21.0',
        'eslint-plugin-jsx-a11y': '6.10.2',
        'eslint-plugin-prettier': '5.2.3',
        'eslint-plugin-react': '7.37.4',
        'eslint-plugin-react-hooks': '5.1.0',
        'eslint-plugin-react-refresh': '0.4.19',
        'vite-plugin-eslint': '1.8.1',
        globals: '^16.3.0',
        history: '^5.3.0',
        jsdom: '^26.1.0',
        msw: '^2.12.7',
        vite: '^7.0.4',
        vitest: '^3.2.4',
      },
    },
    null,
    2
  );

const SOLUTION_VITE = `import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    outDir: 'build',
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/setupTests.js',
  },
})
`;

const TESTS_VITE = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { configDefaults } from "vitest/config";
import { CCBPVitestReporter } from "ccbp-jest-reporter/lib/vitestReporter";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  build: {
    outDir: "build",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "src/setupTests.js",
    include: ["**/*.test.{js,ts,jsx,tsx}"],
    exclude: [...configDefaults.exclude],
    reporters: ['verbose', new CCBPVitestReporter()],
  },
});
`;

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React</title>
    <script src="https://nxtwave-assessments-backend-nxtwave-media-static.s3.ap-south-1.amazonaws.com/external-scripts/ide-coding/ide_react_preview_adress_bar_bridge.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const MAIN_JSX = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

const SETUP_TESTS = `import '@testing-library/jest-dom/vitest'\n`;

const GITIGNORE = `node_modules\ndist\nbuild\n.env\n.DS_Store\n`;

const NVMRC = `22\n`;

const PRETTIERRC = `{\n  "singleQuote": true,\n  "semi": true\n}\n`;

const ESLINT_CONFIG = `import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'build'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
];
`;

const VITE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="31.88" height="32" viewBox="0 0 256 257"><defs><linearGradient id="a" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"/><stop offset="100%" stop-color="#BD34FE"/></linearGradient><linearGradient id="b" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FF3E00"/><stop offset="100%" stop-color="#FFA500"/></linearGradient></defs><path fill="url(#a)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"/><path fill="url(#b)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028 72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"/></svg>`;

function addBaseFiles(archive, prefix, pkgJson, viteCfg, existingPaths = new Set()) {
  const has = (rel) => existingPaths.has(rel);
  if (!has('package.json')) archive.append(pkgJson, { name: `${prefix}/package.json` });
  if (!has('vite.config.js')) archive.append(viteCfg, { name: `${prefix}/vite.config.js` });
  if (!has('index.html')) archive.append(INDEX_HTML, { name: `${prefix}/index.html` });
  if (!has('src/main.jsx')) archive.append(MAIN_JSX, { name: `${prefix}/src/main.jsx` });
  if (!has('src/setupTests.js')) archive.append(SETUP_TESTS, { name: `${prefix}/src/setupTests.js` });
  if (!has('.gitignore')) archive.append(GITIGNORE, { name: `${prefix}/.gitignore` });
  if (!has('.nvmrc')) archive.append(NVMRC, { name: `${prefix}/.nvmrc` });
  if (!has('.prettierrc')) archive.append(PRETTIERRC, { name: `${prefix}/.prettierrc` });
  if (!has('eslint.config.js')) archive.append(ESLINT_CONFIG, { name: `${prefix}/eslint.config.js` });
  if (!has('public/vite.svg')) archive.append(VITE_SVG, { name: `${prefix}/public/vite.svg` });
}

export function buildZip(generated, outputStream) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    archive.on('end', resolve);
    archive.pipe(outputStream);

    const mode = generated.generatorOptions?.assessmentMode || 'topin_base';
    const { projectName, solution, prefilled, tests, ideCoding } = generated;

    if (mode === 'open_book') {
      const sBase = `${projectName}_Solution`;
      const sol = solution || {};
      for (const [path, content] of Object.entries(sol)) {
        archive.append(content, { name: `${sBase}/${path}` });
      }
      addBaseFiles(archive, sBase, BASE_PKG(projectName), SOLUTION_VITE, new Set(Object.keys(sol)));
      archive.finalize();
      return;
    }

    // ── Topic base: prefilled + solution + tests + IDE JSON ─────────────

    const pBase = projectName;
    for (const [path, content] of Object.entries(prefilled || {})) {
      archive.append(content, { name: `${pBase}/${path}` });
    }
    addBaseFiles(archive, pBase, BASE_PKG(projectName), SOLUTION_VITE, new Set(Object.keys(prefilled || {})));

    const sBase = `${projectName}_Solution`;
    for (const [path, content] of Object.entries(solution || {})) {
      archive.append(content, { name: `${sBase}/${path}` });
    }
    addBaseFiles(archive, sBase, BASE_PKG(projectName), SOLUTION_VITE, new Set(Object.keys(solution || {})));

    const tBase = `${projectName}_Tests`;
    for (const [path, content] of Object.entries(tests || {})) {
      archive.append(content, { name: `${tBase}/${path}` });
    }
    const testKeys = new Set(Object.keys(tests || {}));
    if (!testKeys.has('package.json')) {
      archive.append(TESTS_PKG(projectName), { name: `${tBase}/package.json` });
    }
    if (!testKeys.has('vite.config.js')) {
      archive.append(TESTS_VITE, { name: `${tBase}/vite.config.js` });
    }
    if (!testKeys.has('src/setupTests.js')) {
      archive.append(SETUP_TESTS, { name: `${tBase}/src/setupTests.js` });
    }

    archive.append(JSON.stringify([ideCoding], null, 2), {
      name: `IDE_BASED_CODING/${ideCoding.question_id}.json`,
    });

    archive.finalize();
  });
}
