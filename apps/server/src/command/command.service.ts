import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { StreamCommand } from './interfaces/command.interface';

export interface InstalledApp {
  Name: string;
  Icon: string;
  Path: string;
  Source: string;
}

@Injectable()
export class CommandService {
  private filePath = path.join(process.cwd(), 'data', 'commands.json');
  private appsCache = path.join(process.cwd(), 'data', 'installed-apps.json');
  private iconsDir = path.join(process.cwd(), 'data', 'app-icons');

  private ensureFile() {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2));
    }
  }

  async getAll(): Promise<StreamCommand[]> {
    this.ensureFile();
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
  }

  async saveAll(commands: StreamCommand[]) {
    this.ensureFile();
    fs.writeFileSync(this.filePath, JSON.stringify(commands, null, 2));
  }

  getMultimediaPresets() {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      return [
        {
          id: 'preset-volume-up',
          label: '🔊 Subir Volumen',
          icon: '🔊',
          payload:
            'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"',
          description: 'Aumenta el volumen del sistema',
        },
        {
          id: 'preset-volume-down',
          label: '🔉 Bajar Volumen',
          icon: '🔉',
          payload:
            'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"',
          description: 'Disminuye el volumen del sistema',
        },
        {
          id: 'preset-volume-mute',
          label: '🔇 Silenciar',
          icon: '🔇',
          payload:
            'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"',
          description: 'Silencia/activa el volumen',
        },
        {
          id: 'preset-media-play-pause',
          label: '⏯️ Play/Pausa',
          icon: '⏯️',
          payload:
            'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]179)"',
          description: 'Reproduce/pausa el audio actual',
        },
        {
          id: 'preset-media-next',
          label: '⏭️ Siguiente',
          icon: '⏭️',
          payload:
            'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]176)"',
          description: 'Pista siguiente',
        },
        {
          id: 'preset-media-previous',
          label: '⏮️ Anterior',
          icon: '⏮️',
          payload:
            'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]177)"',
          description: 'Pista anterior',
        },
      ];
    }

    const isMac = process.platform === 'darwin';

    if (isMac) {
      return [
        {
          id: 'preset-volume-up',
          label: '🔊 Subir Volumen',
          icon: '🔊',
          payload:
            'osascript -e "set volume output volume ((output volume of (get volume settings)) + 10)"',
          description: 'Aumenta el volumen del sistema',
        },
        {
          id: 'preset-volume-down',
          label: '🔉 Bajar Volumen',
          icon: '🔉',
          payload:
            'osascript -e "set volume output volume ((output volume of (get volume settings)) - 10)"',
          description: 'Disminuye el volumen del sistema',
        },
        {
          id: 'preset-volume-mute',
          label: '🔇 Silenciar',
          icon: '🔇',
          payload:
            'osascript -e "set volume output muted not (output muted of (get volume settings))"',
          description: 'Silencia/activa el volumen',
        },
        {
          id: 'preset-media-play-pause',
          label: '⏯️ Play/Pausa',
          icon: '⏯️',
          payload:
            'osascript -e "tell application \"System Events\" to key code 49 using {command down}"',
          description: 'Reproduce/pausa el audio actual',
        },
        {
          id: 'preset-media-next',
          label: '⏭️ Siguiente',
          icon: '⏭️',
          payload:
            'osascript -e "tell application \"System Events\" to key code 124 using {command down}"',
          description: 'Pista siguiente',
        },
        {
          id: 'preset-media-previous',
          label: '⏮️ Anterior',
          icon: '⏮️',
          payload:
            'osascript -e "tell application \"System Events\" to key code 123 using {command down}"',
          description: 'Pista anterior',
        },
        {
          id: 'preset-brightness-up',
          label: '🔆 Subir Brillo',
          icon: '🔆',
          payload:
            'osascript -e "tell application \"System Events\" to key code 144"',
          description: 'Aumenta el brillo de la pantalla',
        },
        {
          id: 'preset-brightness-down',
          label: '🔅 Bajar Brillo',
          icon: '🔅',
          payload:
            'osascript -e "tell application \"System Events\" to key code 145"',
          description: 'Disminuye el brillo de la pantalla',
        },
      ];
    }

    // Linux (requiere: playerctl, pactl/pulseaudio)
    return [
      {
        id: 'preset-volume-up',
        label: '🔊 Subir Volumen',
        icon: '🔊',
        payload: 'pactl set-sink-volume @DEFAULT_SINK@ +10%',
        description: 'Aumenta el volumen del sistema (PulseAudio)',
      },
      {
        id: 'preset-volume-down',
        label: '🔉 Bajar Volumen',
        icon: '🔉',
        payload: 'pactl set-sink-volume @DEFAULT_SINK@ -10%',
        description: 'Disminuye el volumen del sistema (PulseAudio)',
      },
      {
        id: 'preset-volume-mute',
        label: '🔇 Silenciar',
        icon: '🔇',
        payload: 'pactl set-sink-mute @DEFAULT_SINK@ toggle',
        description: 'Silencia/activa el volumen (PulseAudio)',
      },
      {
        id: 'preset-media-play-pause',
        label: '⏯️ Play/Pausa',
        icon: '⏯️',
        payload: 'playerctl play-pause',
        description: 'Reproduce/pausa el audio actual (playerctl)',
      },
      {
        id: 'preset-media-next',
        label: '⏭️ Siguiente',
        icon: '⏭️',
        payload: 'playerctl next',
        description: 'Pista siguiente (playerctl)',
      },
      {
        id: 'preset-media-previous',
        label: '⏮️ Anterior',
        icon: '⏮️',
        payload: 'playerctl previous',
        description: 'Pista anterior (playerctl)',
      },
      {
        id: 'preset-brightness-up',
        label: '🔆 Subir Brillo',
        icon: '🔆',
        payload: 'brightnessctl set +10%',
        description: 'Aumenta el brillo (brightnessctl)',
      },
      {
        id: 'preset-brightness-down',
        label: '🔅 Bajar Brillo',
        icon: '🔅',
        payload: 'brightnessctl set 10%-',
        description: 'Disminuye el brillo (brightnessctl)',
      },
    ];
  }

  async execute(id: string) {
    const commands = await this.getAll();
    const command = commands.find((c) => c.id === id);

    if (!command) {
      throw new NotFoundException('Command not found');
    }

    if (!this.isCommandAllowed(command.payload)) {
      throw new ForbiddenException('Command not allowed');
    }

    const normalizedCommand = this.normalizeCommand(command.payload);
    return await this.execAsync(normalizedCommand);
  }

  private normalizeCommand(command: string): string {
    const platform = process.platform;
    const trimmed = command.trim();
    const urlPattern = /^(https?:\/\/|www\.)/i;

    // ─── URL detection (all platforms) ───
    if (urlPattern.test(trimmed)) {
      if (platform === 'win32') return `start "" "${trimmed}"`;
      if (platform === 'darwin') return `open "${trimmed}"`;
      return `xdg-open "${trimmed}"`; // Linux
    }

    // ─── Windows-specific normalization ───
    if (platform === 'win32') {
      // UWP/Store apps: shell:AppsFolder\AppId
      if (
        trimmed.startsWith('shell:AppsFolder\\') ||
        trimmed.includes('shell:AppsFolder\\')
      ) {
        const shellPath = trimmed.startsWith('shell:AppsFolder\\')
          ? trimmed
          : trimmed.match(/shell:AppsFolder\\.+/)?.[0] || trimmed;
        return `explorer.exe "${shellPath}"`;
      }

      // Legacy WindowsApps paths → try to resolve via explorer
      if (
        trimmed.includes('\\WindowsApps\\') ||
        (trimmed.includes('start ""') && trimmed.includes('\\WindowsApps\\'))
      ) {
        const pathMatch = trimmed.match(
          /[A-Z]:\\Program Files\\WindowsApps\\([^"\\]+)/i,
        );
        if (pathMatch) {
          // Extract package family name from the install path
          const folderName = pathMatch[1];
          // Convert folder name like "5319275A.WhatsAppDesktop_2.2605.103.0_x64__cv1g1gvanyjgm"
          // to family name "5319275A.WhatsAppDesktop_cv1g1gvanyjgm"
          const parts = folderName.split('_');
          if (parts.length >= 2) {
            const publisherId = parts[parts.length - 1];
            const familyName = parts[0] + '_' + publisherId;
            return `explorer.exe "shell:AppsFolder\\${familyName}!App"`;
          }
        }
      }

      if (command.includes('start ""')) {
        const startMatch = command.match(/start\s+""\s+(.+)$/i);
        if (startMatch) {
          const targetPath = startMatch[1].trim();
          if (!targetPath.startsWith('"') && targetPath.includes(' ')) {
            return `start "" "${targetPath}"`;
          }
          return command;
        }
      }

      const drivePathPattern = /^([A-Z]:\\)/i;
      if (drivePathPattern.test(trimmed)) {
        if (trimmed.endsWith('\\')) {
          throw new Error(
            'La ruta parece ser una carpeta, no un archivo ejecutable. Asegúrate de especificar la ruta completa al .exe',
          );
        }
        if (!trimmed.startsWith('"') && trimmed.includes(' ')) {
          return `"${trimmed}"`;
        }
        return trimmed;
      }

      if (trimmed.startsWith('"')) return trimmed;
    }

    // ─── macOS-specific normalization ───
    if (platform === 'darwin') {
      // .app bundles → open -a
      if (trimmed.endsWith('.app') || trimmed.includes('.app/')) {
        if (!trimmed.startsWith('open ')) {
          return `open "${trimmed}"`;
        }
      }
      // Absolute paths starting with /
      if (
        trimmed.startsWith('/') &&
        !trimmed.startsWith('/bin/') &&
        !trimmed.startsWith('/usr/')
      ) {
        if (
          trimmed.includes(' ') &&
          !trimmed.startsWith('"') &&
          !trimmed.startsWith('open ')
        ) {
          return `open "${trimmed}"`;
        }
      }
    }

    // ─── Linux-specific normalization ───
    if (platform === 'linux') {
      // .desktop files → use gtk-launch
      if (trimmed.endsWith('.desktop')) {
        const desktopName = path.basename(trimmed, '.desktop');
        return `gtk-launch ${desktopName}`;
      }
      // Absolute paths to executables
      if (
        trimmed.startsWith('/') &&
        trimmed.includes(' ') &&
        !trimmed.startsWith('"')
      ) {
        return `"${trimmed}"`;
      }
    }

    return command;
  }

  private execAsync(command: string) {
    return new Promise<{ success: boolean; output?: string }>(
      (resolve, reject) => {
        let finalCommand = command;
        const platform = process.platform;

        // ─── Windows: wrap .exe paths with start ───
        if (platform === 'win32') {
          const isExePath =
            command.toLowerCase().includes('.exe') &&
            (command.trim().startsWith('"') || command.includes(':\\'));

          // Don't wrap with start if the command already has arguments (e.g. Update.exe --processStart)
          const hasArgs =
            command.includes('--processStart') || command.includes(' --');

          if (
            isExePath &&
            !command.toLowerCase().startsWith('start ') &&
            !hasArgs
          ) {
            const cleanPath = command.replace(/^["']|["']$/g, '').trim();
            finalCommand = `start "" "${cleanPath}"`;
          }
        }

        // ─── macOS: wrap executable paths with open ───
        if (platform === 'darwin') {
          const clean = command.trim();
          // If it's a direct path to an .app and not already using 'open'
          if (
            (clean.endsWith('.app') || clean.includes('.app/')) &&
            !clean.startsWith('open ')
          ) {
            finalCommand = `open "${clean.replace(/^"|"$/g, '')}"`;
          }
        }

        // ─── Linux: detach GUI apps with nohup ───
        if (platform === 'linux') {
          const clean = command.trim();
          // If it's a direct binary path (not a shell built-in)
          if (
            clean.startsWith('/usr/') &&
            !clean.startsWith('/usr/bin/env') &&
            !clean.includes('|') &&
            !clean.includes('&&') &&
            !clean.includes('nohup')
          ) {
            finalCommand = `nohup ${clean} > /dev/null 2>&1 &`;
          }
        }

        const options: { shell: string; windowsHide: boolean } = {
          shell: platform === 'win32' ? 'cmd.exe' : '/bin/sh',
          windowsHide: true,
        };

        exec(finalCommand, options, (error, stdout, stderr) => {
          // Algunos comandos de lanzamiento funcionan pero retornan códigos de error
          const isLaunchCommand =
            finalCommand.toLowerCase().includes('explorer') ||
            finalCommand.toLowerCase().includes('start ') ||
            finalCommand.startsWith('open ') ||
            finalCommand.startsWith('xdg-open ') ||
            finalCommand.startsWith('gtk-launch ') ||
            finalCommand.includes('nohup');

          if (error && !isLaunchCommand) {
            reject(new Error(stderr || error.message));
          } else {
            resolve({
              success: true,
              output: stdout || 'Comando ejecutado',
            });
          }
        });
      },
    );
  }

  private execAsyncRaw(command: string) {
    return new Promise<string>((resolve, reject) => {
      const options = {
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer para output grande
      };

      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  private isCommandAllowed(command: string) {
    const cmd = command.toLowerCase();
    const platform = process.platform;

    // Comandos bloqueados universales
    const blocked = ['shutdown', 'reboot'];

    if (platform === 'win32') {
      blocked.push(
        'del ',
        'format ',
        'powershell -enc',
        'reg delete',
        'diskpart',
      );
    }

    if (platform === 'darwin') {
      blocked.push(
        'rm -rf /',
        'diskutil eraseDisk',
        'diskutil partitionDisk',
        'sudo rm',
        'sudo reboot',
        'sudo halt',
        'srm ',
        'newfs_',
      );
    }

    if (platform === 'linux') {
      blocked.push(
        'rm -rf /',
        'dd if=',
        'mkfs.',
        'sudo rm',
        'sudo reboot',
        'sudo halt',
        ':(){',
        'chmod -R 777 /',
        'mv / ',
        '> /dev/sda',
      );
    }

    return !blocked.some((b) => cmd.includes(b));
  }

  async getInstalledApps(forceRescan = false) {
    const platform = process.platform;

    // Check cache first (unless force rescan)
    if (!forceRescan && fs.existsSync(this.appsCache)) {
      try {
        const cached = JSON.parse(fs.readFileSync(this.appsCache, 'utf-8'));
        if (cached && Array.isArray(cached.apps) && cached.apps.length > 0) {
          console.log(
            `Usando cache de apps (${cached.apps.length} apps, escaneado: ${cached.scannedAt})`,
          );
          return {
            success: true,
            apps: cached.apps,
            cached: true,
            scannedAt: cached.scannedAt,
          };
        }
      } catch {
        // Cache corrupted, rescan
      }
    }

    // ─── Route to platform-specific scanner ───
    if (platform === 'darwin') {
      return this.getInstalledAppsMac();
    }
    if (platform === 'linux') {
      return this.getInstalledAppsLinux();
    }

    try {
      // Crear un archivo temporal con el script de PowerShell (Windows)
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const scriptPath = path.join(tempDir, 'get-apps.ps1');

      const psScript = `
$apps = @()

# Obtener aplicaciones tradicionales del registro
$paths = @(
  'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
)

foreach ($path in $paths) {
  Get-ItemProperty $path -ErrorAction SilentlyContinue | Where-Object { 
    $_.DisplayName -and $_.DisplayName -notlike 'Update for*' 
  } | ForEach-Object {
    $icon = if ($_.DisplayIcon) { $_.DisplayIcon } else { '' }
    $location = if ($_.InstallLocation) { $_.InstallLocation } else { '' }
    $displayName = $_.DisplayName
    
    # Filtrar apps: Program Files o aplicaciones conocidas populares
    $isValid = $false
    
    # O si es una aplicación popular conocida (revisar primero para incluir Office sin InstallLocation)
    $popularApps = @('Steam', 'Discord', 'Spotify', 'Chrome', 'Firefox', 'Brave', 'Opera', 'Visual Studio Code', 'Slack', 'Telegram', 'WhatsApp', 'Zoom', 'OBS', 'VLC', 'Netflix', 'Microsoft Word', 'Microsoft Excel', 'Microsoft PowerPoint', 'Microsoft Outlook', 'Microsoft OneNote', 'Microsoft Access', 'Microsoft Publisher', 'Microsoft Teams', 'Microsoft Office')
    foreach ($app in $popularApps) {
      if ($displayName -like "*$app*") {
        $isValid = $true
        break
      }
    }
    
    # Incluir si está en Program Files (si no fue incluido ya)
    if (-not $isValid -and $location -like '*Program Files*') {
      $isValid = $true
    }
    
    if ($isValid) {
      # Intentar obtener el ejecutable principal
      $exePath = ''
      
      # Primero intentar desde DisplayIcon si es un .exe
      if ($icon -and $icon -like '*.exe*') {
        $exePath = $icon -replace ',\d+$', ''  # Quitar índice de icono
      }
      
      # Si no, buscar en InstallLocation
      if (-not $exePath -and $location -and (Test-Path $location)) {
        # Buscar el .exe principal en la carpeta
        $exeFiles = Get-ChildItem -Path $location -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue -Depth 2 | 
          Where-Object { $_.Name -notlike '*unins*' -and $_.Name -notlike '*update*' } |
          Select-Object -First 1
        
        if ($exeFiles) {
          $exePath = $exeFiles.FullName
        }
      }
      
      # Apps tipo Electron que usan Update.exe --processStart (Discord, Slack, etc.)
      $updateExe = Join-Path $location 'Update.exe'
      if ((Test-Path $updateExe) -and $exePath) {
        $exeName = [System.IO.Path]::GetFileName($exePath)
        $finalPath = "\`"$updateExe\`" --processStart $exeName"
      } else {
        # Si encontramos el exe, usarlo; si no, dejar el directorio
        $finalPath = if ($exePath) { $exePath } else { $location }
      }
      
      $apps += [PSCustomObject]@{
        Name = $displayName
        Icon = $icon
        Path = $finalPath
        Source = 'Registry'
      }
    }
  }
}

# Obtener aplicaciones de Microsoft Store (AppX)
try {
  # Lista de apps populares de Store que queremos incluir
  $popularStoreApps = @('Netflix', 'Spotify', 'Disney', 'Prime Video', 'WhatsApp', 'Instagram', 'Facebook', 'Twitter', 'TikTok', 'Zoom')
  
  Get-AppxPackage | Where-Object { 
    $_.NonRemovable -eq $false -and 
    $_.Name -notlike '*Microsoft.Windows*' -and 
    $_.Name -notlike '*Microsoft.VCLibs*' -and
    $_.Name -notlike '*Microsoft.NET*' -and
    $_.Name -notlike '*.NET*' -and
    $_.SignatureKind -eq 'Store'
  } | ForEach-Object {
    $manifest = Get-AppxPackageManifest $_.PackageFullName -ErrorAction SilentlyContinue
    $displayName = if ($manifest.Package.Properties.DisplayName) { 
      $manifest.Package.Properties.DisplayName 
    } else { 
      $_.Name 
    }
    
    # Obtener AppUserModelId para poder lanzar la app
    $appId = ''
    try {
      $appEntries = (Get-AppxPackage $_.PackageFamilyName | Get-AppxPackageManifest).Package.Applications.Application
      if ($appEntries) {
        $entry = if ($appEntries -is [array]) { $appEntries[0] } else { $appEntries }
        $appId = $_.PackageFamilyName + '!' + $entry.Id
      }
    } catch {}
    
    # Verificar si es una app popular o tiene nombre válido
    $isPopular = $false
    foreach ($app in $popularStoreApps) {
      if ($_.Name -like "*$app*" -or $displayName -like "*$app*") {
        $isPopular = $true
        # Usar un nombre más amigable si es posible
        if ($_.Name -like "*Netflix*") { $displayName = "Netflix" }
        elseif ($_.Name -like "*Spotify*") { $displayName = "Spotify" }
        elseif ($_.Name -like "*Disney*") { $displayName = "Disney+" }
        elseif ($_.Name -like "*Prime*") { $displayName = "Prime Video" }
        break
      }
    }
    
    # Filtrar: debe ser popular o tener nombre válido (no ms-resource)
    if (($isPopular -or ($displayName -notlike 'ms-resource:*' -and $displayName -notlike '*Framework*')) -and $displayName) {
      # Usar AppUserModelId como Path para poder lanzar la app correctamente
      $launchPath = if ($appId) { "shell:AppsFolder\\$appId" } else { $_.InstallLocation }
      $apps += [PSCustomObject]@{
        Name = $displayName
        Icon = ''
        Path = $launchPath
        Source = 'Store'
      }
    }
  }
} catch {
  # Continuar si hay error obteniendo apps de Store
}

# Obtener PWAs (Progressive Web Apps) de Chrome, Edge y Brave
try {
  $shell = New-Object -ComObject WScript.Shell
  
  # Buscar shortcuts en múltiples ubicaciones
  $searchPaths = @(
    "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs",
    "$env:APPDATA\\Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar",
    "$env:USERPROFILE\\Desktop"
  )
  
  foreach ($startMenuPath in $searchPaths) {
    if (Test-Path $startMenuPath) {
      Get-ChildItem -Path $startMenuPath -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
        try {
          $shortcut = $shell.CreateShortcut($_.FullName)
          $targetPath = $shortcut.TargetPath
          $arguments = $shortcut.Arguments
          
          # Detectar PWAs (Chrome, Edge, Brave con --app-id)
          $isPWA = (
            ($targetPath -like "*chrome.exe" -or 
             $targetPath -like "*msedge.exe" -or 
             $targetPath -like "*chrome_proxy.exe" -or
             $targetPath -like "*brave.exe") -and 
            $arguments -like "*--app-id=*"
          )
          
          if ($isPWA) {
            $appName = $_.BaseName
            # Limpiar nombres técnicos
            if ($appName -notlike '*Uninstall*' -and $appName -notlike '*Update*') {
              # Determinar el navegador
              $browser = "PWA"
              if ($targetPath -like "*chrome_proxy.exe" -or $targetPath -like "*brave.exe") {
                $browser = "Brave"
              } elseif ($targetPath -like "*chrome.exe") {
                $browser = "Chrome"
              } elseif ($targetPath -like "*msedge.exe") {
                $browser = "Edge"
              }
              
              $apps += [PSCustomObject]@{
                Name = "$appName ($browser)"
                Icon = $shortcut.IconLocation
                Path = """$targetPath"" $arguments"
                Source = 'PWA'
              }
            }
          }
        } catch {
          # Ignorar shortcuts problemáticos
        }
      }
    }
  }
} catch {
  # Continuar si hay error obteniendo PWAs
}

$unique = $apps | Sort-Object Name -Unique | Select-Object -First 200
if ($unique.Count -gt 0) {
  $unique | ConvertTo-Json -Depth 3 -Compress
} else {
  '[]'
}
`;

      // Escribir el script
      fs.writeFileSync(scriptPath, psScript, 'utf-8');

      // Ejecutar el script desde el archivo
      const command = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;

      console.log('Ejecutando script de PowerShell para obtener apps...');
      const output = await this.execAsyncRaw(command);
      console.log('Output length:', output?.length || 0);

      // Limpiar el archivo temporal
      try {
        fs.unlinkSync(scriptPath);
      } catch (e) {
        // Ignorar errores al eliminar
      }

      let apps: InstalledApp[] = [];
      if (output && output.trim()) {
        try {
          const cleaned = output.trim();
          if (cleaned && cleaned !== '[]') {
            const parsed = JSON.parse(cleaned);
            apps = Array.isArray(parsed) ? parsed : [parsed];
            apps = apps.filter((app) => app && app.Name);
          }
        } catch (e) {
          console.error('Error parsing JSON:', e);
          console.error('First 500 chars:', output?.substring(0, 500));
        }
      }

      console.log(`Encontradas ${apps.length} aplicaciones`);
      const result = apps.slice(0, 100);

      // Extract icons from executables
      await this.extractWindowsIcons(result);

      // Save to cache
      try {
        const cacheData = {
          scannedAt: new Date().toISOString(),
          apps: result,
        };
        fs.writeFileSync(
          this.appsCache,
          JSON.stringify(cacheData, null, 2),
          'utf-8',
        );
        console.log('Cache de apps guardado en', this.appsCache);
      } catch (e) {
        console.error('Error guardando cache de apps:', e);
      }

      return {
        success: true,
        apps: result,
        cached: false,
        scannedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting installed apps:', error);
      return {
        success: false,
        message: 'Error al obtener aplicaciones instaladas',
        apps: [],
        cached: false,
      };
    }
  }

  /** Check if there is a cached app list (without scanning) */
  hasAppsCache(): { hasCache: boolean; scannedAt?: string; count?: number } {
    try {
      if (fs.existsSync(this.appsCache)) {
        const cached = JSON.parse(fs.readFileSync(this.appsCache, 'utf-8'));
        if (cached && Array.isArray(cached.apps)) {
          return {
            hasCache: true,
            scannedAt: cached.scannedAt,
            count: cached.apps.length,
          };
        }
      }
    } catch {
      // ignore
    }
    return { hasCache: false };
  }

  private async execPowerShellScript(script: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(
        `powershell -Command "${script.replace(/"/g, '\\"')}"`,
        { windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            path.resolve(stdout);
          }
        },
      );
    });
  }

  // ─── macOS App Scanner ───
  private async getInstalledAppsMac() {
    try {
      console.log('Escaneando aplicaciones en macOS...');

      const script = `
APPS='['
FIRST=1

# Scan /Applications and ~/Applications
for dir in /Applications "$HOME/Applications"; do
  if [ -d "$dir" ]; then
    find "$dir" -maxdepth 2 -name "*.app" -type d 2>/dev/null | while read app; do
      name=$(basename "$app" .app)
      # Get bundle identifier for icon lookup
      bundleId=""
      plistFile="$app/Contents/Info.plist"
      if [ -f "$plistFile" ]; then
        bundleId=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$plistFile" 2>/dev/null || echo "")
      fi
      # Escape special chars for JSON
      escapedName=$(echo "$name" | sed 's/\\\\/\\\\\\\\/g; s/"/\\\\"/g')
      escapedPath=$(echo "$app" | sed 's/\\\\/\\\\\\\\/g; s/"/\\\\"/g')
      escapedBundle=$(echo "$bundleId" | sed 's/\\\\/\\\\\\\\/g; s/"/\\\\"/g')
      if [ $FIRST -eq 1 ]; then
        FIRST=0
      else
        printf ","
      fi
      printf '{"Name":"%s","Path":"%s","Icon":"%s","Source":"Applications"}' "$escapedName" "$escapedPath" "$escapedBundle"
    done
  fi
done

# Scan Homebrew Cask apps (symlinked to /Applications)
# Already covered by /Applications scan

echo ']'
`;

      const output = await this.execAsyncRaw(
        `/bin/sh -c '${script.replace(/'/g, "'\\''")}'`,
      );
      let apps: InstalledApp[] = [];

      if (output && output.trim()) {
        try {
          // The script prints JSON objects line by line, collect them
          const cleaned = output.trim();
          if (cleaned && cleaned !== '[]') {
            apps = JSON.parse(cleaned);
            if (!Array.isArray(apps)) apps = [apps];
            apps = apps.filter((a) => a && a.Name);
          }
        } catch {
          // Fallback: simpler approach using ls
          try {
            const lsOutput = await this.execAsyncRaw(
              'ls -1 /Applications/ 2>/dev/null | grep ".app$" | sed "s/.app$//"',
            );
            if (lsOutput) {
              apps = lsOutput
                .trim()
                .split('\n')
                .filter((n) => n.trim())
                .map((name) => ({
                  Name: name.trim(),
                  Path: `/Applications/${name.trim()}.app`,
                  Icon: '',
                  Source: 'Applications',
                }));
            }
          } catch {
            // ignore
          }
        }
      }

      console.log(`Encontradas ${apps.length} aplicaciones (macOS)`);
      const result = apps.slice(0, 200);

      // Save to cache
      this.saveAppsCache(result);

      return {
        success: true,
        apps: result,
        cached: false,
        scannedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting macOS apps:', error);
      return {
        success: false,
        message: 'Error al obtener aplicaciones instaladas en macOS',
        apps: [],
        cached: false,
      };
    }
  }

  // ─── Linux App Scanner ───
  private async getInstalledAppsLinux() {
    try {
      console.log('Escaneando aplicaciones en Linux...');

      // Parse .desktop files to get Name, Exec, Icon
      const script = `
find /usr/share/applications /usr/local/share/applications "$HOME/.local/share/applications" /var/lib/snapd/desktop/applications /var/lib/flatpak/exports/share/applications 2>/dev/null -name "*.desktop" -type f | while read desktop; do
  name=""
  execCmd=""
  icon=""
  noDisplay=""
  type=""
  
  while IFS='=' read -r key value; do
    case "$key" in
      "Name") [ -z "$name" ] && name="$value" ;;
      "Exec") [ -z "$execCmd" ] && execCmd="$value" ;;
      "Icon") [ -z "$icon" ] && icon="$value" ;;
      "NoDisplay") noDisplay="$value" ;;
      "Type") type="$value" ;;
    esac
  done < "$desktop"
  
  # Skip non-application entries and hidden ones
  if [ "$type" != "Application" ] || [ "$noDisplay" = "true" ]; then
    continue
  fi
  
  # Skip entries without name or exec
  if [ -z "$name" ] || [ -z "$execCmd" ]; then
    continue
  fi
  
  # Clean exec: remove %u, %U, %f, %F args
  cleanExec=$(echo "$execCmd" | sed 's/ %[uUfFdDnNickvm]//g')
  
  # Escape for JSON
  escapedName=$(echo "$name" | sed 's/\\\\/\\\\\\\\/g; s/"/\\\\"/g')
  escapedPath=$(echo "$cleanExec" | sed 's/\\\\/\\\\\\\\/g; s/"/\\\\"/g')
  escapedIcon=$(echo "$icon" | sed 's/\\\\/\\\\\\\\/g; s/"/\\\\"/g')
  desktopFile=$(basename "$desktop")
  
  printf '{"Name":"%s","Path":"%s","Icon":"%s","Source":"%s"}\\n' "$escapedName" "$escapedPath" "$escapedIcon" "$desktopFile"
done
`;

      const output = await this.execAsyncRaw(
        `/bin/sh -c '${script.replace(/'/g, "'\\''")}'`,
      );
      let apps: InstalledApp[] = [];

      if (output && output.trim()) {
        const lines = output
          .trim()
          .split('\n')
          .filter((l) => l.trim());
        const seen = new Set<string>();

        for (const line of lines) {
          try {
            const app = JSON.parse(line) as InstalledApp;
            if (app && app.Name && !seen.has(app.Name)) {
              seen.add(app.Name);
              apps.push(app);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }

      // Sort alphabetically
      apps.sort((a, b) => a.Name.localeCompare(b.Name));

      console.log(`Encontradas ${apps.length} aplicaciones (Linux)`);
      const result = apps.slice(0, 200);

      // Save to cache
      this.saveAppsCache(result);

      return {
        success: true,
        apps: result,
        cached: false,
        scannedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting Linux apps:', error);
      return {
        success: false,
        message: 'Error al obtener aplicaciones instaladas en Linux',
        apps: [],
        cached: false,
      };
    }
  }

  // ─── Windows Icon Extraction ───
  private async extractWindowsIcons(apps: InstalledApp[]): Promise<void> {
    if (process.platform !== 'win32') return;

    // Ensure icons directory exists
    if (!fs.existsSync(this.iconsDir)) {
      fs.mkdirSync(this.iconsDir, { recursive: true });
    }

    console.log('🎨 Extrayendo iconos de aplicaciones...');

    // Build a PowerShell script that extracts all icons at once
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Collect exe paths that need icon extraction
    const extractionTasks: {
      index: number;
      exePath: string;
      iconFile: string;
    }[] = [];

    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      // Get the exe path from Icon or Path field
      let exePath = '';

      if (app.Icon && app.Icon.toLowerCase().includes('.exe')) {
        exePath = app.Icon.replace(/^["']|["']$/g, '').replace(/,\d+$/, '');
      } else if (app.Path && app.Path.toLowerCase().includes('.exe')) {
        exePath = app.Path.replace(/^["']|["']$/g, '')
          .split('"')[0]
          .trim();
      }

      if (!exePath) continue;

      // Create a safe filename from the app name
      const safeName = app.Name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(
        0,
        60,
      );
      const iconFile = `${safeName}.png`;
      const iconPath = path.join(this.iconsDir, iconFile);

      // Skip if icon already exists
      if (fs.existsSync(iconPath)) {
        app.Icon = `/app-icons/${iconFile}`;
        continue;
      }

      extractionTasks.push({ index: i, exePath, iconFile });
    }

    if (extractionTasks.length === 0) {
      console.log('🎨 Todos los iconos ya existen en cache');
      return;
    }

    // Build PowerShell script to extract all icons in batch
    const iconsDirEscaped = this.iconsDir.replace(/\\/g, '\\\\');
    const tasksJson = extractionTasks.map((t) => ({
      exePath: t.exePath.replace(/\\/g, '\\\\'),
      iconFile: t.iconFile,
    }));

    const psScript = `
Add-Type -AssemblyName System.Drawing

$outputDir = "${iconsDirEscaped}"
$results = @()

$tasks = @(
${tasksJson.map((t) => `  @{ ExePath = "${t.exePath}"; IconFile = "${t.iconFile}" }`).join('\n')}
)

foreach ($task in $tasks) {
  $exePath = $task.ExePath
  $iconFile = $task.IconFile
  $outPath = Join-Path $outputDir $iconFile
  
  try {
    if (Test-Path $exePath) {
      $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
      if ($icon) {
        $bitmap = $icon.ToBitmap()
        # Resize to 64x64 for consistency
        $resized = New-Object System.Drawing.Bitmap(64, 64)
        $graphics = [System.Drawing.Graphics]::FromImage($resized)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($bitmap, 0, 0, 64, 64)
        $resized.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $graphics.Dispose()
        $resized.Dispose()
        $bitmap.Dispose()
        $icon.Dispose()
        $results += $iconFile
      }
    }
  } catch {
    # Skip failed extractions
  }
}

$results -join ","
`;

    const scriptPath = path.join(tempDir, 'extract-icons.ps1');
    fs.writeFileSync(scriptPath, psScript, 'utf-8');

    try {
      const output = await this.execAsyncRaw(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
      );

      // Clean up script
      try {
        fs.unlinkSync(scriptPath);
      } catch {
        /* ignore */
      }

      const extracted = output?.trim().split(',').filter(Boolean) || [];
      console.log(
        `🎨 Iconos extraídos: ${extracted.length}/${extractionTasks.length}`,
      );

      // Update Icon field for successfully extracted icons
      for (const task of extractionTasks) {
        const iconPath = path.join(this.iconsDir, task.iconFile);
        if (fs.existsSync(iconPath)) {
          apps[task.index].Icon = `/app-icons/${task.iconFile}`;
        }
      }
    } catch (e) {
      console.error('Error extrayendo iconos:', e);
      try {
        fs.unlinkSync(scriptPath);
      } catch {
        /* ignore */
      }
    }
  }

  // ─── Shared cache saver ───
  private saveAppsCache(apps: InstalledApp[]) {
    try {
      const cacheData = {
        scannedAt: new Date().toISOString(),
        apps,
      };
      fs.writeFileSync(
        this.appsCache,
        JSON.stringify(cacheData, null, 2),
        'utf-8',
      );
      console.log('Cache de apps guardado en', this.appsCache);
    } catch (e) {
      console.error('Error guardando cache de apps:', e);
    }
  }

  // ─── Volume Control ───

  private audioHelperPath = path.join(
    process.cwd(),
    'data',
    'audio-helper.ps1',
  );

  /** Write the PowerShell audio helper script once (uses correct COM vtable) */
  private ensureAudioHelper() {
    if (fs.existsSync(this.audioHelperPath)) return;
    const script = `param([string]$Action, [float]$Level = 0)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int RegisterAudioEndpointVolumeCallback(IntPtr p);
    int UnregisterAudioEndpointVolumeCallback(IntPtr p);
    int GetChannelCount(out int c);
    int SetMasterVolumeLevel(float l, Guid g);
    int SetMasterVolumeLevelScalar(float l, Guid g);
    int GetMasterVolumeLevel(out float l);
    int GetMasterVolumeLevelScalar(out float l);
    int SetChannelVolumeLevel(int n, float l, Guid g);
    int SetChannelVolumeLevelScalar(int n, float l, Guid g);
    int GetChannelVolumeLevel(int n, out float l);
    int GetChannelVolumeLevelScalar(int n, out float l);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool m, Guid g);
    int GetMute(out bool m);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams,
                 [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }

public class Audio {
    static IAudioEndpointVolume GetVol() {
        var e = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDevice d; e.GetDefaultAudioEndpoint(0, 1, out d);
        var iid = typeof(IAudioEndpointVolume).GUID;
        object o; d.Activate(ref iid, 1, IntPtr.Zero, out o);
        return (IAudioEndpointVolume)o;
    }
    public static float GetVolume() { var v = GetVol(); float l; v.GetMasterVolumeLevelScalar(out l); return l; }
    public static bool GetMute() { var v = GetVol(); bool m; v.GetMute(out m); return m; }
    public static void SetVolume(float l) { GetVol().SetMasterVolumeLevelScalar(l, Guid.Empty); }
    public static void SetMute(bool m) { GetVol().SetMute(m, Guid.Empty); }
    public static bool ToggleMute() { var v = GetVol(); bool m; v.GetMute(out m); v.SetMute(!m, Guid.Empty); return !m; }
}
"@

switch ($Action) {
    'get' {
        $vol = [Math]::Round([Audio]::GetVolume() * 100)
        $muted = [Audio]::GetMute()
        Write-Output "$vol|$muted"
    }
    'set' {
        [Audio]::SetVolume($Level / 100)
    }
    'mute' {
        $muted = [Audio]::ToggleMute()
        Write-Output $muted
    }
}
`;
    fs.writeFileSync(this.audioHelperPath, script, 'utf-8');
  }

  /** Run the audio helper script via Windows PowerShell 5.1 */
  private runAudioHelper(args: string, timeout = 10000): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ensureAudioHelper();
      exec(
        `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${this.audioHelperPath}" ${args}`,
        { timeout },
        (err, stdout, stderr) => {
          if (err) {
            // Delete helper so it gets recreated on next call (in case of updates)
            try {
              fs.unlinkSync(this.audioHelperPath);
            } catch {
              /* ignore */
            }
            reject(new Error(`Audio helper failed: ${stderr || err.message}`));
          } else {
            resolve(stdout.trim());
          }
        },
      );
    });
  }

  async getVolume(): Promise<{ volume: number; muted: boolean }> {
    const platform = process.platform;

    if (platform === 'win32') {
      const output = await this.runAudioHelper('-Action get');
      const parts = output.split('|');
      return {
        volume: parseInt(parts[0]) || 0,
        muted: parts[1]?.toLowerCase() === 'true',
      };
    }

    if (platform === 'darwin') {
      return new Promise((resolve, reject) => {
        exec(
          'osascript -e "output volume of (get volume settings)" -e "output muted of (get volume settings)"',
          (err, stdout) => {
            if (err) {
              reject(new Error('Failed to get volume'));
              return;
            }
            const lines = stdout.trim().split('\n');
            resolve({
              volume: parseInt(lines[0]) || 0,
              muted: lines[1]?.toLowerCase() === 'true',
            });
          },
        );
      });
    }

    // Linux
    return new Promise((resolve, reject) => {
      exec('amixer get Master', (err, stdout) => {
        if (err) {
          reject(new Error('Failed to get volume'));
          return;
        }
        const volMatch = stdout.match(/\[(\d+)%\]/);
        const muteMatch = stdout.match(/\[(on|off)\]/);
        resolve({
          volume: volMatch ? parseInt(volMatch[1]) : 0,
          muted: muteMatch ? muteMatch[1] === 'off' : false,
        });
      });
    });
  }

  async setVolume(level: number): Promise<void> {
    const vol = Math.max(0, Math.min(100, level));
    const platform = process.platform;

    if (platform === 'win32') {
      await this.runAudioHelper(`-Action set -Level ${vol}`);
      return;
    }

    if (platform === 'darwin') {
      return new Promise((resolve, reject) => {
        exec(`osascript -e "set volume output volume ${vol}"`, (err) => {
          if (err) reject(new Error('Failed to set volume'));
          else resolve();
        });
      });
    }

    // Linux
    return new Promise((resolve, reject) => {
      exec(`amixer set Master ${vol}%`, (err) => {
        if (err) reject(new Error('Failed to set volume'));
        else resolve();
      });
    });
  }

  async toggleMute(): Promise<boolean> {
    const platform = process.platform;

    if (platform === 'win32') {
      const output = await this.runAudioHelper('-Action mute');
      return output.toLowerCase() === 'true';
    }

    if (platform === 'darwin') {
      return new Promise((resolve, reject) => {
        exec(
          'osascript -e "set volume output muted not (output muted of (get volume settings))" -e "output muted of (get volume settings)"',
          (err, stdout) => {
            if (err) reject(new Error('Failed to toggle mute'));
            else resolve(stdout.trim().toLowerCase() === 'true');
          },
        );
      });
    }

    // Linux
    return new Promise((resolve, reject) => {
      exec('amixer set Master toggle', (err, stdout) => {
        if (err) reject(new Error('Failed to toggle mute'));
        else {
          const match = stdout.match(/\[(on|off)\]/);
          resolve(match ? match[1] === 'off' : false);
        }
      });
    });
  }
}
