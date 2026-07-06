/**
 * Sync ideCoding.test_cases (and question_text Test Contract) from Vitest it() titles.
 * Format: it(':::ENUM_TEST_N:::Display text sentence:::5:::', ...)
 */

const IT_TITLE_RE = /:::([A-Z0-9]+_TEST_(\d+)):::([\s\S]*?):::(\d+):::/g;

/**
 * @param {string} source
 * @returns {Array<{ test_case_enum: string, display_text: string, weightage: number, order: number }>}
 */
export function parseTestCasesFromVitestSource(source) {
  if (typeof source !== 'string' || !source.includes('_TEST_')) return [];

  const byEnum = new Map();
  let match;
  const re = new RegExp(IT_TITLE_RE.source, 'g');
  while ((match = re.exec(source)) !== null) {
    const test_case_enum = match[1];
    const order = parseInt(match[2], 10);
    const display_text = match[3].trim();
    const weightage = parseInt(match[4], 10);
    if (!test_case_enum || !display_text) continue;
    byEnum.set(test_case_enum, {
      test_case_enum,
      display_text,
      weightage: Number.isFinite(weightage) && weightage > 0 ? weightage : 5,
      order: Number.isFinite(order) ? order : 0,
    });
  }

  return [...byEnum.values()].sort((a, b) => a.order - b.order);
}

/**
 * @param {Record<string, string> | undefined} tests
 */
export function collectTestCasesFromTestsMap(tests) {
  if (!tests || typeof tests !== 'object') return [];
  const merged = new Map();

  for (const content of Object.values(tests)) {
    for (const row of parseTestCasesFromVitestSource(content)) {
      merged.set(row.test_case_enum, row);
    }
  }

  return [...merged.values()].sort((a, b) => a.order - b.order);
}

/**
 * @param {string} questionText
 * @param {Array<{ display_text: string }>} testCases
 */
export function syncQuestionTextTestContract(questionText, testCases) {
  if (!testCases.length) return questionText;

  const bullets = testCases.map((tc) => `- ${tc.display_text}`).join('\n');
  const block = `### Test Contract\n\n<details>\n<summary>Click to view</summary>\n\n${bullets}\n\n</details>`;

  let qt = typeof questionText === 'string' ? questionText : '';

  const contractRe = /### Test Contract[\s\S]*?(?=\n### [^\n]+|\n> ###|$)/i;
  if (contractRe.test(qt)) {
    return qt.replace(contractRe, block);
  }

  const resourcesIdx = qt.search(/\n### Resources\b/i);
  if (resourcesIdx !== -1) {
    return `${qt.slice(0, resourcesIdx)}\n\n${block}\n${qt.slice(resourcesIdx)}`;
  }

  return qt.trimEnd() + `\n\n${block}\n`;
}

/**
 * @param {{ tests?: Record<string, string>; ideCoding?: { test_cases?: unknown[]; question_text?: string } }} generated
 */
export function syncTestCasesFromVitestFiles(generated) {
  if (!generated?.ideCoding || typeof generated.ideCoding !== 'object') return generated;
  if (generated.generatorOptions?.assessmentMode === 'open_book') return generated;
  if (Number(generated.generatorOptions?.testCaseCount) === 0) return generated;

  const parsed = collectTestCasesFromTestsMap(generated.tests);
  if (!parsed.length) return generated;

  generated.ideCoding.test_cases = parsed.map(({ test_case_enum, display_text, weightage }) => ({
    test_case_enum,
    display_text,
    weightage,
  }));

  // Test Contract in question_text is rebuilt by normalizePortalQuestionText (portalPostProcess).

  return generated;
}
