import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Vercel serverless: only /tmp is writable. Render/VPS: use disk or DATABASE_PATH. */
const DB_PATH =
  process.env.DATABASE_PATH ||
  (process.env.VERCEL === '1'
    ? join(tmpdir(), 'rqg-generations.db')
    : join(__dirname, '../../data/generations.db'));

/** @type {import('better-sqlite3').Database | null} */
let db = null;

function migrateGenerationsAssessmentMode() {
  if (!db) return;
  try {
    db.exec('ALTER TABLE generations ADD COLUMN assessment_mode TEXT');
  } catch {
    /* column already exists */
  }
  const rows = db
    .prepare(
      `SELECT id, payload_json FROM generations
       WHERE assessment_mode IS NULL OR trim(assessment_mode) = ''`,
    )
    .all();
  if (!rows.length) return;
  const upd = db.prepare(`UPDATE generations SET assessment_mode = @mode WHERE id = @id`);
  for (const row of rows) {
    let mode = 'topin_base';
    try {
      const g = JSON.parse(row.payload_json);
      if (g?.generatorOptions?.assessmentMode === 'open_book') mode = 'open_book';
    } catch {
      /* keep topin_base */
    }
    upd.run({ id: row.id, mode });
  }
}

export function initDb() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      project_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at);
  `);
  migrateGenerationsAssessmentMode();
  return db;
}

/**
 * @param {string} id
 * @param {object} generated
 * @param {'open_book' | 'topin_base'} [assessmentModeFromRoute] must match the generate request
 */
export function saveGeneration(id, generated, assessmentModeFromRoute = 'topin_base') {
  if (!db) throw new Error('Database not initialized');
  const mode = assessmentModeFromRoute === 'open_book' ? 'open_book' : 'topin_base';
  if (!generated.generatorOptions || typeof generated.generatorOptions !== 'object') {
    generated.generatorOptions = {};
  }
  generated.generatorOptions.assessmentMode = mode;

  const stmt = db.prepare(`
    INSERT INTO generations (id, project_name, created_at, payload_json, assessment_mode)
    VALUES (@id, @project_name, datetime('now'), @payload_json, @assessment_mode)
  `);
  stmt.run({
    id,
    project_name: generated.projectName,
    payload_json: JSON.stringify(generated),
    assessment_mode: mode,
  });
}

/**
 * @param {string} id
 * @returns {{ id: string, projectName: string, createdAt: string, generated: object } | null}
 */
export function getGeneration(id) {
  if (!db) throw new Error('Database not initialized');
  const row = db.prepare('SELECT id, project_name, created_at, payload_json FROM generations WHERE id = ?').get(id);
  if (!row) return null;
  return {
    id: row.id,
    projectName: row.project_name,
    createdAt: row.created_at,
    generated: JSON.parse(row.payload_json),
  };
}

/** Overwrite stored generation payload (e.g. after inline file edits). */
export function updateGenerationPayload(id, generated) {
  if (!db) throw new Error('Database not initialized');
  const mode = generated?.generatorOptions?.assessmentMode === 'open_book' ? 'open_book' : 'topin_base';
  const stmt = db.prepare(`
    UPDATE generations
    SET payload_json = @payload_json, project_name = @project_name, assessment_mode = @assessment_mode
    WHERE id = @id
  `);
  const result = stmt.run({
    id,
    payload_json: JSON.stringify(generated),
    project_name: generated.projectName ?? '',
    assessment_mode: mode,
  });
  return result.changes > 0;
}
