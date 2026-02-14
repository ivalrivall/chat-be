import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

import { StringField } from '../../decorators/field.decorators.ts';

export class GraphqlProxyRequestDto {
  @StringField()
  query!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
