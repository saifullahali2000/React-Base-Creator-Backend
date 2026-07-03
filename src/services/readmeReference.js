import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { SAMPLE_FOLDER_ROOT } from '../paths.js';

let cachedReadme = null;

/**
 * Canonical portal README (Ecommerce_Solution) — sent to the LLM as a structural reference.
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

export const PORTAL_README_USER_PROMPT = `## Portal README reference (ideCoding.question_text MUST match this)

Study the example README below from Sample_Folder/Ecommerce_Solution. Generate ideCoding.question_text with the **same section order, collapsible <details> pattern, depth of Completion Instructions, Important Note detail, and Resources layout**.

Rules when using this reference:
- Copy the **structure** (headings, <details> blocks, video placeholder, footer blockquote) — replace content with THIS project's features, routes, APIs, and tests.
- **Completion Instructions** must be long and specific (feature groups, exact UI labels, routes, API URLs) — never leave empty or placeholder <details>.
- **Never nest** empty <details></details> inside a section.
- **Resources**: always include Colors (swatch divs from your solution CSS) and Font-families.
- **Resources — SVG Icons**: include ONLY if you create src/components/Icons/index.jsx with exported icon components; otherwise OMIT the entire SVG Icons block.
- **Resources — Image URLs**: include ONLY if the solution uses external https image URLs (logo, product images, etc.); otherwise OMIT the entire Image URLs block.
- Do NOT write "_No custom SVG icon components_" or "_No external image URLs_" — omit those sections entirely when not applicable.

--- BEGIN REFERENCE README ---`;

export function appendPortalReadmeReference(userText) {
  const readme = getPortalReadmeReference();
  if (!readme.trim()) {
    return (
      userText +
      '\n\n## Portal README\nMatch Sample_Folder/Ecommerce_Solution/README.md structure (collapsible sections, Resources with color swatches). Omit SVG Icons and Image URLs sections when not used in the solution.\n'
    );
  }
  return `${userText}\n\n${PORTAL_README_USER_PROMPT}\n${readme}\n--- END REFERENCE README ---\n`;
}
