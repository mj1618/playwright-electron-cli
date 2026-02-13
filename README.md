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

### Open an Electron app

Open an Electron application and keep it running for manual interaction:

```bash
# Open from current directory (if it's an Electron app)
pw-electron open

# Open from a specific path
pw-electron open -p /path/to/electron/app
```

Options:
- `-p, --path <electron-path>` - Path to the Electron application (default: current directory)
- `-a, --args <args...>` - Arguments to pass to the Electron app
- `-t, --timeout <ms>` - Timeout for launch (default: 30000)

### Execute an inline script

Run Playwright commands directly from the command line:

```bash
# Run against app in current directory
pw-electron -e "await window.click('button')"

# Run against app at specific path
pw-electron -e "await window.click('button')" -p /path/to/electron/app
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
pw-electron -e "console.log(await window.textContent('h1'))"

# Access Electron APIs
pw-electron -e "console.log(await app.evaluate(({ app }) => app.getName()))"

# Multiple commands
pw-electron -e "
  await window.fill('input', 'hello');
  await window.click('button');
  await window.waitForSelector('.result');
"
```

### Take a screenshot

Capture a screenshot of the Electron application:

```bash
# Screenshot app in current directory
pw-electron screenshot output.png

# Screenshot app at specific path
pw-electron screenshot output.png -p /path/to/electron/app
```

Options:
- `-p, --path <electron-path>` - Path to the Electron application (default: current directory)
- `-a, --args <args...>` - Arguments to pass to the Electron app
- `-t, --timeout <ms>` - Timeout for launch (default: 30000)
- `-d, --delay <ms>` - Delay before taking screenshot (default: 1000)

## Programmatic Usage

You can also use this package programmatically:

```typescript
import { launchElectron, getAppInfo, runInlineScript } from 'playwright-electron-cli';

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

// Or run an inline script
await runInlineScript({
  executablePath: '/path/to/electron/app',
  script: "await window.click('button')",
});
```

## Requirements

- Node.js >= 18.0.0
- An Electron application to test

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev
```

## License

MIT
