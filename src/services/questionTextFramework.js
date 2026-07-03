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

/** Remove all <details>/<summary> wrappers; keep inner markdown. */
function stripAllDetailsWrappers(body) {
  let s = (body || '').trim();
  let prev;
  do {
    prev = s;
    s = s.replace(/<details>\s*<summary>[\s\S]*?<\/summary>\s*(?:<br\s*\/?>)?\s*/gi, '');
    s = s.replace(/<\/details>/gi, '');
    s = s.replace(/<details>\s*<\/details>/gi, '');
  } while (s !== prev);
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

/** @param {string} body */
function isEffectivelyEmpty(body) {
  const s = stripAllDetailsWrappers(body);
  if (!s) return true;
  if (/^[_*]*\s*(see|no |n\/a)/i.test(s) && s.length < 80) return false;
  return !s.replace(/[_*`#\s-]/g, '').length;
}

/** Section has real instructions (not just boilerplate or empty details). */
function isSubstantiveSection(body) {
  const s = stripAllDetailsWrappers(body);
  const stripped = s
    .replace(/\*\*The following instructions are required for the tests to pass\*\*/gi, '')
    .replace(/The app must have the following functionalities:\s*/gi, '')
    .trim();
  if (!stripped) return false;
  return /^(#{1,4}\s|-\s|\d+\.\s)/m.test(stripped) || stripped.length > 60;
}

function stripEmptyDetailsTags(text) {
  let s = text;
  let prev;
  do {
    prev = s;
    s = s.replace(/<details>\s*<\/details>/gi, '');
  } while (s !== prev);
  return s;
}

/**
 * @param {string} text
 * @param {string[]} headingVariants
 */
function extractSectionRaw(text, ...headingVariants) {
  for (const heading of headingVariants) {
    const re = new RegExp(
      `^###\\s+${escapeRegExp(heading)}\\s*$\\s*([\\s\\S]*?)(?=^###\\s+|^>\\s+###|$)`,
      'im',
    );
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return '';
}

/** @param {string} raw @param {string} [fallback] */
function prepareSectionBody(raw, fallback = '') {
  const body = stripAllDetailsWrappers(raw);
  if (!isEffectivelyEmpty(body)) return body;
  const fb = stripAllDetailsWrappers(fallback);
  return isEffectivelyEmpty(fb) ? '' : fb;
}

/** @deprecated single-layer unwrap — prefer stripAllDetailsWrappers */
function unwrapDetails(body) {
  return stripAllDetailsWrappers(body);
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
      [...cssBlob.matchAll(/font-family:\s*([^;}\n]+)/gi)]
        .map((m) => m[1].trim().replace(/['"]/g, '').trim())
        .filter((f) => f && !/^inherit$/i.test(f)),
    ),
  ];
  return fonts.length ? fonts.join('\n') : 'Inter, sans-serif';
}

/** @param {Record<string, string>} solution */
function extractImageUrls(solution) {
  const seen = new Set();
  const rows = [];

  for (const [path, content] of Object.entries(solution)) {
    if (!/\.(jsx|tsx|js)$/i.test(path)) continue;
    const re = /(?:imageUrl|src)\s*[=:]\s*['"](https?:\/\/[^'"]+)['"]/gi;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
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
  const content = stripAllDetailsWrappers(body);
  const final = content.trim() || '_Content unavailable — see Test Contract._';
  return `### ${sectionTitle}\n<details>\n<summary>${summary}</summary>\n<br/>\n\n${final}\n\n</details>`;
}

/** @param {Array<{ display_text: string }>} testCases */
function buildTestContractSection(testCases) {
  if (!testCases?.length) return '';
  const bullets = testCases.map((tc) => `- ${tc.display_text}`).join('\n');
  return wrapDetails('Test Contract (Must Match Exactly)', 'Click to view', bullets);
}

function normalizeDesignFilesContent(raw, solution) {
  const body = prepareSectionBody(raw);
  if (!body || /no design files/i.test(body)) {
    return inferDesignRoutes(solution);
  }
  if (!/^-\s/m.test(body)) {
    return inferDesignRoutes(solution);
  }
  return body;
}

function normalizeImportantNoteContent(raw) {
  let body = prepareSectionBody(raw);
  if (!body) {
    return '**The following instructions are required for the tests to pass**\n\n_See Additional Test-Critical Requirements and Test Contract._';
  }
  if (!/required for the tests to pass/i.test(body)) {
    body = `**The following instructions are required for the tests to pass**\n\n${body}`;
  }
  return body;
}

/** Flat LLM sections (#### headings) between two ### headings */
function extractFlatFeatureBlock(text, afterHeading, beforeHeadings) {
  const before = beforeHeadings.map(escapeRegExp).join('|');
  const re = new RegExp(
    `^###\\s+${escapeRegExp(afterHeading)}\\s*$\\s*([\\s\\S]*?)(?=^###\\s+(?:${before})\\b|$)`,
    'im',
  );
  const m = text.match(re);
  if (!m) return '';
  return stripAllDetailsWrappers(m[1]);
}

function isAlreadyPortalFormatted(qt) {
  return (
    qt.includes('<video') &&
    /### Set Up Instructions/i.test(qt) &&
    /### Resources/i.test(qt) &&
    /<summary>Colors<\/summary>/i.test(qt)
  );
}

/**
 * Light repair when text already has portal shell but sections are hollow.
 * @param {string} qt
 * @param {{ solution?: Record<string, string>; ideCoding?: { test_cases?: Array<{ display_text: string }> } }} generated
 */
function repairPortalQuestionText(qt, generated) {
  const solution = generated.solution || {};

  const replaceSection = (source, title, summary, body) => {
    const block = wrapDetails(title, summary, body);
    const re = new RegExp(
      `^###\\s+${escapeRegExp(title)}\\s*$[\\s\\S]*?(?=^###\\s+|^>\\s+###|$)`,
      'im',
    );
    return re.test(source) ? source.replace(re, block) : source;
  };

  let out = qt;

  const designBody = prepareSectionBody(
    extractSectionRaw(qt, 'Design Files'),
    inferDesignRoutes(solution),
  );
  out = replaceSection(
    out,
    'Design Files',
    'Click to view',
    normalizeDesignFilesContent(designBody, solution),
  );

  out = replaceSection(out, 'Set Up Instructions', 'Click to view', normalizeSetupContent(''));

  let completionBody = prepareSectionBody(extractSectionRaw(qt, 'Completion Instructions'));
  if (!isSubstantiveSection(completionBody)) {
    completionBody = extractFlatFeatureBlock(
      qt,
      'Completion Instructions',
      ['Important Note', 'Important Notes', 'Additional Test-Critical', 'Test Contract', 'Resources'],
    );
  }
  if (!/^The app must have/i.test(completionBody)) {
    completionBody = `The app must have the following functionalities:\n\n${completionBody}`.trim();
  }
  out = replaceSection(out, 'Completion Instructions', 'Functionality to be added', completionBody);

  const importantBody = prepareSectionBody(
    extractSectionRaw(qt, 'Important Note', 'Important Notes'),
  );
  out = replaceSection(
    out,
    'Important Note',
    'Click to view',
    normalizeImportantNoteContent(importantBody),
  );

  const additionalBody = prepareSectionBody(
    extractSectionRaw(qt, 'Additional Test-Critical Requirements'),
  );
  out = replaceSection(
    out,
    'Additional Test-Critical Requirements',
    'Click to view',
    additionalBody || '_See Test Contract for exact assertions._',
  );

  const contract = buildTestContractSection(generated.ideCoding?.test_cases || []);
  if (contract) {
    const contractRe = /^### Test Contract[\s\S]*?(?=^### Resources\b|^> ###|$)/im;
    out = contractRe.test(out) ? out.replace(contractRe, contract + '\n\n') : `${out}\n\n${contract}`;
  }

  const resourcesRe = /^### Resources[\s\S]*?(?=^> ###|$)/im;
  const resources = buildResourcesSection(solution);
  out = resourcesRe.test(out) ? out.replace(resourcesRe, resources + '\n\n') : `${out}\n\n${resources}`;

  if (!/> ### _Things to Keep in Mind_/i.test(out)) {
    out += `\n\n${FOOTER_BLOCK}`;
  }

  return stripEmptyDetailsTags(out).trimEnd() + '\n';
}

/**
 * Restructure flat LLM question_text into portal README format.
 * @param {{ solution?: Record<string, string>; ideCoding?: { question_text?: string; short_text?: string; test_cases?: Array<{ display_text: string }> }; projectName?: string }} generated
 */
export function normalizePortalQuestionText(generated) {
  if (!generated?.ideCoding?.question_text) return generated;

  const solution = generated.solution || {};
  const qt = generated.ideCoding.question_text;

  if (isAlreadyPortalFormatted(qt)) {
    generated.ideCoding.question_text = repairPortalQuestionText(qt, generated);
    return generated;
  }

  const { title, intro } = extractPreamble(qt);

  const designRaw = extractSectionRaw(qt, 'Design Files');
  const setupRaw = extractSectionRaw(qt, 'Set Up Instructions', 'Setup Instructions');
  let completionRaw = extractSectionRaw(qt, 'Completion Instructions');
  const apiRaw = extractSectionRaw(qt, 'API Requests & Responses');
  const importantRaw = extractSectionRaw(qt, 'Important Note', 'Important Notes');
  const additionalRaw = extractSectionRaw(qt, 'Additional Test-Critical Requirements');

  if (isEffectivelyEmpty(completionRaw) || !isSubstantiveSection(completionRaw)) {
    completionRaw = extractFlatFeatureBlock(
      qt,
      'Completion Instructions',
      ['Important Note', 'Important Notes', 'Additional Test-Critical', 'Test Contract', 'Resources'],
    );
    if (isEffectivelyEmpty(completionRaw) || !isSubstantiveSection(completionRaw)) {
      const flat = qt
        .replace(/^##\s+.+\n?/m, '')
        .replace(/\n###\s+[\s\S]*/m, '')
        .trim();
      if (flat) completionRaw = flat;
    }
  }

  let completionBody = prepareSectionBody(completionRaw);
  if (!/^The app must have/i.test(completionBody)) {
    completionBody = `The app must have the following functionalities:\n\n${completionBody}`.trim();
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

  if (prepareSectionBody(apiRaw)) {
    parts.push('', wrapDetails('API Requests & Responses', 'Click to view', apiRaw));
  }

  parts.push(
    '',
    wrapDetails('Important Note', 'Click to view', normalizeImportantNoteContent(importantRaw)),
    '',
    wrapDetails(
      'Additional Test-Critical Requirements',
      'Click to view',
      prepareSectionBody(additionalRaw) || '_See Test Contract for exact assertions._',
    ),
    '',
    buildTestContractSection(generated.ideCoding.test_cases || []),
    '',
    buildResourcesSection(solution),
    '',
    FOOTER_BLOCK,
  );

  generated.ideCoding.question_text = stripEmptyDetailsTags(parts.filter((p) => p !== null).join('\n')).trimEnd() + '\n';
  return generated;
}

function normalizeSetupContent(_raw) {
  return '- Download dependencies by running `npm install`\n- Start up the app using `npm run dev`';
}

/** @deprecated use normalizePortalQuestionText */
export function enrichQuestionTextResources(generated) {
  return normalizePortalQuestionText(generated);
}
