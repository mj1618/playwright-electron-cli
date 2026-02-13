import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SessionInfo {
  port: number;
  appPath: string;
  pid: number;
  startedAt: string;
}

const SESSION_DIR = path.join(os.homedir(), '.pw-electron');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

/**
 * Ensure the session directory exists
 */
function ensureSessionDir(): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

/**
 * Save session info to disk
 */
export function saveSession(session: SessionInfo): void {
  ensureSessionDir();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
}

/**
 * Load session info from disk
 */
export function loadSession(): SessionInfo | null {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = fs.readFileSync(SESSION_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Session file doesn't exist or is invalid
  }
  return null;
}

/**
 * Clear the session file
 */
export function clearSession(): void {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Check if a session is still alive by checking if the process is running
 */
export function isSessionAlive(session: SessionInfo): boolean {
  try {
    // Check if process is still running (signal 0 doesn't kill, just checks)
    process.kill(session.pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the default port for the session server
 */
export function getDefaultPort(): number {
  return 9847; // Default port for pw-electron server
}
