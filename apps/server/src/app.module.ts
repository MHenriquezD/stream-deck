import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommandModule } from './command/command.module';

@Module({
  imports: [AuthModule, CommandModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
