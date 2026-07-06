/**
 * Validates portal readme / ideCoding.question_text after normalization.
 */

const REQUIRED_SECTIONS = [
  'Design Files',
  'Set Up Instructions',
  'Completion Instructions',
  'Important Note',
  'Additional Test-Critical Requirements',
  'Test Contract \\(Must Match Exactly\\)',
  'Resources',
];

const SECTION_END = '(?=^###\\s+|^>\\s+###|(?![\\s\\S]))';

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} text @param {string} headingPattern */
function sliceSection(text, headingPattern) {
  const re = new RegExp(`^###\\s+${headingPattern}\\s*$\\n?([\\s\\S]*?)${SECTION_END}`, 'm');
  const m = text.match(re);
  return m ? m[1] : '';
}

/** @param {string} sectionBody */
function countTopLevelDetails(sectionBody) {
  const lower = sectionBody.toLowerCase();
  let count = 0;
  let i = 0;
  while (i < sectionBody.length) {
    const start = lower.indexOf('<details', i);
    if (start === -1) break;
    count += 1;
    const openEnd = sectionBody.indexOf('>', start);
    if (openEnd === -1) break;
    let depth = 1;
    let pos = openEnd + 1;
    while (depth > 0 && pos < sectionBody.length) {
      const nextOpen = lower.indexOf('<details', pos);
      const nextClose = lower.indexOf('</details>', pos);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        pos = nextOpen + 8;
      } else {
        depth -= 1;
        if (depth === 0) i = nextClose + '</details>'.length;
        else pos = nextClose + '</details>'.length;
      }
    }
    if (depth !== 0) break;
  }
  return count;
}

/** @param {Record<string, string> | undefined} tests */
export function extractVitestCriticalHints(tests) {
  const hints = new Set();
  const blob = Object.values(tests || {})
    .filter((v) => typeof v === 'string')
    .join('\n');

  for (const m of blob.matchAll(/data-testid\s*=\s*['"{]([^'"}]+)['"}]/g)) {
    hints.add(`Must include data-testid="${m[1]}"`);
  }
  for (const m of blob.matchAll(/getByTestId\(\s*['"]([^'"]+)['"]/g)) {
    hints.add(`Must include data-testid="${m[1]}"`);
  }
  for (const m of blob.matchAll(/getByText\(\s*['"]([^'"]+)['"]/g)) {
    hints.add(`Exact visible text required: "${m[1]}"`);
  }
  for (const m of blob.matchAll(/getByPlaceholderText\(\s*['"]([^'"]+)['"]/g)) {
    hints.add(`Input placeholder must be: "${m[1]}"`);
  }
  for (const m of blob.matchAll(/getByLabelText\(\s*['"]([^'"]+)['"]/g)) {
    hints.add(`Label text must be: "${m[1]}"`);
  }
  for (const m of blob.matchAll(/querySelector\(\s*['"]\.([^'"]+)['"]/g)) {
    hints.add(`CSS class required: .${m[1]}`);
  }

  return [...hints];
}

/** @param {string} questionText */
function extractTestContractBullets(questionText) {
  const body = sliceSection(questionText, 'Test Contract \\(Must Match Exactly\\)');
  return [...body.matchAll(/^-\s+(.+)$/gm)].map((m) => m[1].trim());
}

/**
 * @param {{ ideCoding?: { question_text?: string; test_cases?: Array<{ display_text: string }> }; tests?: Record<string, string>; generatorOptions?: { assessmentMode?: string } }} generated
 */
export function evaluateReadmeQuality(generated) {
  const issues = [];
  const mode = generated?.generatorOptions?.assessmentMode;

  if (mode === 'open_book') {
    return { ok: true, issues: [], score: 100 };
  }

  const qt = generated?.ideCoding?.question_text;
  if (typeof qt !== 'string' || !qt.trim()) {
    return { ok: false, issues: ['question_text is missing or empty'], score: 0 };
  }

  const text = qt.trim();

  if (!/^##\s+.+/m.test(text)) {
    issues.push('Missing ## title heading');
  }
  if (!/\*\*Refer to the below video\.\*\*/i.test(text) || !/<video/i.test(text)) {
    issues.push('Missing video block');
  }
  if (!/> ### _Things to Keep in Mind_/i.test(text)) {
    issues.push('Missing footer blockquote (Things to Keep in Mind)');
  }

  for (const heading of REQUIRED_SECTIONS) {
    const label = heading.replace(/\\\(/g, '(').replace(/\\\)/g, ')');
    const count = (text.match(new RegExp(`^###\\s+${heading}\\s*$`, 'gm')) || []).length;
    if (count === 0) {
      issues.push(`Missing section: ${label}`);
    } else if (count > 1) {
      issues.push(`Duplicate section heading (${count}×): ${label}`);
    }
  }

  for (const heading of [
    'Design Files',
    'Set Up Instructions',
    'Completion Instructions',
    'Important Note',
    'Additional Test-Critical Requirements',
    'Test Contract \\(Must Match Exactly\\)',
  ]) {
    const body = sliceSection(text, heading);
    const detailsCount = countTopLevelDetails(body);
    if (detailsCount > 1) {
      issues.push(
        `Section "${heading.replace(/\\\(/g, '(').replace(/\\\)/g, ')')}" has ${detailsCount} <details> blocks (expected 1)`,
      );
    }
  }

  const colorsCount = (text.match(/<summary>\s*Colors\s*<\/summary>/gi) || []).length;
  if (colorsCount > 1) {
    issues.push(`Duplicate Resources/Colors blocks (${colorsCount}×)`);
  }
  const fontsCount = (text.match(/<summary>\s*Font-families\s*<\/summary>/gi) || []).length;
  if (fontsCount > 1) {
    issues.push(`Duplicate Font-families blocks (${fontsCount}×)`);
  }

  const resourcesIdx = text.search(/^###\s+Resources\s*$/m);
  if (resourcesIdx !== -1) {
    const afterResources = text.slice(resourcesIdx + 1);
    const orphanDetails = (afterResources.match(/<details>/gi) || []).length;
    const expectedDetails =
      1 +
      (/<summary>\s*SVG Icons\s*<\/summary>/i.test(afterResources) ? 1 : 0) +
      (/<summary>\s*Image URLs\s*<\/summary>/i.test(afterResources) ? 1 : 0);
    if (orphanDetails > expectedDetails + 1) {
      issues.push('Orphan <details> blocks after Resources section');
    }
  }

  const completionBody = sliceSection(text, 'Completion Instructions').replace(/<[^>]+>/g, ' ').trim();
  if (completionBody.length < 120) {
    issues.push('Completion Instructions are too thin');
  }

  const testCases = generated?.ideCoding?.test_cases || [];
  if (testCases.length) {
    const contractBullets = extractTestContractBullets(text);
    if (!contractBullets.length) {
      issues.push('Test Contract section has no bullets');
    } else {
      const expected = testCases.map((tc) => tc.display_text);
      const missing = expected.filter((d) => !contractBullets.includes(d));
      const extra = contractBullets.filter((d) => !expected.includes(d));
      if (missing.length) {
        issues.push(`Test Contract missing ${missing.length} test_case display_text entr${missing.length === 1 ? 'y' : 'ies'}`);
      }
      if (extra.length) {
        issues.push(`Test Contract has ${extra.length} stale bullet(s) not in ideCoding.test_cases`);
      }
    }
  }

  const vitestHints = extractVitestCriticalHints(generated?.tests);
  const qtLower = text.toLowerCase();
  const missingHints = vitestHints.filter((hint) => {
    const testId = hint.match(/data-testid="([^"]+)"/)?.[1];
    if (testId && qtLower.includes(testId.toLowerCase())) return false;
    const quoted = hint.match(/"([^"]{4,})"/)?.[1];
    if (quoted && text.includes(quoted)) return false;
    const cls = hint.match(/\.([a-z0-9_-]+)/i)?.[1];
    if (cls && qtLower.includes(cls.toLowerCase())) return false;
    return hint.length > 8;
  });
  if (missingHints.length > 3) {
    issues.push(
      `Important/Additional sections omit ${missingHints.length} test-critical hints from Vitest (e.g. ${missingHints[0]})`,
    );
  }

  const score = Math.max(0, 100 - issues.length * 12);
  return { ok: issues.length === 0, issues, score, missingHints };
}

export function isReadmeValidationEnabled() {
  if (process.env.README_VALIDATE_ENABLED === '0') return false;
  if (process.env.README_VALIDATE_ENABLED === '1') return true;
  return true;
}

export function getReadmeValidateRetries() {
  const raw = process.env.README_VALIDATE_RETRIES ?? '2';
  return Math.min(4, Math.max(1, parseInt(raw, 10) || 2));
}
