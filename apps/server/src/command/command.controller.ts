import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { CommandService } from './command.service';
import { StreamCommand } from './interfaces/command.interface';

@Controller('command')
export class CommandController {
  constructor(private readonly service: CommandService) {}

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

  // TODO: Implementar control de volumen en el futuro
  // Requiere instalar módulo AudioDeviceCmdlets: Install-Module -Name AudioDeviceCmdlets -Force
  // Endpoints necesarios:
  //   - GET /command/volume -> obtener volumen actual del sistema
  //   - POST /command/volume/:level -> establecer volumen (0-100)
  // Permitiría mostrar un slider visual para controlar el volumen de forma no intrusiva
}
