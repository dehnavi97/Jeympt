# Jeympt — Windows desktop build (Tauri 2)

The web app in `frontend/` is fully Tauri-compatible: it has no backend, stores
everything (including attachment Blobs) in the WebView's IndexedDB and uses the
standard Clipboard API.

## Prerequisites (Windows)

1. [Rust](https://rustup.rs) (stable, MSVC toolchain)
2. Microsoft C++ Build Tools ("Desktop development with C++")
3. WebView2 runtime (preinstalled on Windows 10/11)
4. Node 20+ and Yarn

## Build

```bash
cd frontend
yarn install
yarn add -D @tauri-apps/cli@^2   # once
yarn tauri dev                    # run as a desktop window (uses the Vite dev server on :3000)
yarn tauri build                  # produces .msi and NSIS .exe installers in src-tauri/target/release/bundle
```

Optional: regenerate all icon sizes from one square PNG with
`yarn tauri icon path/to/logo.png`.

## Notes

- Data is kept in the app's WebView2 profile
  (`%LOCALAPPDATA%\app.jeympt.desktop`), so it survives restarts and updates.
- Uninstalling with "delete app data" removes it.
