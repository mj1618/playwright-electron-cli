import { _electron as electron, ElectronApplication } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

export interface LaunchOptions {
  executablePath: string;
  args?: string[];
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Find the Electron binary in a project's node_modules
 */
function findElectronBinary(appPath: string): string {
  const absoluteAppPath = path.resolve(appPath);
  
  // Check if the path is already an executable
  try {
    const stat = fs.statSync(absoluteAppPath);
    if (stat.isFile()) {
      // It's a file, assume it's the electron binary
      return absoluteAppPath;
    }
  } catch {
    // Path doesn't exist, will error later
  }
  
  // It's a directory, look for electron in node_modules
  const platform = process.platform;
  let electronPath: string;
  
  if (platform === 'darwin') {
    electronPath = path.join(absoluteAppPath, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
  } else if (platform === 'win32') {
    electronPath = path.join(absoluteAppPath, 'node_modules/electron/dist/electron.exe');
  } else {
    electronPath = path.join(absoluteAppPath, 'node_modules/electron/dist/electron');
  }
  
  if (fs.existsSync(electronPath)) {
    return electronPath;
  }
  
  throw new Error(
    `Could not find Electron binary at ${electronPath}. ` +
    `Make sure 'electron' is installed in the project's node_modules.`
  );
}

/**
 * Launch an Electron application using Playwright
 */
export async function launchElectron(options: LaunchOptions): Promise<ElectronApplication> {
  const { executablePath, args = [], timeout = 30000, cwd, env } = options;

  const absoluteAppPath = path.resolve(executablePath);
  const electronBinary = findElectronBinary(executablePath);
  
  // If executablePath was a directory, we need to pass the app path as an argument
  const isDirectory = fs.statSync(absoluteAppPath).isDirectory();
  const launchArgs = isDirectory ? [absoluteAppPath, ...args] : args;

  const app = await electron.launch({
    executablePath: electronBinary,
    args: launchArgs,
    timeout,
    cwd,
    env: env ? { ...process.env, ...env } as Record<string, string> : undefined,
  });

  return app;
}

/**
 * Get information about an Electron application
 */
export async function getAppInfo(app: ElectronApplication): Promise<{
  name: string;
  version: string;
  locale: string;
  path: string;
}> {
  const [name, version, locale, path] = await Promise.all([
    app.evaluate(async ({ app }) => app.getName()),
    app.evaluate(async ({ app }) => app.getVersion()),
    app.evaluate(async ({ app }) => app.getLocale()),
    app.evaluate(async ({ app }) => app.getAppPath()),
  ]);

  return { name, version, locale, path };
}

/**
 * Wait for a window to be ready
 */
export async function waitForWindow(
  app: ElectronApplication,
  options: { timeout?: number } = {}
): Promise<void> {
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded', { timeout: options.timeout });
}
