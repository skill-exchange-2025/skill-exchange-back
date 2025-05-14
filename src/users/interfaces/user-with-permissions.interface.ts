// src/users/interfaces/user-with-permissions.interface.ts
import { Role } from '../../auth/enums/role.enum';
import { Permission } from '../../auth/enums/permission.enum';
import { PermissionGroup } from '../../auth/schemas/permission-group.schema';
import { UserSkill } from '../schemas/user.skill.schema';
import { UserDesiredSkill } from '../schemas/user.desired.skill';

export interface UserWithPermissions {
  id: string;
  email: string;
  name: string;
  phone: number;
  roles: Role[];
  permissions: Permission[];
  permissionGroups: PermissionGroup[];
  skills: UserSkill[];
  desiredSkills: UserDesiredSkill[];
}
