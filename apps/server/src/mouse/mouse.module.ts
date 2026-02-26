import { Module } from '@nestjs/common';
import { MouseGateway } from './mouse.gateway';
import { MouseService } from './mouse.service';

@Module({
  providers: [MouseService, MouseGateway],
  exports: [MouseService],
})
export class MouseModule {}
