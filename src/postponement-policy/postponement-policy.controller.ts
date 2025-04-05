import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PostponementPolicyService } from './postponement-policy.service';
import { CreatePostponementPolicyDto } from './dto/create-postponement-policy.dto';
import { UpdatePostponementPolicyDto } from './dto/update-postponement-policy.dto';

@Controller('postponement-policy')
export class PostponementPolicyController {
  constructor(private readonly postponementPolicyService: PostponementPolicyService) {}

  @Post()
  create(@Body() createPostponementPolicyDto: CreatePostponementPolicyDto) {
    return this.postponementPolicyService.create(createPostponementPolicyDto);
  }

  @Get()
  findAll() {
    return this.postponementPolicyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postponementPolicyService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostponementPolicyDto: UpdatePostponementPolicyDto) {
    return this.postponementPolicyService.update(+id, updatePostponementPolicyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postponementPolicyService.remove(+id);
  }
}
