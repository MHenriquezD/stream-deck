import { Module } from '@nestjs/common';
import { CommandController } from './command.controller';
import { CommandGateway } from './command.gateway';
import { CommandService } from './command.service';
import { SettingsService } from './settings.service';

@Module({
  controllers: [CommandController],
  providers: [CommandService, SettingsService, CommandGateway],
})
export class CommandModule {}
