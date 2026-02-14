import type { Provider } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ApiConfigService } from './services/api-config.service.ts';
import { AwsS3Service } from './services/aws-s3.service.ts';
import { GeneratorService } from './services/generator.service.ts';
import { RabbitMqService } from './services/rabbitmq.service.ts';
import { RedisService } from './services/redis.service.ts';
import { SupabaseGraphqlService } from './services/supabase-graphql.service.ts';
import { TranslationService } from './services/translation.service.ts';
import { ValidatorService } from './services/validator.service.ts';

const providers: Provider[] = [
  ApiConfigService,
  ValidatorService,
  AwsS3Service,
  GeneratorService,
  TranslationService,
  RedisService,
  RabbitMqService,
  SupabaseGraphqlService,
];

@Global()
@Module({
  providers,
  imports: [CqrsModule],
  exports: [...providers, CqrsModule],
})
export class SharedModule {}
