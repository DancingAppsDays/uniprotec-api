import { Test, TestingModule } from '@nestjs/testing';
import { CourseDateService } from './course-date.service';

describe('CourseDateService', () => {
  let service: CourseDateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseDateService],
    }).compile();

    service = module.get<CourseDateService>(CourseDateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
