# playwright-electron-cli

A CLI tool to run Playwright commands against Electron applications.

## Installation

```bash
npm install -g playwright-electron-cli
```

Or run directly with npx:

```bash
npx playwright-electron-cli <command>
```

## Usage

The CLI uses a **session-based architecture**: you first open an Electron app, which starts a background session. Then you can run multiple commands against the running app without restarting it each time.

### 1. Start a session

Open an Electron application and keep it running:

```bash
# Open from a specific path
pw-electron open -p /path/to/electron/app
```

This launches the app and starts a local session server. The session persists until you close it.

Options:
- `-p, --path <electron-path>` - Path to the Electron application (required)
- `-a, --args <args...>` - Arguments to pass to the Electron app
- `-t, --timeout <ms>` - Timeout for launch (default: 30000)
- `--port <port>` - Port for the session server (default: 9847)

### 2. Run commands against the app

Once a session is active, you can run commands against it:

#### Execute an inline script

```bash
# Using -e option
pw-electron -e "await window.click('button')"

# Using eval command
pw-electron eval "await window.click('button')"
```

The script has access to:
- `app` - The Playwright ElectronApplication instance
- `window` - The first browser window (Page instance)

Examples:

```bash
# Click a button
pw-electron -e "await window.click('button#submit')"

# Fill a form field
pw-electron -e "await window.fill('input[name=\"username\"]', 'testuser')"

# Get text content
pw-electron -e "return await window.textContent('h1')"

# Get the window title
pw-electron -e "return await window.title()"

# Access Electron APIs
pw-electron -e "return await app.evaluate(({ app }) => app.getName())"

# Multiple commands
pw-electron -e "
  await window.fill('input', 'hello');
  await window.click('button');
  await window.waitForSelector('.result');
"
```

#### Take a screenshot

```bash
pw-electron screenshot output.png
```

#### Check session status

```bash
pw-electron status
```

### 3. Close the session

When you're done, close the running app:

```bash
pw-electron close
```

Or press Ctrl+C in the terminal where `pw-electron open` is running.

## Programmatic Usage

You can also use this package programmatically:

```typescript
import { launchElectron, getAppInfo } from 'playwright-electron-cli';

// Launch and interact manually
const app = await launchElectron({
  executablePath: '/path/to/electron/app',
  args: ['--some-flag'],
});

const info = await getAppInfo(app);
console.log(info);

const window = await app.firstWindow();
await window.click('button');

await app.close();
```

Or use the session-based approach:

```typescript
import { startServer, evalScript, takeScreenshot, closeApp } from 'playwright-electron-cli';

// In one process: start the server
await startServer({ appPath: '/path/to/electron/app' });

// In another process: connect and run commands
const result = await evalScript("await window.click('button')");
await takeScreenshot('screenshot.png');
await closeApp();
```

## Requirements

- Node.js >= 18.0.0
- An Electron application to test (with `electron` in its node_modules)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Link globally for testing
npm link
```

## License

MIT
