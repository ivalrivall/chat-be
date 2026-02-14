import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PageDto } from '../common/dto/page.dto.ts';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown) => {
        const path = request.originalUrl;
        const timestamp = new Date().toISOString();
        const statusCode = response.statusCode;

        if (data instanceof PageDto) {
          return {
            success: true,
            statusCode,
            message: 'success',
            data: data.data,
            meta: data.meta,
            timestamp,
            path,
          };
        }

        return {
          success: true,
          statusCode,
          message: 'success',
          data,
          timestamp,
          path,
        };
      }),
    );
  }
}
