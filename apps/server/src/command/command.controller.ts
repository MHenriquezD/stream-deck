import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { networkInterfaces } from 'os';
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

  // TODO: Implementar control de volumen en el futuro
  // Requiere instalar módulo AudioDeviceCmdlets: Install-Module -Name AudioDeviceCmdlets -Force
  // Endpoints necesarios:
  //   - GET /command/volume -> obtener volumen actual del sistema
  //   - POST /command/volume/:level -> establecer volumen (0-100)
  // Permitiría mostrar un slider visual para controlar el volumen de forma no intrusiva
}
