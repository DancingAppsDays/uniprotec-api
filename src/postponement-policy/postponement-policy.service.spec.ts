import { Test, TestingModule } from '@nestjs/testing';
import { PostponementPolicyService } from './postponement-policy.service';

describe('PostponementPolicyService', () => {
  let service: PostponementPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostponementPolicyService],
    }).compile();

    service = module.get<PostponementPolicyService>(PostponementPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
