import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommandModule } from './command/command.module';
import { MouseModule } from './mouse/mouse.module';

@Module({
  imports: [AuthModule, CommandModule, MouseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
