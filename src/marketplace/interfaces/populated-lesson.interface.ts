import { Document } from 'mongoose';
import { Lesson } from '../schemas/lesson.schema';
import { User } from '../../users/schemas/user.schema';
import { Listing } from '../schemas/listing.schema';

export interface PopulatedLesson extends Omit<Lesson, 'instructor' | 'listing'>, Document {
  instructor: User;
  listing: Listing;
}