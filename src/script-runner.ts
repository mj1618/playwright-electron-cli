import { launchElectron, LaunchOptions } from './electron-launcher.js';
import type { ElectronApplication, Page } from 'playwright';

export interface ScriptContext {
  app: ElectronApplication;
  window: Page;
}

export interface RunInlineScriptOptions extends LaunchOptions {
  script: string;
}

/**
 * Run an inline Playwright script against an Electron application
 * 
 * The script has access to `app` (ElectronApplication) and `window` (Page):
 * 
 * ```bash
 * pw-electron -e "await window.click('button')"
 * ```
 */
export async function runInlineScript(options: RunInlineScriptOptions): Promise<void> {
  const { script, ...launchOptions } = options;
  
  const app = await launchElectron(launchOptions);
  
  try {
    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    
    // Create an async function from the script string with app and window in scope
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction('app', 'window', script);
    
    await fn(app, window);
    
    console.log('Script executed successfully');
  } finally {
    await app.close();
  }
}
