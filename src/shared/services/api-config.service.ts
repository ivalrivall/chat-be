import path from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ThrottlerOptions } from '@nestjs/throttler';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import parse from 'parse-duration';

import { UserSubscriber } from '../../entity-subscribers/user-subscriber.ts';
import { SnakeNamingStrategy } from '../../snake-naming.strategy.ts';

type StorageProvider = 'aws' | 'supabase' | 'custom';

interface IAwsS3Config {
  provider: StorageProvider;
  bucketRegion: string;
  bucketApiVersion: string;
  bucketName: string;
  bucketEndpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  isForcePathStyle: boolean;
  acl?: string;
  publicUrlBase?: string;
}

interface ISupabaseGraphqlConfig {
  url: string;
  serviceRoleKey: string;
}

@Injectable()
export class ApiConfigService {
  constructor(private configService: ConfigService) {}

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  private getNumber(key: string): number {
    const value = this.get(key);
    const num = Number(value);

    if (Number.isNaN(num)) {
      throw new TypeError(
        `Environment variable ${key} must be a number. Received: ${value}`,
      );
    }

    return num;
  }

  private getDuration(
    key: string,
    format?: Parameters<typeof parse>[1],
  ): number {
    const value = this.getString(key);
    const duration = parse(value, format);

    if (duration === null) {
      throw new Error(
        `Environment variable ${key} must be a valid duration. Received: ${value}`,
      );
    }

    return duration;
  }

  private getBoolean(key: string): boolean {
    const value = this.get(key);

    try {
      return Boolean(JSON.parse(value));
    } catch {
      throw new Error(
        `Environment variable ${key} must be a boolean. Received: ${value}`,
      );
    }
  }

  private getString(key: string, defaultValue?: string): string {
    const value = this.configService.get<string>(key);

    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }

      throw new Error(`${key} environment variable doesn't exist`);
    }

    return value.toString().replaceAll(String.raw`\n`, '\n');
  }

  private getOptionalString(key: string): string | undefined {
    const value = this.configService.get<string>(key);

    if (value === undefined) {
      return undefined;
    }

    return value.toString().replaceAll(String.raw`\n`, '\n');
  }

  get nodeEnv(): string {
    return this.getString('NODE_ENV');
  }

  get fallbackLanguage(): string {
    return this.getString('FALLBACK_LANGUAGE');
  }

  get throttlerConfigs(): ThrottlerOptions {
    return {
      ttl: this.getDuration('THROTTLER_TTL', 'second'),
      limit: this.getNumber('THROTTLER_LIMIT'),
      // storage: new ThrottlerStorageRedisService(new Redis(this.redis)),
    };
  }

  get postgresConfig(): TypeOrmModuleOptions {
    const migrations = [
      path.join(import.meta.dirname, `../../database/migrations/*{.ts,.js}`),
    ];

    return {
      autoLoadEntities: true,
      migrations,
      dropSchema: this.isTest,
      type: 'postgres',
      host: this.getString('DB_HOST'),
      port: this.getNumber('DB_PORT'),
      username: this.getString('DB_USERNAME'),
      password: this.getString('DB_PASSWORD'),
      database: this.getString('DB_DATABASE'),
      subscribers: [UserSubscriber],
      migrationsRun: true,
      logging: this.getBoolean('ENABLE_ORM_LOGS'),
      namingStrategy: new SnakeNamingStrategy(),
    };
  }

  get awsS3Config(): IAwsS3Config {
    const storageProviderRaw = this.getString('STORAGE_PROVIDER', 'aws');
    const storageProvider = storageProviderRaw.toLowerCase();
    const provider: StorageProvider =
      storageProvider === 'aws' || storageProvider === 'supabase'
        ? storageProvider
        : 'custom';
    const supabaseProjectId = this.getOptionalString('SUPABASE_PROJECT_ID');
    const bucketEndpointRaw = this.getOptionalString('AWS_S3_BUCKET_ENDPOINT');
    const normalizedSupabaseEndpointFromProjectId = supabaseProjectId
      ? `https://${supabaseProjectId}.storage.supabase.co/storage/v1/s3`
      : undefined;
    const normalizedSupabaseEndpointFromRaw = bucketEndpointRaw?.includes(
      '.storage.supabase.co',
    )
      ? bucketEndpointRaw
      : bucketEndpointRaw?.replace('.supabase.co', '.storage.supabase.co');
    const bucketEndpoint =
      provider === 'supabase'
        ? (normalizedSupabaseEndpointFromRaw ??
          normalizedSupabaseEndpointFromProjectId)
        : bucketEndpointRaw;
    const forcePathStyleConfig = this.getOptionalString(
      'AWS_S3_FORCE_PATH_STYLE',
    );
    const objectAcl = this.getOptionalString('AWS_S3_OBJECT_ACL');
    const isForcePathStyleConfig =
      forcePathStyleConfig === undefined
        ? undefined
        : forcePathStyleConfig === 'true';
    const isDefaultForcePathStyle =
      provider !== 'aws' && Boolean(bucketEndpoint);
    const isForcePathStyle = isForcePathStyleConfig ?? isDefaultForcePathStyle;
    const normalizedAcl =
      objectAcl === undefined || objectAcl.length === 0 ? undefined : objectAcl;
    const defaultAcl = provider === 'aws' ? 'public-read' : undefined;
    const acl = normalizedAcl ?? defaultAcl;

    return {
      provider,
      bucketRegion: this.getString('AWS_S3_BUCKET_REGION'),
      bucketApiVersion: this.getString('AWS_S3_API_VERSION'),
      bucketName: this.getString('AWS_S3_BUCKET_NAME'),
      bucketEndpoint,
      accessKeyId: this.getOptionalString('AWS_S3_ACCESS_KEY_ID'),
      secretAccessKey: this.getOptionalString('AWS_S3_SECRET_ACCESS_KEY'),
      isForcePathStyle,
      acl,
      publicUrlBase: this.getOptionalString('STORAGE_PUBLIC_URL_BASE'),
    };
  }

  get supabaseGraphqlConfig(): ISupabaseGraphqlConfig {
    let supabaseUrl = this.getString('SUPABASE_URL');

    while (supabaseUrl.endsWith('/')) {
      supabaseUrl = supabaseUrl.slice(0, -1);
    }

    const supabaseGraphqlUrl = this.getOptionalString('SUPABASE_GRAPHQL_URL');

    return {
      url: supabaseGraphqlUrl ?? `${supabaseUrl}/graphql/v1`,
      serviceRoleKey: this.getString('SUPABASE_SERVICE_ROLE_KEY'),
    };
  }

  get documentationEnabled(): boolean {
    return this.getBoolean('ENABLE_DOCUMENTATION');
  }

  get natsEnabled(): boolean {
    return this.getBoolean('NATS_ENABLED');
  }

  get natsConfig() {
    return {
      host: this.getString('NATS_HOST'),
      port: this.getNumber('NATS_PORT'),
    };
  }

  get redisConfig() {
    const redisDb = this.configService.get<string>('REDIS_DB');

    return {
      host: this.getString('REDIS_HOST'),
      port: this.getNumber('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: redisDb ? Number(redisDb) : 0,
    };
  }

  get rabbitMqConfig() {
    const rabbitMqUriRaw = this.getOptionalString('RABBITMQ_URI');
    const rabbitMqUri =
      rabbitMqUriRaw && rabbitMqUriRaw.trim().length > 0
        ? rabbitMqUriRaw
        : undefined;
    const rabbitMqHost = this.getString('RABBITMQ_HOST', 'localhost');
    const rabbitMqPortRaw = this.getString('RABBITMQ_PORT', '5672');
    const rabbitMqPort = Number(rabbitMqPortRaw);

    if (Number.isNaN(rabbitMqPort)) {
      throw new TypeError(
        `Environment variable RABBITMQ_PORT must be a number. Received: ${rabbitMqPortRaw}`,
      );
    }

    const rabbitMqUsername = this.getOptionalString('RABBITMQ_USERNAME');
    const rabbitMqPassword = this.getOptionalString('RABBITMQ_PASSWORD');
    const rabbitMqVhost = this.getString('RABBITMQ_VHOST', '/');
    let rabbitMqCredentials = '';

    if (rabbitMqUsername && rabbitMqPassword) {
      rabbitMqCredentials = `${encodeURIComponent(rabbitMqUsername)}:${encodeURIComponent(rabbitMqPassword)}@`;
    } else if (rabbitMqUsername) {
      rabbitMqCredentials = `${encodeURIComponent(rabbitMqUsername)}@`;
    }

    const normalizedVhost =
      rabbitMqVhost === '/'
        ? '%2F'
        : encodeURIComponent(rabbitMqVhost.replace(/^\//, ''));

    return {
      uri:
        rabbitMqUri ??
        `amqp://${rabbitMqCredentials}${rabbitMqHost}:${rabbitMqPort}/${normalizedVhost}`,
      exchange: this.getString('RABBITMQ_CHAT_EXCHANGE', 'chat.events'),
      dlxExchange: this.getString('RABBITMQ_CHAT_DLX_EXCHANGE', 'chat.dlx'),
      messageQueuePrefix: this.getString(
        'RABBITMQ_CHAT_QUEUE_PREFIX',
        'chat.message.send',
      ),
      dlqName: this.getString(
        'RABBITMQ_CHAT_DLQ_NAME',
        'chat.message.send.dlq',
      ),
      partitionCount: Number(
        this.configService.get<string>('RABBITMQ_CHAT_PARTITION_COUNT') ?? '8',
      ),
      maxRetries: Number(
        this.configService.get<string>('RABBITMQ_CHAT_MAX_RETRIES') ?? '5',
      ),
      consumerPrefetch: Number(
        this.configService.get<string>('RABBITMQ_CHAT_CONSUMER_PREFETCH') ??
          '1',
      ),
    };
  }

  get chatConfig() {
    return {
      notificationChannel: this.getString(
        'CHAT_NOTIFICATION_CHANNEL',
        'chat.notifications',
      ),
      workerEnabled:
        this.configService.get<string>('CHAT_WORKER_ENABLED') === 'true',
    };
  }

  get authConfig() {
    return {
      privateKey: this.getString('JWT_PRIVATE_KEY'),
      publicKey: this.getString('JWT_PUBLIC_KEY'),
      jwtExpirationTime: this.getNumber('JWT_EXPIRATION_TIME'),
    };
  }

  get appConfig() {
    return {
      port: this.getString('PORT'),
    };
  }

  private get(key: string): string {
    const value = this.configService.get<string>(key);

    if (value == null) {
      throw new Error(`Environment variable ${key} is not set`);
    }

    return value;
  }
}
