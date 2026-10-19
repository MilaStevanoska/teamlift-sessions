import { Module } from '@nestjs/common';
import { TeamoService } from './teamo.service.js';

@Module({
  providers: [TeamoService],
  exports: [TeamoService],
})
export class TeamoModule {}
