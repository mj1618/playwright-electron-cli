import * as http from 'http';
import { loadSession, isSessionAlive, SessionInfo } from './session.js';

export interface ClientResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Make an HTTP request to the session server
 */
async function request<T>(
  session: SessionInfo,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<ClientResponse<T>> {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : undefined;
    
    const req = http.request({
      hostname: '127.0.0.1',
      port: session.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode === 200) {
            resolve({ success: true, data: parsed });
          } else {
            resolve({ success: false, error: parsed.error || 'Request failed' });
          }
        } catch {
          resolve({ success: false, error: 'Invalid response' });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: `Connection failed: ${error.message}` });
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

/**
 * Get the active session or throw if none exists
 */
export function getActiveSession(): SessionInfo {
  const session = loadSession();
  
  if (!session) {
    throw new Error(
      'No active session found. Start one with:\n' +
      '  pw-electron open -p /path/to/electron/app'
    );
  }
  
  if (!isSessionAlive(session)) {
    throw new Error(
      'Session exists but the process is not running. Start a new session with:\n' +
      '  pw-electron open -p /path/to/electron/app'
    );
  }
  
  return session;
}

/**
 * Get status of the running app
 */
export async function getStatus(): Promise<ClientResponse> {
  const session = getActiveSession();
  return request(session, 'GET', '/status');
}

/**
 * Execute a script against the running app
 */
export async function evalScript(script: string): Promise<ClientResponse> {
  const session = getActiveSession();
  return request(session, 'POST', '/eval', { script });
}

/**
 * Take a screenshot
 */
export async function takeScreenshot(output: string): Promise<ClientResponse> {
  const session = getActiveSession();
  return request(session, 'POST', '/screenshot', { output });
}

/**
 * Close the running app
 */
export async function closeApp(): Promise<ClientResponse> {
  const session = getActiveSession();
  return request(session, 'POST', '/close');
}
