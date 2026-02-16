import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import type { TranslateOptions } from 'nestjs-i18n';
import { I18nService } from 'nestjs-i18n';

import { AbstractDto } from '../../common/dto/abstract.dto.ts';
import { STATIC_TRANSLATION_DECORATOR_KEY } from '../../decorators/translate.decorator.ts';
import type { ITranslationDecoratorInterface } from '../../interfaces/i-translation-decorator-interface.ts';
import { ContextProvider } from '../../providers/context.provider.ts';

@Injectable()
export class TranslationService {
  constructor(private readonly i18n: I18nService) {}

  translate(key: string, options?: TranslateOptions): Promise<string> {
    return this.i18n.translate(key, {
      ...options,
      lang: ContextProvider.getLanguage(),
    });
  }

  async translateNecessaryKeys<T extends AbstractDto>(dto: T): Promise<T> {
    const tasks = this.collectTranslationTasks(dto);

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }

    return dto;
  }

  private collectTranslationTasks(dto: AbstractDto): Array<Promise<unknown>> {
    const tasks: Array<Promise<unknown>> = [];
    const entries = Object.entries(dto as unknown as Record<string, unknown>);

    for (const [key, value] of entries) {
      if (_.isString(value)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const translateDec: ITranslationDecoratorInterface | undefined =
          Reflect.getMetadata(STATIC_TRANSLATION_DECORATOR_KEY, dto, key);

        if (translateDec) {
          const translationKey = `${translateDec.translationKey ?? key}.${value}`;
          tasks.push(this.translate(translationKey));
        }
      } else if (value instanceof AbstractDto) {
        tasks.push(...this.collectTranslationTasks(value));
      } else if (Array.isArray(value)) {
        for (const v of value) {
          if (v instanceof AbstractDto) {
            tasks.push(...this.collectTranslationTasks(v));
          }
        }
      }
    }

    return tasks;
  }
}
