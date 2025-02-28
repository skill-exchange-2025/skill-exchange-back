import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';
import { UserSkill } from '../../users/schemas/user.skill.schema';
import { UserDesiredSkill } from '../../users/schemas/user.desired.skill';

export class AuthResponseDto {
  access_token: string;
  refresh_token: string;

  user: {
    _id: string;
    name: string;
    phone: number;
    email: string;
    roles?: Role[]; // Make it optional
    permissions?: Permission[]; // Make it optional
    skills?: UserSkill[];
    desiredSkills?: UserDesiredSkill[];
    isEmailVerified?: boolean;
  };
}
