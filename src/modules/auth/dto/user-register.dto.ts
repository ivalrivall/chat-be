import {
  EmailField,
  PasswordField,
} from '../../../decorators/field.decorators.ts';

export class UserRegisterDto {
  @EmailField()
  email!: string;

  @PasswordField({ minLength: 6 })
  password!: string;
}
