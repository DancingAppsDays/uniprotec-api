import { CoursesSchema } from './courses.schema';

describe('CoursesSchema', () => {
  it('should be defined', () => {
    expect(new CoursesSchema()).toBeDefined();
  });
});
