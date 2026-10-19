import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreateSlotDto } from './dto/create-slot.dto.js';
import { SlotsService } from './slots.service.js';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  /**
   * Upcoming slots. `?view=host` adds booking details for the instructor
   * dashboard (there are no accounts in this app, so this is unprotected).
   */
  @Get()
  async list(@Query('view') view?: string) {
    const slots = await this.slots.findUpcoming();
    return slots.map((slot) =>
      view === 'host' ? SlotsService.toHost(slot) : SlotsService.toPublic(slot),
    );
  }

  @Post()
  create(@Body() dto: CreateSlotDto) {
    return this.slots.create(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.slots.remove(id);
  }
}
