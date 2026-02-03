# Electron ES Module Migration Guide

## Problem

Electron main process files were using CommonJS (`require`) syntax, but `package.json` had `"type": "module"`, causing:

```
ReferenceError: require is not defined in ES module scope
```

## Solution Applied

### 1. File Naming Convention

Changed file extensions to `.mjs` for explicit ES module handling:

- `electron-main.js` → `electron-main.mjs`
- `preload.js` → `preload.mjs`

### 2. Updated Imports

Converted from CommonJS to ES modules:

**Before (CommonJS):**

```javascript
const { app, BrowserWindow } = require('electron')
const isDev = require('electron-is-dev')
const path = require('path')
```

**After (ES Modules):**

```javascript
import { app, BrowserWindow } from 'electron'
import isDev from 'electron-is-dev'
import path from 'path'
import { fileURLToPath } from 'url'
```

### 3. \_\_dirname in ES Modules

ES modules don't have `__dirname`, so we create it:

```javascript
const __dirname = path.dirname(fileURLToPath(import.meta.url))
```

### 4. Updated package.json

**electron-main.mjs**

```javascript
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  app: {
    getName: () => 'Stream Deck',
    getVersion: () => '1.0.0',
  },
})
```

**preload.mjs**

```javascript
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  app: {
    getName: () => 'Stream Deck',
    getVersion: () => '1.0.0',
  },
})
```

### 5. Updated References in package.json

```json
{
  "type": "module",
  "main": "electron-main.mjs",
  "scripts": {
    "dev:electron": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron electron-main.mjs\""
  }
}
```

## Why This Matters

1. **Consistency**: Entire monorepo uses ES modules
2. **Modern**: ES modules are the standard for modern JavaScript
3. **Tree-shaking**: Better dead code elimination
4. **Future-proof**: Aligns with Node.js and Electron ecosystem

## Files Modified

- ✅ `apps/web/electron-main.mjs` - ES module syntax
- ✅ `apps/web/preload.mjs` - ES module syntax
- ✅ `apps/web/package.json` - Updated main and script references

## Testing

Run development to verify:

```bash
pnpm dev
```

Should see:

- ✅ Backend starts on port 7500
- ✅ Vite dev server starts on port 5173
- ✅ Electron window opens without module errors
- ✅ Hot reload works on file changes

## References

- [Electron IPC Security](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Node.js ES Modules](https://nodejs.org/api/esm.html)
- [MDN: **dirname and **filename in ES modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta)
