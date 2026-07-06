import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { SAMPLE_FOLDER_ROOT } from '../paths.js';

let cachedReadme = null;

/**
 * Canonical portal README (Ecommerce_Solution) — loaded once from disk.
 * Injected into the LLM **system** prompt as fixed grounding context (template RAG).
 * @returns {string}
 */
export function getPortalReadmeReference() {
  if (cachedReadme) return cachedReadme;

  const candidates = [
    join(SAMPLE_FOLDER_ROOT, 'Ecommerce_Solution', 'README.md'),
    join(SAMPLE_FOLDER_ROOT, 'Ecommerce', 'README.md'),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      cachedReadme = readFileSync(p, 'utf8');
      return cachedReadme;
    }
  }

  cachedReadme = '';
  return cachedReadme;
}

/**
 * Block appended to SYSTEM_PROMPT — full template + rules (not duplicated in user message).
 * @returns {string}
 */
export function getPortalReadmeSystemBlock() {
  const readme = getPortalReadmeReference();
  if (!readme.trim()) {
    return `CANONICAL PORTAL README TEMPLATE (ideCoding.question_text):
Sample_Folder/Ecommerce_Solution/README.md was not found on disk. Match NxtWave portal README layout: video block, collapsible <details> sections, rich Completion Instructions, Resources (Colors + Font-families; SVG Icons / Image URLs only when used).`;
  }

  return `CANONICAL PORTAL README TEMPLATE (ground truth — ideCoding.question_text MUST match this structure and depth)

This is the official NxtWave portal README from Sample_Folder/Ecommerce_Solution. Treat it as retrieved reference documentation (template RAG): copy section order, <details> collapsibles, level of detail in Completion Instructions / Important Note / API docs, and Resources formatting — but replace all ecommerce-specific content with THIS project's features, routes, APIs, tests, and CSS colors.

Rules when adapting this template:
- **Completion Instructions**: as long and specific as the example (feature groups, exact UI labels, routes, request/response samples).
- **Never** output empty or nested empty <details></details>.
- **Resources**: always Colors (swatch divs from your solution CSS) + Font-families.
- **SVG Icons** block: ONLY if you implement src/components/Icons/index.jsx — otherwise omit entirely.
- **Image URLs** block: ONLY if the solution uses external https URLs — otherwise omit entirely.
- Do NOT write "_No custom SVG_" or "_No external image URLs_" placeholders.

--- BEGIN CANONICAL PORTAL README TEMPLATE ---
${readme}
--- END CANONICAL PORTAL README TEMPLATE ---`;
}

/** Short reminder for the user message (full template lives in system prompt). */
export const PORTAL_README_USER_HINT = `## ideCoding.question_text / readme.md
Generate ideCoding.question_text using the **CANONICAL PORTAL README TEMPLATE** in your system instructions (same structure, collapsibles, and depth as the Ecommerce_Solution example). Backend copies question_text → solution/readme.md.`;
