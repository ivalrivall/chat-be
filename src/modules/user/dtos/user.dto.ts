import { AbstractDto } from '../../../common/dto/abstract.dto.ts';
import { RoleType } from '../../../constants/role-type.ts';
import { EmailField } from '../../../decorators/field.decorators.ts';
import { EnumField } from '../../../decorators/field.decorators.ts';
import type { UserEntity } from '../user.entity.ts';

export class UserDto extends AbstractDto {
  @EnumField(() => RoleType)
  role!: RoleType;

  @EmailField()
  email!: string;

  constructor(user: UserEntity) {
    super(user);
    this.role = user.role;
    this.email = user.email;
  }
}
