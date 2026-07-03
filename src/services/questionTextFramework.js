/**
 * Portal question_text / readme.md structure (matches Sample_Folder/Ecommerce_Solution/README.md).
 */

export const QUESTION_TEXT_FRAMEWORK = `QUESTION TEXT & readme.md (mandatory — match Sample_Folder/Ecommerce_Solution/README.md portal layout exactly):

ideCoding.question_text is copied to solution readme.md by the backend — generate ONE complete markdown string in this order:

1) **Title** — \`## {Project Name} — {App Type}\` (e.g. \`## mettā muse — Ecommerce Application\`)

2) **Intro** — \`In this project, let's build a **{Full Project Title}** .\` (note the space before the period, matching the sample)

3) **Demo video** — always include (video URL added later by editors; leave src empty):
**Refer to the below video.**
<video width="320" height="240" controls>
<source src="" type="video/mp4">
  Your browser does not support the video tag.
</video>

<br/>

4) **Design Files** — collapsible; list routes/screens WITHOUT image URLs unless user attached screenshots:
### Design Files
<details>
<summary>Click to view</summary>

- Home Route (\`/\`)
- Login Route (\`/login\`)
- (list every major route/screen in the app)

</details>

If screenshots were attached, you may use markdown links with the provided URLs instead of route-only bullets.

5) **Set Up Instructions** — collapsible:
### Set Up Instructions
<details>
<summary>Click to view</summary>

- Download dependencies by running \`npm install\`
- Start up the app using \`npm run dev\`

</details>

6) **Completion Instructions** — collapsible with detailed functionality grouped by page/feature (like the sample — Authentication, Products Page, Header, etc.):
### Completion Instructions
<details>
<summary>Functionality to be added</summary>
<br/>

The app must have the following functionalities:

(group requirements with **bold section headings**, bullet lists, exact UI labels, routes, API calls)

</details>

7) **API Requests & Responses** — collapsible (when APIs exist):
### API Requests & Responses
<details>
<summary>Click to view</summary>
<br/>

(Per-endpoint: #### API URL, #### Method, request body, sample success/failure JSON)

</details>

8) **Important Note** — collapsible; test-critical implementation details (cookie names, exact routes, aria-labels, try/catch patterns):
### Important Note
<details>
<summary>Click to view</summary>
<br/>

**The following instructions are required for the tests to pass**

(exact strings, routes, token paths, etc.)

</details>

9) **Additional Test-Critical Requirements** — collapsible; exact UI copy checklist:
### Additional Test-Critical Requirements
<details>
<summary>Click to view</summary>
<br/>

(bullets with exact visible text, placeholders, aria-labels)

</details>

10) **Test Contract** — collapsible; one bullet per test (same wording as test_cases / it() titles):
### Test Contract (Must Match Exactly)
<details>
<summary>Click to view</summary>
<br/>

- The page should render ...
(one bullet per automated test)

</details>

11) **Resources** — always at the end; extract from YOUR generated solution CSS/JSX:

### Resources

<details>
<summary>Colors</summary>
<br/>

Group hex colors actually used in your solution CSS into **Primary / Brand**, **Background**, **Border**, **Text**, **Accent / Status** (or sensible groups). Each color MUST use this swatch format (one per line):
- <div style="background-color: #1a1a1a; width: 150px; padding: 10px; color: white; box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\\#1a1a1a</div>

Only list colors that appear in your generated \`*.css\` files.

</details>

<details>
<summary>Font-families</summary>

\`\`\`
Inter, sans-serif
\`\`\`

(list every font-family used in solution CSS)

</details>

<details>
<summary>SVG Icons</summary>
<br/>

If the solution uses inline SVG icon components (e.g. \`src/components/Icons/index.jsx\`), include a markdown table:

| Icon | Usage |
|------|-------|
| \`IconSearch\` | Search bar |

If no custom SVG icons are used, write: _No custom SVG icon components in this project._

</details>

<details>
<summary>Image URLs</summary>

| Usage | URL |
|-------|-----|
| (describe) | (https URL from solution data or assets) |

</details>

12) **Footer** — blockquote reminder:
> ### _Things to Keep in Mind_
>
> - All components you implement should go in the \`src/components\` directory.
> - Don't change the component folder names as those are the files being imported into the tests.

FORBIDDEN in question_text:
- Flat structure without \`<details>\` collapsibles for major sections
- Skipping the video block or Resources section
- Generic "No design files" without listing routes in Design Files
- Colors section missing or not matching swatch div format
- readme.md as a separate JSON key — only ideCoding.question_text (backend copies it to readme.md)`;

/** @param {string} css */
function isLightHex(hex) {
  const h = hex.replace('#', '');
  const full =
    h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function colorSwatchLine(hex) {
  const fg = isLightHex(hex) ? 'black' : 'white';
  const border = isLightHex(hex) ? 'border: 1px solid #e5e7eb;' : '';
  return `- <div style="background-color: ${hex}; width: 150px; padding: 10px; color: ${fg}; ${border} box-shadow: 0px 4px 8px rgba(0,0,0,0.3);">\\${hex}</div>`;
}

/**
 * Append Resources color/font hints from solution CSS if question_text lacks a Colors section.
 * @param {{ solution?: Record<string, string>; ideCoding?: { question_text?: string } }} generated
 */
export function enrichQuestionTextResources(generated) {
  if (!generated?.ideCoding?.question_text || !generated?.solution) return generated;

  let qt = generated.ideCoding.question_text;
  if (/### Resources/i.test(qt) && /<summary>Colors<\/summary>/i.test(qt)) {
    return generated;
  }

  const cssFiles = Object.entries(generated.solution).filter(([p]) => /\.css$/i.test(p));
  const cssBlob = cssFiles.map(([, c]) => c).join('\n');
  const hexes = [
    ...new Set((cssBlob.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/g) || []).map((h) => h.toLowerCase())),
  ].slice(0, 24);

  const fontMatch = cssBlob.match(/font-family:\s*([^;}\n]+)/i);
  const fontFamily = fontMatch ? fontMatch[1].trim().replace(/^['"]|['"]$/g, '') : 'Inter, sans-serif';

  const iconsFile = Object.entries(generated.solution).find(
    ([p]) => /components\/Icons\/index\.(jsx|tsx|js)$/i.test(p.replace(/\\/g, '/')),
  );
  const iconNames = iconsFile
    ? [...iconsFile[1].matchAll(/export\s+(?:const|function)\s+(Icon\w+)/g)].map((m) => m[1])
    : [];

  let resources = '\n\n### Resources\n\n';
  resources += '<details>\n<summary>Colors</summary>\n<br/>\n\n';
  if (hexes.length) {
    resources += '**Colors used in solution CSS**\n\n';
    resources += hexes.map(colorSwatchLine).join('\n');
  } else {
    resources += '_No hex colors detected in solution CSS._\n';
  }
  resources += '\n\n</details>\n\n';
  resources += `<details>\n<summary>Font-families</summary>\n\n\`\`\`\n${fontFamily}\n\`\`\`\n\n</details>\n\n`;

  resources += '<details>\n<summary>SVG Icons</summary>\n<br/>\n\n';
  if (iconNames.length) {
    resources += '| Icon | Usage |\n|------|-------|\n';
    resources += iconNames.map((n) => `| \`${n}\` | Used in UI |\n`).join('');
  } else {
    resources += '_No custom SVG icon components in this project._\n';
  }
  resources += '\n\n</details>\n';

  if (!/### Resources/i.test(qt)) {
    qt += resources;
  } else {
    qt = qt.replace(/### Resources[\s\S]*$/i, resources.trim());
  }

  if (!/> ### _Things to Keep in Mind_/i.test(qt)) {
    qt += `\n\n> ### _Things to Keep in Mind_\n>\n> - All components you implement should go in the \`src/components\` directory.\n> - Don't change the component folder names as those are the files being imported into the tests.\n`;
  }

  generated.ideCoding.question_text = qt;
  return generated;
}
