import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PostponementPolicyService } from './postponement-policy.service';
import { PostponementPolicyDto } from './dto/postponement-policy.dto';


@Controller('postponement-policy')
export class PostponementPolicyController {
  constructor(private readonly postponementPolicyService: PostponementPolicyService) { }

  @Post()
  create(@Body() createPostponementPolicyDto: PostponementPolicyDto) {
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
  update(@Param('id') id: string, @Body() updatePostponementPolicyDto: PostponementPolicyDto) {
    return this.postponementPolicyService.update(+id, updatePostponementPolicyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postponementPolicyService.remove(+id);
  }
}
