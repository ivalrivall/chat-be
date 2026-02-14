import { STATUS_CODES } from 'node:http';

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpStatus } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

import { constraintErrors } from './constraint-errors.ts';

@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter<QueryFailedError> {
  constructor(public reflector: Reflector) {}

  catch(
    exception: QueryFailedError & { constraint?: string },
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request.originalUrl;
    const timestamp = new Date().toISOString();

    const status = exception.constraint?.startsWith('UQ')
      ? HttpStatus.CONFLICT
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception.constraint
      ? constraintErrors[exception.constraint]
      : STATUS_CODES[status];

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors: [],
      errorCode: exception.constraint ? 'CONSTRAINT_ERROR' : 'INTERNAL_ERROR',
      timestamp,
      path,
    });
  }
}
