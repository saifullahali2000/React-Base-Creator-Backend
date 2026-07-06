import { extractVitestCriticalHints } from './readmeQuality.js';

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

> ### _Things to Keep in Mind_
>
> - All components you implement should go in the \`src/components\` directory.
> - Don't change the component folder names as those are the files being imported into the tests.

FORBIDDEN in question_text:
- Flat ### sections without <details>; skipping video or Resources (Colors + Font-families)
- **Repeating the same section** (Design Files, Setup, Completion, etc.) more than once — each section appears exactly once
- Empty or nested empty <details></details> placeholders inside any section
- SVG Icons or Image URLs sections when the solution does not use them (omit entirely — no "not used" placeholders)
- "No design files were provided" without route bullets in Design Files
- Setup with "npm test" or "clone repository"
- Thin Completion Instructions (must list every feature, label, route, and data shape like the reference README)`;

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

/** Remove SVG Icons / Image URLs blocks when solution does not use them (LLM may add placeholders). */
function stripUnusedResourceSubsections(text, solution) {
  let out = text;
  const hasIcons = Object.keys(solution || {}).some((p) =>
    /components\/Icons\/index\.(jsx|tsx|js)$/i.test(p.replace(/\\/g, '/')),
  );
  const hasImages = extractImageUrls(solution || {}).length > 0;

  if (!hasIcons) {
    out = out.replace(
      /<details>\s*<summary>\s*SVG Icons\s*<\/summary>[\s\S]*?<\/details>\s*/gi,
      '',
    );
  }
  if (!hasImages) {
    out = out.replace(
      /<details>\s*<summary>\s*Image URLs\s*<\/summary>[\s\S]*?<\/details>\s*/gi,
      '',
    );
  }
  return out;
}

const SECTION_END_LOOKAHEAD = '(?=^###\\s+|^>\\s+###|(?![\\s\\S]))';

/**
 * @param {string} text
 * @param {string[]} headingVariants
 * @returns {string[]}
 */
function extractAllSectionBodies(text, ...headingVariants) {
  const bodies = [];
  for (const heading of headingVariants) {
    const re = new RegExp(
      `^###\\s+${escapeRegExp(heading)}\\s*$\\s*([\\s\\S]*?)${SECTION_END_LOOKAHEAD}`,
      'gm',
    );
    let m;
    while ((m = re.exec(text)) !== null) {
      bodies.push(m[1].trim());
    }
  }
  return bodies;
}

/** Top-level <details> siblings (LLM often repeats the same block several times). */
function extractTopLevelDetailsBlocks(html) {
  const blocks = [];
  const lower = (html || '').toLowerCase();
  let i = 0;

  while (i < html.length) {
    const start = lower.indexOf('<details', i);
    if (start === -1) break;

    const openEnd = html.indexOf('>', start);
    if (openEnd === -1) break;

    let depth = 1;
    let pos = openEnd + 1;

    while (depth > 0 && pos < html.length) {
      const nextOpen = lower.indexOf('<details', pos);
      const nextClose = lower.indexOf('</details>', pos);
      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        pos = nextOpen + 8;
      } else {
        depth -= 1;
        if (depth === 0) {
          blocks.push(html.slice(start, nextClose + '</details>'.length));
          i = nextClose + '</details>'.length;
        } else {
          pos = nextClose + '</details>'.length;
        }
      }
    }

    if (depth !== 0) break;
  }

  return blocks;
}

/** Pick the richest <details> sibling (or flattened body) inside one ### section. */
function pickBestDetailsContent(sectionRaw) {
  const blocks = extractTopLevelDetailsBlocks(sectionRaw);
  if (!blocks.length) {
    return stripAllDetailsWrappers(sectionRaw);
  }

  const candidates = blocks
    .map((block) => stripAllDetailsWrappers(block))
    .filter((b) => b && !isEffectivelyEmpty(b));
  if (!candidates.length) {
    return stripAllDetailsWrappers(sectionRaw);
  }

  const substantive = candidates.filter(isSubstantiveSection);
  const pool = substantive.length ? substantive : candidates;
  return pool.sort((a, b) => b.length - a.length)[0];
}

/** Pick the richest duplicate section body (LLM often repeats sections). */
function extractBestSectionBody(text, ...headingVariants) {
  const bodies = extractAllSectionBodies(text, ...headingVariants)
    .map((raw) => pickBestDetailsContent(raw))
    .filter((b) => b && !isEffectivelyEmpty(b));
  if (!bodies.length) return '';

  const substantive = bodies.filter(isSubstantiveSection);
  const pool = substantive.length ? substantive : bodies;
  return pool.sort((a, b) => b.length - a.length)[0];
}

/** Remove sections that are always rebuilt from solution / test_cases. */
function stripRebuiltSectionsFromSource(text) {
  let t = text;
  const headingPatterns = [
    'Resources',
    'Test Contract \\(Must Match Exactly\\)',
    'Test Contract',
  ];
  for (const h of headingPatterns) {
    const re = new RegExp(`^###\\s+${h}\\s*$[\\s\\S]*?${SECTION_END_LOOKAHEAD}`, 'gm');
    t = t.replace(re, '');
  }
  t = t.replace(/<details>\s*<summary>\s*Colors\s*<\/summary>[\s\S]*?<\/details>/gi, '');
  t = t.replace(/<details>\s*<summary>\s*Font-families\s*<\/summary>[\s\S]*?<\/details>/gi, '');
  t = t.replace(/<details>\s*<summary>\s*Image URLs\s*<\/summary>[\s\S]*?<\/details>/gi, '');
  t = t.replace(/<details>\s*<summary>\s*SVG Icons\s*<\/summary>[\s\S]*?<\/details>/gi, '');
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * @param {string} text
 * @param {string[]} headingVariants
 */
function extractSectionRaw(text, ...headingVariants) {
  return extractBestSectionBody(text, ...headingVariants);
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
  let head = firstH3 === -1 ? text : text.slice(0, firstH3);
  head = head.replace(/\*\*Refer to the below video\.\*\*[\s\S]*?<br\s*\/?>\s*/gi, '');
  const titleMatch = head.match(/^##\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Application';

  const bodyAfterTitle = head.replace(/^##\s+.+\n?/, '').trim();
  const introLine =
    bodyAfterTitle.split('\n').find((l) => l.trim() && /in this project/i.test(l)) ||
    bodyAfterTitle.split('\n').find((l) => l.trim()) ||
    '';

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
      rows.push({ usage: 'Newspaper / product image', url: m[1] });
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
  fontsBody += '```\n' + fonts + '\n```\n\n</details>\n';

  let resources = `### Resources\n\n${colorsBody}${fontsBody}`;

  const iconsFile = Object.entries(solution).find(([p]) =>
    /components\/Icons\/index\.(jsx|tsx|js)$/i.test(p.replace(/\\/g, '/')),
  );
  const iconNames = iconsFile
    ? [...iconsFile[1].matchAll(/export\s+(?:const|function)\s+(Icon\w+)/g)].map((m) => m[1])
    : [];

  if (iconNames.length) {
    let iconsBody = '<details>\n<summary>SVG Icons</summary>\n<br/>\n\n';
    iconsBody += '| Icon | Usage |\n|------|-------|\n';
    iconsBody += iconNames.map((n) => `| \`${n}\` | Used in UI |\n`).join('');
    iconsBody += '\n\n</details>\n';
    resources += `\n${iconsBody}`;
  }

  const images = extractImageUrls(solution);
  if (images.length) {
    let imagesBody = '<details>\n<summary>Image URLs</summary>\n\n';
    imagesBody += '| Usage | URL |\n|-------|-----|\n';
    imagesBody += images.map((r) => `| ${r.usage} | ${r.url} |\n`).join('');
    imagesBody += '\n\n</details>\n';
    resources += `\n${imagesBody}`;
  }

  return resources.trimEnd() + '\n';
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

function mergeAdditionalWithVitestHints(additionalBody, generated) {
  const base = prepareSectionBody(additionalBody);
  const hints = extractVitestCriticalHints(generated?.tests);
  if (!hints.length) {
    return base || '_See Test Contract for exact assertions._';
  }

  const missing = hints.filter((hint) => {
    const testId = hint.match(/data-testid="([^"]+)"/)?.[1];
    if (testId && base.includes(testId)) return false;
    const quoted = hint.match(/"([^"]{4,})"/)?.[1];
    if (quoted && base.includes(quoted)) return false;
    const cls = hint.match(/\.([a-z0-9_-]+)/i)?.[1];
    if (cls && base.includes(cls)) return false;
    return true;
  });

  if (!missing.length) return base || '_See Test Contract for exact assertions._';

  const extra = missing.map((h) => `- ${h}`).join('\n');
  if (!base || base.startsWith('_See Test Contract')) {
    return extra;
  }
  return `${base}\n\n${extra}`;
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
    `^###\\s+${escapeRegExp(afterHeading)}\\s*$\\s*([\\s\\S]*?)(?=^###\\s+(?:${before})\\b|(?![\\s\\S]))`,
    'im',
  );
  const m = text.match(re);
  if (!m) return '';
  return stripAllDetailsWrappers(m[1]);
}

/**
 * @param {string} qt
 * @param {{ solution?: Record<string, string>; ideCoding?: { test_cases?: Array<{ display_text: string }> } }} generated
 */
function rebuildPortalQuestionText(qt, generated) {
  const solution = generated.solution || {};
  const source = stripRebuiltSectionsFromSource(qt);
  const { title, intro } = extractPreamble(source);

  const designRaw = extractBestSectionBody(source, 'Design Files');
  let completionRaw = extractBestSectionBody(source, 'Completion Instructions');
  const apiRaw = extractBestSectionBody(source, 'API Requests & Responses');
  const importantRaw = extractBestSectionBody(source, 'Important Note', 'Important Notes');
  const additionalRaw = extractBestSectionBody(
    source,
    'Additional Test-Critical Requirements',
  );

  if (!isSubstantiveSection(completionRaw)) {
    completionRaw = extractFlatFeatureBlock(
      source,
      'Completion Instructions',
      ['Important Note', 'Important Notes', 'Additional Test-Critical', 'Test Contract', 'Resources'],
    );
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
    wrapDetails('Set Up Instructions', 'Click to view', normalizeSetupContent('')),
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
      mergeAdditionalWithVitestHints(additionalRaw, generated),
    ),
    '',
    buildTestContractSection(generated.ideCoding?.test_cases || []),
    '',
    buildResourcesSection(solution),
    '',
    FOOTER_BLOCK,
  );

  return stripUnusedResourceSubsections(
    stripEmptyDetailsTags(parts.filter(Boolean).join('\n')),
    solution,
  ).trimEnd();
}

/**
 * Restructure flat LLM question_text into portal README format.
 * @param {{ solution?: Record<string, string>; ideCoding?: { question_text?: string; short_text?: string; test_cases?: Array<{ display_text: string }> }; projectName?: string }} generated
 */
export function normalizePortalQuestionText(generated) {
  if (!generated?.ideCoding?.question_text) return generated;

  generated.ideCoding.question_text = `${rebuildPortalQuestionText(
    generated.ideCoding.question_text,
    generated,
  )}\n`;
  return generated;
}

function normalizeSetupContent(_raw) {
  return '- Download dependencies by running `npm install`\n- Start up the app using `npm run dev`';
}

/** @deprecated use normalizePortalQuestionText */
export function enrichQuestionTextResources(generated) {
  return normalizePortalQuestionText(generated);
}
