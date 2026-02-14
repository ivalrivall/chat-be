import { BooleanField } from '../../../decorators/field.decorators.ts';

export class LogoutPayloadDto {
  @BooleanField()
  success: boolean;

  constructor(success: boolean) {
    this.success = success;
  }
}
