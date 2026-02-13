import * as http from 'http';
import type { ElectronApplication, Page } from 'playwright';
import { saveSession, clearSession, getDefaultPort } from './session.js';
import { launchElectron, getAppInfo } from './electron-launcher.js';

interface ServerState {
  app: ElectronApplication | null;
  window: Page | null;
  appPath: string;
}

const state: ServerState = {
  app: null,
  window: null,
  appPath: '',
};

/**
 * Parse JSON body from request
 */
async function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Handle /status endpoint
 */
async function handleStatus(res: http.ServerResponse): Promise<void> {
  if (!state.app) {
    sendJson(res, 500, { error: 'No app running' });
    return;
  }

  try {
    const info = await getAppInfo(state.app);
    sendJson(res, 200, { 
      status: 'running',
      appPath: state.appPath,
      ...info 
    });
  } catch (error) {
    sendJson(res, 500, { error: String(error) });
  }
}

/**
 * Handle /eval endpoint - execute a script
 */
async function handleEval(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  if (!state.app || !state.window) {
    sendJson(res, 500, { error: 'No app running' });
    return;
  }

  try {
    const body = await parseBody(req);
    const script = body.script as string;

    if (!script) {
      sendJson(res, 400, { error: 'Missing script parameter' });
      return;
    }

    // Create an async function from the script string
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction('app', 'window', script);
    
    const result = await fn(state.app, state.window);
    sendJson(res, 200, { success: true, result });
  } catch (error) {
    sendJson(res, 500, { error: String(error) });
  }
}

/**
 * Handle /screenshot endpoint
 */
async function handleScreenshot(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  if (!state.window) {
    sendJson(res, 500, { error: 'No app running' });
    return;
  }

  try {
    const body = await parseBody(req);
    const outputPath = body.output as string;

    if (!outputPath) {
      sendJson(res, 400, { error: 'Missing output parameter' });
      return;
    }

    await state.window.screenshot({ path: outputPath });
    sendJson(res, 200, { success: true, path: outputPath });
  } catch (error) {
    sendJson(res, 500, { error: String(error) });
  }
}

/**
 * Handle /close endpoint - close the app and server
 */
async function handleClose(res: http.ServerResponse, server: http.Server): Promise<void> {
  sendJson(res, 200, { success: true, message: 'Closing app' });
  
  if (state.app) {
    await state.app.close();
  }
  clearSession();
  server.close();
  process.exit(0);
}

/**
 * Start the session server
 */
export async function startServer(options: {
  appPath: string;
  args?: string[];
  timeout?: number;
  port?: number;
}): Promise<void> {
  const port = options.port || getDefaultPort();
  
  // Launch the Electron app
  console.log(`Launching Electron app from: ${options.appPath}`);
  state.app = await launchElectron({
    executablePath: options.appPath,
    args: options.args,
    timeout: options.timeout,
  });
  state.appPath = options.appPath;
  
  // Wait for first window
  state.window = await state.app.firstWindow();
  await state.window.waitForLoadState('domcontentloaded');
  
  // Get app info
  const info = await getAppInfo(state.app);
  console.log(`App loaded: ${info.name} v${info.version}`);

  // Create HTTP server
  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';
    
    try {
      if (req.method === 'GET' && url === '/status') {
        await handleStatus(res);
      } else if (req.method === 'POST' && url === '/eval') {
        await handleEval(req, res);
      } else if (req.method === 'POST' && url === '/screenshot') {
        await handleScreenshot(req, res);
      } else if (req.method === 'POST' && url === '/close') {
        await handleClose(res, server);
      } else {
        sendJson(res, 404, { error: 'Not found' });
      }
    } catch (error) {
      sendJson(res, 500, { error: String(error) });
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Session server listening on http://127.0.0.1:${port}`);
    console.log('Commands:');
    console.log('  pw-electron -e "await window.click(\'button\')"');
    console.log('  pw-electron screenshot output.png');
    console.log('  pw-electron close');
    console.log('\nPress Ctrl+C to close the application');
    
    // Save session info
    saveSession({
      port,
      appPath: options.appPath,
      pid: process.pid,
      startedAt: new Date().toISOString(),
    });
  });

  // Handle cleanup on exit
  const cleanup = async () => {
    console.log('\nClosing Electron application...');
    if (state.app) {
      await state.app.close();
    }
    clearSession();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Handle app crash/close
  state.app.on('close', () => {
    console.log('Electron app closed');
    clearSession();
    server.close();
    process.exit(0);
  });
}
