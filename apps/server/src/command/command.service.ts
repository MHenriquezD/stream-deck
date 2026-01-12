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

    // Para macOS y Linux
    return [
      {
        id: 'preset-info',
        label: 'ℹ️ Info',
        icon: 'ℹ️',
        payload: 'echo "Comandos multimedia no disponibles para este SO"',
        description: 'Los presets multimedia están optimizados para Windows',
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
    // Detectar si es una URL y prepararla para Windows
    if (process.platform === 'win32') {
      // Detectar URLs (http://, https://, www., etc.)
      const urlPattern = /^(https?:\/\/|www\.)/i;
      if (urlPattern.test(command.trim())) {
        // Usar start para abrir URLs en el navegador por defecto
        return `start "" "${command.trim()}"`;
      }

      // Si el comando empieza con una ruta (C:\, D:\, etc.) y no tiene comillas
      const drivePathMatch = command.match(/^([A-Z]:\\[^"]+?)(\s|$)/i);
      if (drivePathMatch) {
        const path = drivePathMatch[1];
        // Solo agregar comillas si la ruta contiene espacios y no está ya entre comillas
        if (path.includes(' ') && !command.startsWith('"')) {
          return command.replace(path, `"${path}"`);
        }
      }
    }
    return command;
  }

  private execAsync(command: string) {
    return new Promise<{ success: boolean; output?: string }>(
      (resolve, reject) => {
        // En Windows, usar cmd.exe explícitamente para manejar rutas con espacios
        const options: { shell: string; windowsHide: boolean } = {
          shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
          windowsHide: true,
        };

        exec(command, options, (error, stdout, stderr) => {
          // Algunos comandos (como explorer, start) funcionan pero retornan códigos de error
          // Identificar estos casos y considerarlos exitosos
          const isExplorerCommand =
            command.toLowerCase().includes('explorer') ||
            command.toLowerCase().includes('start ""');

          if (error && !isExplorerCommand) {
            reject(new Error(stderr || error.message));
          } else {
            // Para comandos de explorer/start, ignorar errores y considerar exitoso
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
    const blocked = ['rm ', 'del ', 'shutdown', 'format'];

    if (process.platform === 'win32') {
      blocked.push('powershell -enc');
    }

    return !blocked.some((b) => command.toLowerCase().includes(b));
  }

  async getInstalledApps() {
    if (process.platform !== 'win32') {
      return {
        success: false,
        message: 'Esta función solo está disponible en Windows',
        apps: [],
      };
    }

    try {
      // Crear un archivo temporal con el script de PowerShell
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
  'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
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
      $apps += [PSCustomObject]@{
        Name = $displayName
        Icon = $icon
        Path = $location
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
      $apps += [PSCustomObject]@{
        Name = $displayName
        Icon = ''
        Path = $_.InstallLocation
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
      return {
        success: true,
        apps: apps.slice(0, 100),
      };
    } catch (error) {
      console.error('Error getting installed apps:', error);
      return {
        success: false,
        message: 'Error al obtener aplicaciones instaladas',
        apps: [],
      };
    }
  }
}
