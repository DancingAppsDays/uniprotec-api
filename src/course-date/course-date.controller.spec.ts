import { Test, TestingModule } from '@nestjs/testing';
import { CourseDateController } from './course-date.controller';
import { CourseDateService } from './course-date.service';

describe('CourseDateController', () => {
  let controller: CourseDateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseDateController],
      providers: [CourseDateService],
    }).compile();

    controller = module.get<CourseDateController>(CourseDateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
