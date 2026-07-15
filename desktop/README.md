# LCZ Studio Desktop

Tauri v2 desktop application for LCZ Studio — Urban Climate Analysis Platform.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite (in `../frontend`)
- **Backend**: Tauri v2 + Rust
- **Data Layer**: DuckDB-WASM Spatial
- **Visualization**: MapLibre GL JS + deck.gl

## Development

### Prerequisites

- Node.js 18+
- Rust 1.60+
- Tauri CLI

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run tauri dev
```

The development server will:
1. Start the Vite dev server on `http://localhost:1420`
2. Launch the Tauri window with hot-reload enabled

### Build

```bash
# Build for current platform
npm run tauri build

# Build for specific platform
npm run tauri build -- --target linux
npm run tauri build -- --target macos
npm run tauri build -- --target windows
```

## Configuration

### Tauri Config (`tauri.conf.json`)

Key settings:

- **Window**: 1280x800 with minimum 960x600
- **Security**: Asset protocol enabled for file access
- **Bundle**: Targets: deb, dmg, msi, appimage
- **Icons**: Located in `src-tauri/icons/`

### Supported Platforms

- **Linux**: AppImage, deb
- **macOS**: dmg
- **Windows**: msi

## File Structure

```
desktop/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs          # Entry point
│   │   └── lib.rs           # Tauri setup
│   ├── Cargo.toml           # Rust dependencies
│   ├── tauri.conf.json      # Tauri configuration
│   └── icons/               # App icons
├── package.json             # Node scripts
└── README.md                # This file
```

## Commands

### Development

```bash
npm run tauri dev          # Start dev server with hot-reload
npm run tauri build        # Build for current platform
npm run tauri info         # Show platform info
```

### Debugging

```bash
# Enable debug logging
RUST_LOG=debug npm run tauri dev

# Build in debug mode
npm run tauri build -- --debug
```

## Mobile Support (Future)

LCZ Studio is designed to support mobile platforms through Tauri's mobile capabilities:

- **iOS**: Requires macOS and Xcode
- **Android**: Requires Android SDK and NDK

Mobile configuration will be added in future releases.

## Troubleshooting

### Build Issues

1. **Rust compilation errors**: Update Rust toolchain
   ```bash
   rustup update
   ```

2. **Node modules issues**: Clear cache and reinstall
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Frontend build fails**: Check frontend build
   ```bash
   npm --prefix ../frontend run build
   ```

### Runtime Issues

1. **Window not appearing**: Check `beforeDevCommand` in `tauri.conf.json`
2. **Hot-reload not working**: Ensure Vite dev server is running on port 1420
3. **File access denied**: Check security settings in `tauri.conf.json`

## Resources

- [Tauri Documentation](https://tauri.app)
- [Tauri v2 Migration Guide](https://tauri.app/v1/guides/migration/from-tauri-1-0)
- [Rust Book](https://doc.rust-lang.org/book/)

## License

MIT
