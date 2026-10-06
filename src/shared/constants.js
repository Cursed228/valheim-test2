/**
 * Общие константы лаунчера.
 */

module.exports = {
  // Ссылка на JSON-конфиг серверов (постоянная, GitHub raw)
  DEFAULT_CONFIG_URL: 'https://raw.githubusercontent.com/Cursed228/valheim-test/main/servers.json',

  // Steam AppID для Valheim
  VALHEIM_APPID: '892970',

  // Имя исполняемого файла игры
  WIN_EXE: 'valheim.exe',
  MAC_EXE: 'Valheim.app/Contents/MacOS/Valheim',

  // Папки и файлы, которые удаляются при сбросе модов
  MOD_FOLDERS: ['BepInEx', 'doorstop_libs'],
  MOD_FILES: ['winhttp.dll', 'doorstop_config.ini', '.doorstop_version'],

  // Название файла с метаданными внутри ZIP (опционально)
  MANIFEST_NAME: 'manifest.json'
};