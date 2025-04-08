// update-profile.dto.ts
export class UpdateProfileDto {
  bio?: string;
  description?: string;
  location?: string;
  socialLinks?: string[];
  profession?: string;
  interests?: string[];
  birthDate?: Date;
  // User fields
  name?: string;
  email?: string;
  phone?: string;
  skills?: any[];
  desiredSkills?: any[];
}