import { normalizePortalQuestionText } from '../src/services/questionTextFramework.js';
import fs from 'fs';

const dup = fs.readFileSync(new URL('./test-dedupe-input.md', import.meta.url), 'utf8');

const g = {
  ideCoding: {
    question_text: dup,
    test_cases: [
      { display_text: 'The page should render all newspaper articles on initial load' },
      { display_text: 'When a search query is entered, the page should filter newspapers by title' },
    ],
  },
  solution: {
    'src/index.css': 'body { color: #1a1a1a; background: #f5f5f5; } .cart { border: 1px solid #ddd; }',
    'src/App.jsx':
      "imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'",
  },
};

normalizePortalQuestionText(g);
const o = g.ideCoding.question_text;

function count(label, re) {
  console.log(`${label}:`, (o.match(re) || []).length);
}

count('Design Files headings', /### Design Files/g);
count('Setup headings', /### Set Up Instructions/g);
count('Completion headings', /### Completion Instructions/g);
count('Important headings', /### Important Note/g);
count('Additional headings', /### Additional Test-Critical/g);
count('Test Contract headings', /### Test Contract/g);
count('Resources headings', /### Resources/g);
count('Colors details', /<summary>Colors<\/summary>/g);
count('Home Route bullets', /- Home Route/g);
count('Newspaper Display', /\*\*Newspaper Display\*\*/g);
count('npm install mentions', /npm install/g);
count('grid layout bullet', /grid layout/g);

count('search-input testid', /data-testid='search-input'/g);
count('Test from ideCoding', /filter newspapers by title/g);

const failed = [];
if ((o.match(/### Design Files/g) || []).length !== 1) failed.push('Design Files not unique');
if ((o.match(/\*\*Newspaper Display\*\*/g) || []).length !== 1) failed.push('Completion content missing');
if ((o.match(/grid layout/g) || []).length !== 1) failed.push('Design detail missing');
if ((o.match(/data-testid='search-input'/g) || []).length !== 1) failed.push('Important note missing');
if ((o.match(/filter newspapers by title/g) || []).length !== 1) failed.push('Test contract not from test_cases');
if (failed.length) {
  console.error('FAILED:', failed.join(', '));
  process.exit(1);
}
console.log('All dedupe checks passed.');
