import './boilerplate.polyfill.ts';

import { NestFactory } from '@nestjs/core';
import { initializeTransactionalContext } from 'typeorm-transactional';

import { AppModule } from './app.module.ts';

initializeTransactionalContext();

const app = await NestFactory.createApplicationContext(AppModule);

app.enableShutdownHooks();
