import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
}
