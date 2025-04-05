// src/courses/courses.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course, CourseDocument } from './schemas/course.schema';
import { FilterCoursesDto } from './dto/filter-courses.dto';
import { PostponementPolicyDto } from '../postponement-policy/dto/create-postponement-policy.dto';
import { PostponementPolicy, PostponementPolicyDocument } from '../postponement-policy/schemas/postponement-policy.schema';
import { CourseDate, CourseDateDocument, CourseDateStatus } from '../course-date/schemas/course-date.schema';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(PostponementPolicy.name) private policyModel: Model<PostponementPolicyDocument>,
    @InjectModel(CourseDate.name) private courseDateModel: Model<CourseDateDocument>,
  ) { }

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const newCourse = new this.courseModel(createCourseDto);
    return newCourse.save();
  }

  async findAll(filterDto: FilterCoursesDto = {}): Promise<Course[]> {
    const { category, featured, search, sort, order, limit, skip, withDates } = filterDto;

    let query = this.courseModel.find();

    // Apply filters
    if (category) {
      query = query.where('category').equals(category);
    }

    if (featured !== undefined) {
      query = query.where('featured').equals(featured);
    }

    if (search) {
      query = query.where({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { subtitle: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    // Apply sorting
    let sortField = 'createdAt';
    let sortOrder = -1; // Default to newest first

    if (sort === 'price') {
      sortField = 'price';
    } else if (sort === 'title') {
      sortField = 'title';
    }

    if (order === 'asc') {
      sortOrder = 1;
    } else {
      sortOrder = -1;
    }

    query = query.sort({ [sortField]: sortOrder });

    // Apply pagination
    if (limit) {
      query = query.limit(limit);
    }

    if (skip) {
      query = query.skip(skip);
    }

    // If withDates is true, populate with upcoming course dates
    if (withDates) {
      const courses = await query.exec();
      const now = new Date();

      // For each course, fetch its upcoming dates
      const coursesWithDates = await Promise.all(
        courses.map(async (course) => {
          const courseDates = await this.courseDateModel.find({
            course: course._id,
            startDate: { $gt: now },
            status: { $in: [CourseDateStatus.SCHEDULED, CourseDateStatus.CONFIRMED] },
          })
            .sort({ startDate: 1 })
            .exec();

          // Convert to plain object to add property
          const courseObject = course.toObject();
          courseObject.courseInstances = courseDates;

          // Get the next available date
          if (courseDates.length > 0) {
            courseObject.nextDate = courseDates[0].startDate;
          }

          return courseObject;
        })
      );

      return coursesWithDates;
    }

    return query.exec();
  }

  async findFeatured(): Promise<Course[]> {
    return this.findAll({ featured: true, limit: 4 });
  }

  async findByCategory(category: string): Promise<Course[]> {
    return this.findAll({ category });
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.courseModel.findById(id).exec();

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async findCourseWithDates(id: string): Promise<any> {
    const course = await this.courseModel.findById(id).exec();

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Get upcoming course dates
    const now = new Date();
    const courseDates = await this.courseDateModel.find({
      course: id,
      startDate: { $gt: now },
      status: { $in: [CourseDateStatus.SCHEDULED, CourseDateStatus.CONFIRMED] },
    })
      .sort({ startDate: 1 })
      .exec();

    // Get postponement policy if it exists
    const policy = await this.policyModel.findOne({ course: id }).exec();

    // Convert to plain object to add properties
    const courseObject = course.toObject();
    courseObject.courseInstances = courseDates;

    // Get the next available date and all available dates
    if (courseDates.length > 0) {
      courseObject.nextDate = courseDates[0].startDate;
      courseObject.availableDates = courseDates.map(date => date.startDate);
    } else {
      courseObject.availableDates = [];
    }

    // Add policy information
    if (policy) {
      courseObject.postponementPolicy = {
        minimumRequired: policy.minimumRequired,
        deadlineDays: policy.deadlineDays,
        message: policy.customMessage || 'This course requires a minimum number of participants.',
      };
    }

    return courseObject;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.courseModel.findByIdAndUpdate(
      id,
      updateCourseDto,
      { new: true },
    ).exec();

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async remove(id: string): Promise<Course> {
    const course = await this.courseModel.findByIdAndDelete(id).exec();

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Also delete related entities
    await this.policyModel.deleteMany({ course: id }).exec();

    // Note: You may want to handle course dates differently,
    // either by deleting them or updating their status to canceled

    return course;
  }

  async setPostponementPolicy(id: string, policyDto: PostponementPolicyDto): Promise<PostponementPolicy> {
    // Check if course exists
    const course = await this.courseModel.findById(id).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Check if a policy already exists for this course
    let policy = await this.policyModel.findOne({ course: id }).exec();

    if (policy) {
      // Update existing policy
      policy = await this.policyModel.findOneAndUpdate(
        { course: id },
        policyDto,
        { new: true },
      ).exec();
    } else {
      // Create new policy
      const newPolicy = new this.policyModel({
        course: id,
        ...policyDto,
      });
      policy = await newPolicy.save();
    }

    return policy;
  }

  async getPostponementPolicy(id: string): Promise<PostponementPolicy> {
    // Check if course exists
    const course = await this.courseModel.findById(id).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Find policy for this course
    const policy = await this.policyModel.findOne({ course: id }).exec();

    if (!policy) {
      // Return default policy
      return {
        course: id,
        minimumRequired: 6,
        deadlineDays: 2,
        enableAutoPostponement: false,
        notifyUsers: true,
        customMessage: 'This course requires a minimum number of participants.',
      } as PostponementPolicy;
    }

    return policy;
  }

  async getAvailableDates(id: string): Promise<Date[]> {
    // Check if course exists
    const course = await this.courseModel.findById(id).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Get upcoming course dates
    const now = new Date();
    const courseDates = await this.courseDateModel.find({
      course: id,
      startDate: { $gt: now },
      status: { $in: [CourseDateStatus.SCHEDULED, CourseDateStatus.CONFIRMED] },
    })
      .sort({ startDate: 1 })
      .exec();

    return courseDates.map(date => date.startDate);
  }
}