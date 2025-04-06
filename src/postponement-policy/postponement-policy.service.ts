import { Injectable } from '@nestjs/common';
import { PostponementPolicyDto } from './dto/postponement-policy.dto';

@Injectable()
export class PostponementPolicyService {
  create(createPostponementPolicyDto: PostponementPolicyDto) {
    return 'This action adds a new postponementPolicy';
  }

  findAll() {
    return `This action returns all postponementPolicy`;
  }

  findOne(id: number) {
    return `This action returns a #${id} postponementPolicy`;
  }

  update(id: number, updatePostponementPolicyDto: PostponementPolicyDto) {
    return `This action updates a #${id} postponementPolicy`;
  }

  remove(id: number) {
    return `This action removes a #${id} postponementPolicy`;
  }
}
