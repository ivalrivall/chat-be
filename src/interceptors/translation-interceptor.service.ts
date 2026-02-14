import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { AbstractDto } from '../common/dto/abstract.dto.ts';
import { PageDto } from '../common/dto/page.dto.ts';
import { TranslationService } from '../shared/services/translation.service.ts';

@Injectable()
export class TranslationInterceptor implements NestInterceptor {
  constructor(private readonly translationService: TranslationService) {}

  public intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      mergeMap(async (data: unknown) => {
        if (data instanceof PageDto) {
          const translatedData = await this.translateArray(data.data);

          return new PageDto(translatedData, data.meta);
        }

        if (Array.isArray(data)) {
          return this.translateArray(data);
        }

        if (data instanceof AbstractDto) {
          return this.translationService.translateNecessaryKeys(data);
        }

        return data;
      }),
    );
  }

  private async translateArray(data: unknown[]): Promise<unknown[]> {
    return Promise.all(
      data.map((item) => {
        if (item instanceof AbstractDto) {
          return this.translationService.translateNecessaryKeys(item);
        }

        return item;
      }),
    );
  }
}
