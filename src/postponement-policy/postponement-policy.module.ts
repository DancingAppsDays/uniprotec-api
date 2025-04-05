import { Module } from '@nestjs/common';
import { PostponementPolicyService } from './postponement-policy.service';
import { PostponementPolicyController } from './postponement-policy.controller';

@Module({
  controllers: [PostponementPolicyController],
  providers: [PostponementPolicyService],
})
export class PostponementPolicyModule {}
