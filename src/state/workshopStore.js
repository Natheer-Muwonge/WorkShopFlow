import fs from "fs/promises";
import path from "path";

// Minimal file-backed store so the agent has memory of what stage each
// workshop is in between runs. Good enough for sandbox/single-user use;
// swap for a real DB (SQLite, Postgres) if this ever needs to run
// unattended for real or handle concurrent access.
const STORE_PATH = path.join(process.cwd(), "data", "workshops.json");

async function ensureStore() {
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify({}, null, 2));
  }
}

export async function getAllWorkshops() {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf-8");
  return JSON.parse(raw);
}

export async function getWorkshop(responseId) {
  const all = await getAllWorkshops();
  return all[responseId] || null;
}

export async function upsertWorkshop(responseId, updates) {
  const all = await getAllWorkshops();
  all[responseId] = { ...(all[responseId] || {}), ...updates, updatedAt: new Date().toISOString() };
  await fs.writeFile(STORE_PATH, JSON.stringify(all, null, 2));
  return all[responseId];
}
