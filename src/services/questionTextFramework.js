/**
 * Portal question_text / readme.md structure (matches Sample_Folder/Ecommerce_Solution/README.md).
 * Backend normalizes LLM output — do not rely on the model alone.
 */

export const QUESTION_TEXT_FRAMEWORK = `QUESTION TEXT (ideCoding.question_text) — PORTAL README FORMAT (mandatory):

Copy this skeleton structure EXACTLY (replace {placeholders}; keep every <details> block):

## {Project Name} — {App Type}

In this project, let's build a **{Full Project Title}** .

**Refer to the below video.**
<video width="320" height="240" controls>
<source src="" type="video/mp4">
  Your browser does not support the video tag.
</video>

<br/>

### Design Files
<details>
<summary>Click to view</summary>

- Home Route (\`/\`)

</details>

### Set Up Instructions
<details>
<summary>Click to view</summary>

- Download dependencies by running \`npm install\`
- Start up the app using \`npm run dev\`

</details>

### Completion Instructions
<details>
<summary>Functionality to be added</summary>
<br/>

The app must have the following functionalities:

**{Feature group}**
- (exact requirements, labels, routes)

</details>

### Important Note
<details>
<summary>Click to view</summary>
<br/>

**The following instructions are required for the tests to pass**

(exact strings for tests)

</details>

### Additional Test-Critical Requirements
<details>
<summary>Click to view</summary>
<br/>

(exact UI copy, data-testid, aria-labels)

</details>

### Test Contract (Must Match Exactly)
<details>
<summary>Click to view</summary>
<br/>

- The page should render ...

</details>

### Resources

<details>
<summary>Colors</summary>
<br/>

**Primary / Brand Color**
- <div style="background-color: #1a1a1a; width: 150px; padding: 10px; color: white; box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\\#1a1a1a</div>

</details>

<details>
<summary>Font-families</summary>

\`\`\`
Inter, sans-serif
\`\`\`

</details>

<details>
<summary>SVG Icons</summary>
<br/>

(table or _No custom SVG icon components in this project._)

</details>

> ### _Things to Keep in Mind_
>
> - All components you implement should go in the \`src/components\` directory.
> - Don't change the component folder names as those are the files being imported into the tests.

FORBIDDEN: flat ### sections without <details>; skipping video/Resources; "No design files were provided" without route bullets; Setup with "npm test" or "clone repository".`;

const VIDEO_BLOCK = `**Refer to the below video.**
<video width="320" height="240" controls>
<source src="" type="video/mp4">
  Your browser does not support the video tag.
</video>

<br/>`;

const FOOTER_BLOCK = `> ### _Things to Keep in Mind_
>
> - All components you implement should go in the \`src/components\` directory.
> - Don't change the component folder names as those are the files being imported into the tests.`;

const SECTION_HEADINGS = [
  'Design Files',
  'Set Up Instructions',
  'Setup Instructions',
  'Completion Instructions',
  'API Requests & Responses',
  'Important Note',
  'Important Notes',
  'Additional Test-Critical Requirements',
  'Test Contract',
  'Test Contract (Must Match Exactly)',
  'Resources',
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} body */
function unwrapDetails(body) {
  const trimmed = body.trim();
  const m = trimmed.match(
    /^<details>\s*<summary>[\s\S]*?<\/summary>\s*(?:<br\s*\/?>)?\s*([\s\S]*?)<\/details>\s*$/i,
  );
  return m ? m[1].trim() : trimmed;
}

/**
 * @param {string} text
 * @param {string[]} headingVariants
 */
function extractSection(text, ...headingVariants) {
  for (const heading of headingVariants) {
    const re = new RegExp(
      `^###\\s+${escapeRegExp(heading)}\\s*$\\s*([\\s\\S]*?)(?=^###\\s+|^>\\s+###|$)`,
      'im',
    );
    const m = text.match(re);
    if (m) return unwrapDetails(m[1].trim());
  }
  return '';
}

/** @param {string} text */
function extractPreamble(text) {
  const firstH3 = text.search(/^###\s+/m);
  const head = firstH3 === -1 ? text : text.slice(0, firstH3);
  const titleMatch = head.match(/^##\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Application';

  const bodyAfterTitle = head.replace(/^##\s+.+\n?/, '').trim();
  const introLine = bodyAfterTitle.split('\n').find((l) => l.trim() && !l.includes('<video')) || '';

  let intro;
  if (/in this project/i.test(introLine)) {
    intro = introLine.trim();
    if (!intro.endsWith(' .') && !intro.endsWith('.')) intro += ' .';
  } else {
    intro = `In this project, let's build a **${title}** .`;
  }

  return { title, intro };
}

/** @param {Record<string, string>} solution */
function inferDesignRoutes(solution) {
  const blobs = Object.entries(solution)
    .filter(([p]) => /\.(jsx|tsx|js)$/i.test(p))
    .map(([, c]) => c)
    .join('\n');

  const paths = [
    ...blobs.matchAll(/<Route[^>]+path=['"]([^'"]+)['"]/g),
    ...blobs.matchAll(/path:\s*['"]([^'"]+)['"]/g),
  ].map((m) => m[1]);

  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return '- Home Route (`/`)';

  return unique
    .map((p) => {
      const label = p === '/' ? 'Home' : p.replace(/^\//, '').replace(/[/:]/g, ' ').trim() || p;
      const name = label.charAt(0).toUpperCase() + label.slice(1);
      return `- ${name} Route (\`${p}\`)`;
    })
    .join('\n');
}

/** @param {string} hex */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full =
    h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** @param {string} hex */
function isLightHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

/** @param {string} hex */
function colorCategory(hex) {
  const h = hex.toLowerCase();
  const accent = new Set([
    '#e11d48',
    '#dc2626',
    '#ef4444',
    '#16a34a',
    '#22c55e',
    '#f59e0b',
    '#fff1f2',
    '#dcfce7',
    '#fecdd3',
    '#fee2e2',
    '#bbf7d0',
  ]);
  if (accent.has(h)) return 'Accent / Status Colors';

  const { r, g, b } = hexToRgb(h);
  const lum = (r * 299 + g * 587 + b * 114) / 1000;

  if (lum > 245) return 'Background Colors';
  if (lum < 35) return 'Primary / Brand Color';
  if (r > 200 && g > 200 && b > 200 && lum < 245) return 'Border Colors';
  if (lum < 200) return 'Text Colors';
  return 'Background Colors';
}

function colorSwatchLine(hex) {
  const fg = isLightHex(hex) ? 'black' : 'white';
  const border = isLightHex(hex) ? 'border: 1px solid #e5e7eb;' : '';
  return `- <div style="background-color: ${hex}; width: 150px; padding: 10px; color: ${fg}; ${border} box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\\${hex}</div>`;
}

/** @param {Record<string, string>} solution */
function extractFontsFromSolution(solution) {
  const cssBlob = Object.entries(solution)
    .filter(([p]) => /\.css$/i.test(p))
    .map(([, c]) => c)
    .join('\n');

  const fonts = [
    ...new Set(
      [...cssBlob.matchAll(/font-family:\s*([^;}\n]+)/gi)].map((m) =>
        m[1].trim().replace(/^['"]|['"]$/g, ''),
      ),
    ),
  ];
  return fonts.length ? fonts.join('\n') : 'Inter, sans-serif';
}

/** @param {Record<string, string>} solution */
function extractImageUrls(solution) {
  const rows = [];
  for (const [path, content] of Object.entries(solution)) {
    if (!/\.(jsx|tsx|js)$/i.test(path)) continue;
    for (const m of content.matchAll(/(?:imageUrl|src)=['"](https?:\/\/[^'"]+)['"]/g)) {
      rows.push({ usage: path.replace(/\\/g, '/'), url: m[1] });
    }
  }
  return rows;
}

/** @param {Record<string, string>} solution */
function buildResourcesSection(solution) {
  const cssBlob = Object.entries(solution)
    .filter(([p]) => /\.css$/i.test(p))
    .map(([, c]) => c)
    .join('\n');

  const hexes = [
    ...new Set((cssBlob.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/g) || []).map((h) => h.toLowerCase())),
  ];

  const grouped = new Map();
  for (const hex of hexes) {
    const cat = colorCategory(hex);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat).push(hex);
  }

  const catOrder = [
    'Primary / Brand Color',
    'Background Colors',
    'Border Colors',
    'Text Colors',
    'Accent / Status Colors',
  ];

  let colorsBody = '<details>\n<summary>Colors</summary>\n<br/>\n\n';
  if (!hexes.length) {
    colorsBody += '_No hex colors detected in solution CSS._\n';
  } else {
    for (const cat of catOrder) {
      const list = grouped.get(cat);
      if (!list?.length) continue;
      colorsBody += `**${cat}**\n\n`;
      colorsBody += list.map(colorSwatchLine).join('\n');
      colorsBody += '\n\n';
    }
  }
  colorsBody += '</details>\n\n';

  const fonts = extractFontsFromSolution(solution);
  let fontsBody = '<details>\n<summary>Font-families</summary>\n\n';
  fontsBody += '```\n' + fonts + '\n```\n\n</details>\n\n';

  const iconsFile = Object.entries(solution).find(([p]) =>
    /components\/Icons\/index\.(jsx|tsx|js)$/i.test(p.replace(/\\/g, '/')),
  );
  const iconNames = iconsFile
    ? [...iconsFile[1].matchAll(/export\s+(?:const|function)\s+(Icon\w+)/g)].map((m) => m[1])
    : [];

  let iconsBody = '<details>\n<summary>SVG Icons</summary>\n<br/>\n\n';
  if (iconNames.length) {
    iconsBody += '| Icon | Usage |\n|------|-------|\n';
    iconsBody += iconNames.map((n) => `| \`${n}\` | Used in UI |\n`).join('');
  } else {
    iconsBody += '_No custom SVG icon components in this project._\n';
  }
  iconsBody += '\n\n</details>\n\n';

  const images = extractImageUrls(solution);
  let imagesBody = '<details>\n<summary>Image URLs</summary>\n\n';
  if (images.length) {
    imagesBody += '| Usage | URL |\n|-------|-----|\n';
    imagesBody += images.map((r) => `| ${r.usage} | ${r.url} |\n`).join('');
  } else {
    imagesBody += '_No external image URLs in solution source._\n';
  }
  imagesBody += '\n\n</details>\n';

  return `### Resources\n\n${colorsBody}${fontsBody}${iconsBody}${imagesBody}`;
}

function wrapDetails(sectionTitle, summary, body) {
  const content = body.trim() || '_See completion instructions above._';
  return `### ${sectionTitle}\n<details>\n<summary>${summary}</summary>\n<br/>\n\n${content}\n\n</details>`;
}

/** @param {Array<{ display_text: string }>} testCases */
function buildTestContractSection(testCases) {
  if (!testCases?.length) return '';
  const bullets = testCases.map((tc) => `- ${tc.display_text}`).join('\n');
  return wrapDetails('Test Contract (Must Match Exactly)', 'Click to view', bullets);
}

function normalizeDesignFilesContent(raw, solution) {
  const body = raw.trim();
  if (!body || /no design files/i.test(body)) {
    return inferDesignRoutes(solution);
  }
  if (/^-\s/m.test(body) && !/^<details>/i.test(body)) return body;
  return body;
}

function normalizeSetupContent(_raw) {
  return '- Download dependencies by running `npm install`\n- Start up the app using `npm run dev`';
}

function normalizeImportantNoteContent(raw) {
  let body = raw.trim();
  if (!body) return '**The following instructions are required for the tests to pass**\n\n_See Additional Test-Critical Requirements and Test Contract._';
  if (!/required for the tests to pass/i.test(body)) {
    body = `**The following instructions are required for the tests to pass**\n\n${body}`;
  }
  return body;
}

/**
 * Restructure flat LLM question_text into portal README format.
 * @param {{ solution?: Record<string, string>; ideCoding?: { question_text?: string; short_text?: string; test_cases?: Array<{ display_text: string }> }; projectName?: string }} generated
 */
export function normalizePortalQuestionText(generated) {
  if (!generated?.ideCoding?.question_text) return generated;

  const solution = generated.solution || {};
  const qt = generated.ideCoding.question_text;
  const { title, intro } = extractPreamble(qt);

  const designRaw = extractSection(qt, 'Design Files');
  const setupRaw = extractSection(qt, 'Set Up Instructions', 'Setup Instructions');
  const completionRaw = extractSection(qt, 'Completion Instructions');
  const apiRaw = extractSection(qt, 'API Requests & Responses');
  const importantRaw = extractSection(qt, 'Important Note', 'Important Notes');
  const additionalRaw = extractSection(qt, 'Additional Test-Critical Requirements');

  let completionBody = completionRaw;
  if (!completionBody) {
    completionBody = 'The app must have the following functionalities:\n\n';
    completionBody += qt
      .replace(/^##\s+.+\n?/m, '')
      .replace(/^###\s+[\s\S]*/m, '')
      .trim();
  }
  if (!/^The app must have/i.test(completionBody)) {
    completionBody = `The app must have the following functionalities:\n\n${completionBody}`;
  }

  const parts = [
    `## ${title}`,
    '',
    intro,
    '',
    VIDEO_BLOCK,
    '',
    wrapDetails('Design Files', 'Click to view', normalizeDesignFilesContent(designRaw, solution)),
    '',
    wrapDetails('Set Up Instructions', 'Click to view', normalizeSetupContent(setupRaw)),
    '',
    wrapDetails('Completion Instructions', 'Functionality to be added', completionBody),
  ];

  if (apiRaw.trim()) {
    parts.push('', wrapDetails('API Requests & Responses', 'Click to view', apiRaw));
  }

  parts.push(
    '',
    wrapDetails('Important Note', 'Click to view', normalizeImportantNoteContent(importantRaw)),
    '',
    wrapDetails(
      'Additional Test-Critical Requirements',
      'Click to view',
      additionalRaw.trim() || '_See Test Contract for exact assertions._',
    ),
    '',
    buildTestContractSection(generated.ideCoding.test_cases || []),
    '',
    buildResourcesSection(solution),
    '',
    FOOTER_BLOCK,
  );

  generated.ideCoding.question_text = parts.filter((p) => p !== null).join('\n');
  return generated;
}

/** @deprecated use normalizePortalQuestionText */
export function enrichQuestionTextResources(generated) {
  return normalizePortalQuestionText(generated);
}
