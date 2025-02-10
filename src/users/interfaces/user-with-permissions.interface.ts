import { Role } from '../../auth/enums/role.enum';
import { Permission } from '../../auth/enums/permission.enum';
import { PermissionGroup } from '../../auth/schemas/permission-group.schema';

export interface UserWithPermissions {
  id: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  permissionGroups: PermissionGroup[];
}
