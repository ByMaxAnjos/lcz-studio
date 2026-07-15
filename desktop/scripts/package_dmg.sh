#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUNDLE_DIR="$ROOT_DIR/desktop/src-tauri/target/release/bundle"
MACOS_DIR="$BUNDLE_DIR/macos"
APP_PATH="$MACOS_DIR/LCZ Studio.app"
DMG_DIR="$BUNDLE_DIR/dmg"
DMG_PATH="$DMG_DIR/LCZ Studio_0.1.0_aarch64.dmg"
APPLICATIONS_LINK="$MACOS_DIR/Applications"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Aplicativo não encontrado: $APP_PATH" >&2
  exit 1
fi

mkdir -p "$DMG_DIR"
rm -f "$DMG_PATH" "$MACOS_DIR"/rw.*.dmg
ln -sfn /Applications "$APPLICATIONS_LINK"
trap 'rm -f "$APPLICATIONS_LINK"' EXIT

hdiutil create \
  -volname "LCZ Studio" \
  -srcfolder "$MACOS_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

hdiutil verify "$DMG_PATH"
echo "DMG criado e verificado: $DMG_PATH"
