import { Injectable } from '@nestjs/common';
import { CreatePostponementPolicyDto } from './dto/create-postponement-policy.dto';
import { UpdatePostponementPolicyDto } from './dto/update-postponement-policy.dto';

@Injectable()
export class PostponementPolicyService {
  create(createPostponementPolicyDto: CreatePostponementPolicyDto) {
    return 'This action adds a new postponementPolicy';
  }

  findAll() {
    return `This action returns all postponementPolicy`;
  }

  findOne(id: number) {
    return `This action returns a #${id} postponementPolicy`;
  }

  update(id: number, updatePostponementPolicyDto: UpdatePostponementPolicyDto) {
    return `This action updates a #${id} postponementPolicy`;
  }

  remove(id: number) {
    return `This action removes a #${id} postponementPolicy`;
  }
}
