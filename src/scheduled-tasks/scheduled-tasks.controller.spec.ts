import { Test, TestingModule } from '@nestjs/testing';
import { ScheduledTasksController } from './scheduled-tasks.controller';
import { ScheduledTasksService } from './scheduled-tasks.service';

describe('ScheduledTasksController', () => {
  let controller: ScheduledTasksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduledTasksController],
      providers: [ScheduledTasksService],
    }).compile();

    controller = module.get<ScheduledTasksController>(ScheduledTasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
