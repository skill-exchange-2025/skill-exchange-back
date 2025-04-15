// src/marketplace/types/populated-listing.type.ts
import { Listing } from '../schemas/listing.schema';
import { User } from '../../users/schemas/user.schema';
import { Lesson } from '../schemas/lesson.schema';

export type PopulatedListing = Omit<Listing, 'seller' | 'lessons'> & {
  seller: User;
  lessons: Lesson[];
};