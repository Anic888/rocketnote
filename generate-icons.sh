#!/bin/bash

# Скрипт для генерации иконок приложения из SVG
# Требует: brew install librsvg imagemagick

echo "🚀 Генерация иконок для Notepad Mac..."

# Проверяем наличие инструментов
if ! command -v rsvg-convert &> /dev/null; then
    echo "❌ rsvg-convert не найден. Установите: brew install librsvg"
    exit 1
fi

# Пути
SVG_FILE="public/icon-1024.svg"
ICONS_DIR="src-tauri/icons"

# Создаём директорию если нет
mkdir -p "$ICONS_DIR"
mkdir -p icon.iconset

echo "📐 Конвертация SVG в PNG..."

# Генерируем PNG разных размеров
rsvg-convert -w 1024 -h 1024 "$SVG_FILE" > "$ICONS_DIR/1024x1024.png"
rsvg-convert -w 512 -h 512 "$SVG_FILE" > "$ICONS_DIR/512x512.png"
rsvg-convert -w 256 -h 256 "$SVG_FILE" > "$ICONS_DIR/256x256.png"
rsvg-convert -w 128 -h 128 "$SVG_FILE" > "$ICONS_DIR/128x128.png"
rsvg-convert -w 256 -h 256 "$SVG_FILE" > "$ICONS_DIR/128x128@2x.png"
rsvg-convert -w 32 -h 32 "$SVG_FILE" > "$ICONS_DIR/32x32.png"
rsvg-convert -w 256 -h 256 "$SVG_FILE" > "$ICONS_DIR/icon.png"

echo "🍎 Создание .icns для macOS..."

# Создаём iconset для macOS
rsvg-convert -w 16 -h 16 "$SVG_FILE" > icon.iconset/icon_16x16.png
rsvg-convert -w 32 -h 32 "$SVG_FILE" > icon.iconset/icon_16x16@2x.png
rsvg-convert -w 32 -h 32 "$SVG_FILE" > icon.iconset/icon_32x32.png
rsvg-convert -w 64 -h 64 "$SVG_FILE" > icon.iconset/icon_32x32@2x.png
rsvg-convert -w 128 -h 128 "$SVG_FILE" > icon.iconset/icon_128x128.png
rsvg-convert -w 256 -h 256 "$SVG_FILE" > icon.iconset/icon_128x128@2x.png
rsvg-convert -w 256 -h 256 "$SVG_FILE" > icon.iconset/icon_256x256.png
rsvg-convert -w 512 -h 512 "$SVG_FILE" > icon.iconset/icon_256x256@2x.png
rsvg-convert -w 512 -h 512 "$SVG_FILE" > icon.iconset/icon_512x512.png
rsvg-convert -w 1024 -h 1024 "$SVG_FILE" > icon.iconset/icon_512x512@2x.png

# Конвертируем в .icns
iconutil -c icns icon.iconset -o "$ICONS_DIR/icon.icns"

# Удаляем временную папку
rm -rf icon.iconset

echo "🪟 Создание .ico для Windows..."

# Создаём .ico (если установлен ImageMagick)
if command -v convert &> /dev/null; then
    convert "$ICONS_DIR/256x256.png" "$ICONS_DIR/32x32.png" "$ICONS_DIR/icon.ico"
else
    echo "⚠️  ImageMagick не найден, .ico не создан. Установите: brew install imagemagick"
fi

echo ""
echo "✅ Готово! Иконки созданы в $ICONS_DIR"
echo ""
echo "📦 Теперь пересоберите приложение:"
echo "   cargo tauri build"
