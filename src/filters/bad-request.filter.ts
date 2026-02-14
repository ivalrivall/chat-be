import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { ValidationError } from 'class-validator';
import type { Request, Response } from 'express';
import _ from 'lodash';

type HttpExceptionPayload =
  | string
  | {
      message?: string | string[] | ValidationError[];
      error?: string;
      errors?: unknown[];
    };

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  constructor(public reflector: Reflector) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = exception.getStatus();
    const payload = exception.getResponse() as HttpExceptionPayload;
    const path = request.originalUrl;
    const timestamp = new Date().toISOString();

    if (statusCode === 422) {
      const validationErrors = this.getValidationErrors(payload);

      this.validationFilter(validationErrors);
      response.status(statusCode).json({
        success: false,
        statusCode,
        message: 'Validation failed',
        errors: validationErrors,
        errorCode: 'VALIDATION_ERROR',
        timestamp,
        path,
      });

      return;
    }

    const message = this.getMessageFromPayload(payload) ?? exception.message;
    const errors = this.getErrorsFromPayload(payload);

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors,
      timestamp,
      path,
    });
  }

  private getValidationErrors(
    payload: HttpExceptionPayload,
  ): ValidationError[] {
    if (typeof payload === 'string') {
      return [];
    }

    if (!Array.isArray(payload.message)) {
      return [];
    }

    return payload.message.filter(
      (item): item is ValidationError => typeof item !== 'string',
    );
  }

  private getMessageFromPayload(
    payload: HttpExceptionPayload,
  ): string | undefined {
    if (typeof payload === 'string') {
      return payload;
    }

    if (Array.isArray(payload.message)) {
      const firstMessage = payload.message[0];

      return typeof firstMessage === 'string' ? firstMessage : undefined;
    }

    return payload.message;
  }

  private getErrorsFromPayload(payload: HttpExceptionPayload): unknown[] {
    if (typeof payload === 'string') {
      return [];
    }

    if (Array.isArray(payload.errors)) {
      return payload.errors;
    }

    if (Array.isArray(payload.message)) {
      return payload.message;
    }

    return [];
  }

  private validationFilter(validationErrors: ValidationError[]): void {
    for (const validationError of validationErrors) {
      const children = validationError.children;

      if (children && !_.isEmpty(children)) {
        this.validationFilter(children);

        return;
      }

      delete validationError.children;

      const constraints = validationError.constraints;

      if (!constraints) {
        return;
      }

      for (const [constraintKey, constraint] of Object.entries(constraints)) {
        // convert default messages
        if (!constraint) {
          // convert error message to error.fields.{key} syntax for i18n translation
          constraints[constraintKey] = `error.fields.${_.snakeCase(
            constraintKey,
          )}`;
        }
      }
    }
  }
}
