#!/usr/bin/env bash
set -e

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICONS_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
APPS_DIR="$HOME/.local/share/applications"

mkdir -p "$ICONS_DIR" "$APPS_DIR"

cp "$INSTALL_DIR/playlist-manager.png" "$ICONS_DIR/playlist-manager.png"
cp "$INSTALL_DIR/playlist-manager.desktop" "$APPS_DIR/playlist-manager.desktop"

command -v update-desktop-database &>/dev/null && update-desktop-database "$APPS_DIR"
command -v gtk-update-icon-cache &>/dev/null && gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor"

echo "Desktop entry installed."
