# Valheim Launcher

Desktop-лаунчер для серверов Valheim на Electron.

## Установка

```
npm install
```

## Запуск

```
npm start
```

## Сборка под Windows

```
npm run build:win
```

## Сборка релиза

```bash
# Windows — создаст установщик .exe в папке dist/
npm run build:win

# macOS — создаст .dmg
npm run build:mac
```

## Структура

- src/main — основная логика Electron
- src/renderer — интерфейс
- src/shared — общий код
- server-config — конфигурации серверов
- assets — ресурсы
