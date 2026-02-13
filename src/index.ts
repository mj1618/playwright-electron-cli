// Main entry point for programmatic usage
export { launchElectron, getAppInfo, waitForWindow } from './electron-launcher.js';
export type { LaunchOptions } from './electron-launcher.js';
export { runInlineScript } from './script-runner.js';
export type { ScriptContext, RunInlineScriptOptions } from './script-runner.js';

// Session management
export { startServer } from './server.js';
export { evalScript, takeScreenshot, closeApp, getStatus, getActiveSession } from './client.js';
export { loadSession, saveSession, clearSession, isSessionAlive } from './session.js';
export type { SessionInfo } from './session.js';
