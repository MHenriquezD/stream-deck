import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { networkInterfaces } from 'os';
import * as path from 'path';
import { AuthGuard } from '../auth/auth.guard';
import { CommandService } from './command.service';
import { StreamCommand } from './interfaces/command.interface';
import { NetworkInfo } from './interfaces/network.info.interface';
import { SettingsService } from './settings.service';

@Controller('command')
@UseGuards(AuthGuard)
export class CommandController {
  constructor(
    private readonly service: CommandService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get()
  getCommands() {
    return this.service.getAll();
  }

  @Post()
  saveCommands(@Body() commands: StreamCommand[]) {
    this.service.saveAll(commands);
    return { success: true };
  }

  @Post('execute/:id')
  execute(@Param('id') id: string) {
    return this.service.execute(id);
  }

  @Get('presets/multimedia')
  getMultimediaPresets() {
    return this.service.getMultimediaPresets();
  }

  @Get('installed-apps')
  getInstalledApps() {
    return this.service.getInstalledApps();
  }

  @Get('installed-apps/cache-status')
  getAppsCacheStatus() {
    return this.service.hasAppsCache();
  }

  @Post('installed-apps/rescan')
  rescanInstalledApps() {
    return this.service.getInstalledApps(true);
  }

  @Get('cert')
  downloadCert(@Res() res) {
    const certPath = require('path').join(process.cwd(), 'certs', 'cert.pem');
    res.download(certPath);
  }

  @Get('network-info')
  getNetworkInfo() {
    const nets = networkInterfaces();
    const results: NetworkInfo[] = [];

    for (const name of Object.keys(nets)) {
      const interfaces = nets[name];
      if (!interfaces) continue;
      for (const net of interfaces) {
        // Skip internal (loopback) and non-IPv4 addresses
        if (net.family === 'IPv4' && !net.internal) {
          results.push({
            name,
            address: net.address,
            url: `http://${net.address}:7500`,
          });
        }
      }
    }

    return {
      interfaces: results,
      preferredUrl: results[0]?.url || 'http://localhost:7500',
    };
  }

  @Get('health')
  health() {
    return 'ok';
  }

  // ─── Settings (REST fallback) ───
  @Get('settings')
  getSettings() {
    return this.settingsService.getAll();
  }

  @Post('settings/grid-size')
  setGridSize(@Body() body: { gridSize: number }) {
    this.settingsService.setGridSize(body.gridSize);
    return { success: true, gridSize: body.gridSize };
  }

  @Post('settings/button-sound')
  setButtonSound(@Body() body: { enabled: boolean; file?: string }) {
    if (typeof body.enabled === 'boolean') {
      this.settingsService.setButtonSound(body.enabled);
    }
    if (body.file) {
      this.settingsService.setButtonSoundFile(body.file);
    }
    return {
      success: true,
      buttonSound: this.settingsService.getButtonSound(),
      buttonSoundFile: this.settingsService.getButtonSoundFile(),
    };
  }

  // ─── Volume Control ───
  @Get('volume')
  async getVolume() {
    try {
      return await this.service.getVolume();
    } catch {
      return { volume: 0, muted: false, error: 'Could not read volume' };
    }
  }

  @Post('volume')
  async setVolume(@Body() body: { volume: number }) {
    await this.service.setVolume(body.volume);
    const state = await this.service.getVolume();
    return { success: true, ...state };
  }

  @Post('volume/mute')
  async toggleMute() {
    const muted = await this.service.toggleMute();
    return { success: true, muted };
  }

  // ─── Custom Icons ───
  private get customIconsDir() {
    const dir = path.join(process.cwd(), 'data', 'custom-icons');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  @Get('custom-icons')
  getCustomIcons() {
    const dir = this.customIconsDir;
    const files = fs.readdirSync(dir).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'].includes(ext);
    });
    return files;
  }

  @Post('custom-icons/upload')
  @UseInterceptors(
    FileInterceptor('icon', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = path.join(process.cwd(), 'data', 'custom-icons');
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          // Sanitize filename
          const name = file.originalname
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .toLowerCase();
          cb(null, name);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'image/png',
          'image/jpeg',
          'image/svg+xml',
          'image/gif',
          'image/webp',
        ];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  uploadCustomIcon(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { success: false, message: 'No se recibió archivo válido' };
    }
    return { success: true, filename: file.filename };
  }

  @Delete('custom-icons/:name')
  deleteCustomIcon(@Param('name') name: string) {
    const filePath = path.join(this.customIconsDir, name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, message: 'Archivo no encontrado' };
  }
}
