import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

export class AuthResponseDto {
  access_token: string;
  refresh_token: string;
  user: {
    _id: string;
    email: string;
    roles?: Role[]; // Make it optional
    permissions?: Permission[]; // Make it optional
  };
}
