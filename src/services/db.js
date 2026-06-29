import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const IS_VERCEL = process.env.VERCEL === '1';

/** Vercel serverless: only /tmp is writable. Render/VPS: use disk or DATABASE_PATH. */
const DB_PATH =
  process.env.DATABASE_PATH ||
  (IS_VERCEL
    ? join(tmpdir(), 'rqg-generations.db')
    : join(__dirname, '../../data/generations.db'));

/** @type {import('better-sqlite3').Database | null} */
let db = null;

/** In-memory fallback when SQLite native bindings are unavailable (typical on Vercel). */
/** @type {Map<string, { projectName: string; createdAt: string; generated: object; assessmentMode: string }>} */
const memoryStore = new Map();

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

function initSqlite() {
  const Database = require('better-sqlite3');
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

export function initDb() {
  if (IS_VERCEL) {
    console.log('[db] Vercel: using in-memory sessions (no SQLite native module)');
    return null;
  }
  try {
    return initSqlite();
  } catch (err) {
    console.error('[db] SQLite init failed, using in-memory store:', err.message);
    db = null;
    return null;
  }
}

function normalizeMode(assessmentModeFromRoute) {
  return assessmentModeFromRoute === 'open_book' ? 'open_book' : 'topin_base';
}

/**
 * @param {string} id
 * @param {object} generated
 * @param {'open_book' | 'topin_base'} [assessmentModeFromRoute] must match the generate request
 */
export function saveGeneration(id, generated, assessmentModeFromRoute = 'topin_base') {
  const mode = normalizeMode(assessmentModeFromRoute);
  if (!generated.generatorOptions || typeof generated.generatorOptions !== 'object') {
    generated.generatorOptions = {};
  }
  generated.generatorOptions.assessmentMode = mode;

  if (!db) {
    memoryStore.set(id, {
      projectName: generated.projectName,
      createdAt: new Date().toISOString(),
      generated,
      assessmentMode: mode,
    });
    return;
  }

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
  if (!db) {
    const row = memoryStore.get(id);
    if (!row) return null;
    return {
      id,
      projectName: row.projectName,
      createdAt: row.createdAt,
      generated: row.generated,
    };
  }
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
  const mode = generated?.generatorOptions?.assessmentMode === 'open_book' ? 'open_book' : 'topin_base';

  if (!db) {
    const row = memoryStore.get(id);
    if (!row) return false;
    memoryStore.set(id, {
      ...row,
      projectName: generated.projectName ?? row.projectName,
      generated,
      assessmentMode: mode,
    });
    return true;
  }

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
