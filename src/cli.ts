#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from './server.js';
import { evalScript, takeScreenshot, closeApp, getStatus, getActiveSession } from './client.js';
import { loadSession, isSessionAlive, getDefaultPort } from './session.js';
import * as path from 'path';

const program = new Command();

program
  .name('pw-electron')
  .description(`CLI tool to run Playwright commands against Electron applications.

Uses a session-based architecture: first open an app with 'open', then run
commands against the running instance. The app stays open until you 'close' it.`)
  .version('0.1.0')
  .addHelpText('after', `
Workflow:
  1. Start a session:    pw-electron open -p ./my-electron-app
  2. Run commands:       pw-electron -e "await window.click('button')"
                         pw-electron screenshot output.png
  3. Close when done:    pw-electron close

Examples:
  $ pw-electron open -p ./my-electron-app       # Start session
  $ pw-electron -e "await window.click('btn')"  # Run script
  $ pw-electron -e "return await window.title()" # Get value
  $ pw-electron screenshot output.png           # Take screenshot
  $ pw-electron status                          # Check session
  $ pw-electron close                           # Stop session`);

// Global option for -e (eval) mode
program
  .option('-e, --eval <script>', 'Execute a Playwright script (requires active session)');

// Open command - starts the session server
program
  .command('open')
  .description('Open an Electron application and start a session server')
  .option('-p, --path <electron-path>', 'Path to the Electron application')
  .option('-a, --args <args...>', 'Arguments to pass to the Electron app')
  .option('-t, --timeout <ms>', 'Timeout for launch in milliseconds', '30000')
  .option('--port <port>', 'Port for the session server', String(getDefaultPort()))
  .addHelpText('after', `
Example:
  $ pw-electron open -p ./my-electron-app

This launches the Electron app and starts a session server.
Other commands will connect to this running instance.`)
  .action(async (options) => {
    // Check for existing session
    const existingSession = loadSession();
    if (existingSession && isSessionAlive(existingSession)) {
      console.error('An Electron app is already running!');
      console.error(`  App path: ${existingSession.appPath}`);
      console.error(`  Started: ${existingSession.startedAt}`);
      console.error(`  Port: ${existingSession.port}`);
      console.error('\nUse "pw-electron close" to stop it first, or run commands against it.');
      process.exit(1);
    }

    if (!options.path) {
      console.error('Error: Please specify the path to the Electron application');
      console.error('  pw-electron open -p /path/to/electron/app');
      process.exit(1);
    }

    try {
      await startServer({
        appPath: path.resolve(options.path),
        args: options.args,
        timeout: parseInt(options.timeout, 10),
        port: parseInt(options.port, 10),
      });
    } catch (error) {
      console.error('Failed to start session:', error);
      process.exit(1);
    }
  });

// Screenshot command - connects to existing session
program
  .command('screenshot')
  .description('Take a screenshot of the running Electron application')
  .argument('<output>', 'Output path for the screenshot')
  .addHelpText('after', `
Example:
  $ pw-electron screenshot output.png

Requires an active session (started with "pw-electron open").`)
  .action(async (output) => {
    try {
      const result = await takeScreenshot(path.resolve(output));
      if (result.success) {
        console.log(`Screenshot saved to: ${output}`);
      } else {
        console.error('Failed to take screenshot:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check the status of the running Electron application')
  .addHelpText('after', `
Example:
  $ pw-electron status

Shows information about the active session including app name, version, and path.`)
  .action(async () => {
    try {
      const result = await getStatus();
      if (result.success) {
        console.log('Session active:');
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.error('Failed to get status:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Close command
program
  .command('close')
  .description('Close the running Electron application and end the session')
  .addHelpText('after', `
Example:
  $ pw-electron close

Stops the Electron app and clears the session. You can also press Ctrl+C in the
terminal where 'pw-electron open' is running.`)
  .action(async () => {
    try {
      const result = await closeApp();
      if (result.success) {
        console.log('Electron application closed');
      } else {
        console.error('Failed to close:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Add an 'eval' command as an alternative to -e
program
  .command('eval <script>')
  .description('Execute an inline Playwright script against the running app')
  .addHelpText('after', `
Example:
  $ pw-electron eval "await window.click('button')"
  $ pw-electron eval "return await window.title()"

Requires an active session (started with "pw-electron open").`)
  .action(async (script) => {
    try {
      getActiveSession(); // Will throw if no session
      
      const result = await evalScript(script);
      if (result.success) {
        const data = result.data as Record<string, unknown>;
        if (data?.result !== undefined) {
          console.log(data.result);
        }
      } else {
        console.error('Script execution failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Handle -e option at the program level (for backwards compatibility)
program.action(async (options) => {
  if (options.eval) {
    try {
      getActiveSession(); // Will throw if no session
      
      const result = await evalScript(options.eval);
      if (result.success) {
        const data = result.data as Record<string, unknown>;
        if (data?.result !== undefined) {
          console.log(data.result);
        }
      } else {
        console.error('Script execution failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  } else {
    // No command and no -e option, show help
    program.help();
  }
});

// Parse arguments
program.parse();
