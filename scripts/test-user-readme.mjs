import fs from 'fs';
import { normalizePortalQuestionText } from '../src/services/questionTextFramework.js';
import { evaluateReadmeQuality } from '../src/services/readmeQuality.js';

const dup = fs.readFileSync(new URL('./test-user-readme-input.md', import.meta.url), 'utf8');

const g = {
  ideCoding: {
    question_text: dup,
    test_cases: [
      { display_text: 'The page should render all 24 newspapers from the provided data' },
      { display_text: 'When a search query is entered, the page should filter newspapers by title' },
    ],
  },
  solution: {
    'src/index.css': 'body { color: #1a1a1a; background: #f5f5f5; }',
    'src/data/articles.js': "export const articles = [{ imageUrl: 'https://images.unsplash.com/photo-1504711434969?w=800' }]",
  },
};

normalizePortalQuestionText(g);
const o = g.ideCoding.question_text;
const q = evaluateReadmeQuality(g);

console.log('Quality:', q.ok ? 'PASS' : 'FAIL', q.issues);
console.log('Design Files headings:', (o.match(/### Design Files/g) || []).length);
console.log('Design details siblings after heading:', (o.match(/### Design Files[\s\S]*?<\/details>/g)?.[0]?.match(/<details>/g) || []).length);
console.log('24 newspapers:', /24 newspapers/.test(o));
console.log('Footer bullets:', (o.match(/> - /g) || []).length);
console.log('Extra LLM footer gone:', !/Extra LLM footer/.test(o));

if (!q.ok) process.exit(1);
