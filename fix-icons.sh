#!/bin/bash
# Quick script to generate icon.icns from existing icon.iconset/
# Run this BEFORE 'cargo tauri build' if icon.icns is missing

if [ ! -f "src-tauri/icons/icon.icns" ]; then
  echo "🍎 Generating icon.icns..."
  
  if [ -d "icon.iconset" ]; then
    iconutil -c icns icon.iconset -o src-tauri/icons/icon.icns
    echo "✅ icon.icns created"
  else
    echo "⚠️  icon.iconset/ directory not found"
    echo "   Creating from src-tauri/icons/ PNGs..."
    mkdir -p _tmp.iconset
    cp src-tauri/icons/32x32.png _tmp.iconset/icon_32x32.png
    cp src-tauri/icons/128x128.png _tmp.iconset/icon_128x128.png
    cp src-tauri/icons/128x128@2x.png _tmp.iconset/icon_128x128@2x.png
    cp src-tauri/icons/256x256.png _tmp.iconset/icon_256x256.png
    cp src-tauri/icons/512x512.png _tmp.iconset/icon_512x512.png
    cp src-tauri/icons/1024x1024.png _tmp.iconset/icon_512x512@2x.png
    iconutil -c icns _tmp.iconset -o src-tauri/icons/icon.icns
    rm -rf _tmp.iconset
    echo "✅ icon.icns created"
  fi
else
  echo "✅ icon.icns already exists"
fi
