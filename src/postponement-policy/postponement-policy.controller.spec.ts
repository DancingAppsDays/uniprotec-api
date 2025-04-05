import { Test, TestingModule } from '@nestjs/testing';
import { PostponementPolicyController } from './postponement-policy.controller';
import { PostponementPolicyService } from './postponement-policy.service';

describe('PostponementPolicyController', () => {
  let controller: PostponementPolicyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostponementPolicyController],
      providers: [PostponementPolicyService],
    }).compile();

    controller = module.get<PostponementPolicyController>(PostponementPolicyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
