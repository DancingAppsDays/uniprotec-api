import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { CreateScheduledTaskDto } from './dto/create-scheduled-task.dto';
import { UpdateScheduledTaskDto } from './dto/update-scheduled-task.dto';

@Controller('scheduled-tasks')
export class ScheduledTasksController {
  constructor(private readonly scheduledTasksService: ScheduledTasksService) {}

  @Post()
  create(@Body() createScheduledTaskDto: CreateScheduledTaskDto) {
    return this.scheduledTasksService.create(createScheduledTaskDto);
  }

  @Get()
  findAll() {
    return this.scheduledTasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scheduledTasksService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateScheduledTaskDto: UpdateScheduledTaskDto) {
    return this.scheduledTasksService.update(+id, updateScheduledTaskDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scheduledTasksService.remove(+id);
  }
}
