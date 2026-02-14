import { BadRequestException, Injectable } from '@nestjs/common';

import { ApiConfigService } from './api-config.service.ts';

interface ISupabaseGraphqlResponse<TData> {
  data?: TData;
  errors?: Array<{ message: string }>;
}

@Injectable()
export class SupabaseGraphqlService {
  constructor(private apiConfigService: ApiConfigService) {}

  private isHasuraStyleQuery(query: string): boolean {
    return (
      /\b\w+_aggregate\b/u.test(query) ||
      /\border_by\s*:/u.test(query) ||
      /\b\w+_by_pk\s*\(/u.test(query)
    );
  }

  private formatGraphqlBadRequest(
    errors: Array<{ message: string }>,
    query: string,
  ): BadRequestException {
    const errorMessages = errors.map((error) => error.message);
    const hasUnknownFieldError = errorMessages.some((message) =>
      message.includes('Unknown field'),
    );
    const isHasuraStyleQuery = this.isHasuraStyleQuery(query);
    const hints =
      hasUnknownFieldError && isHasuraStyleQuery
        ? [
            [
              'Detected Hasura-style GraphQL query.',
              'Supabase pg_graphql uses Collection fields and totalCount',
              '(for example: chatsCollection, chatMessagesCollection,',
              'chatsCollection { totalCount }).',
            ].join(' '),
          ]
        : [];

    return new BadRequestException({
      message: 'Supabase GraphQL query validation failed',
      errors: [...errorMessages, ...hints],
    });
  }

  async query<TData>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<TData> {
    const config = this.apiConfigService.supabaseGraphqlConfig;
    const headers = new Headers();

    headers.set('Content-Type', 'application/json');
    headers.set('apikey', config.serviceRoleKey);
    headers.set('Authorization', `Bearer ${config.serviceRoleKey}`);

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const payload = (await response.json()) as ISupabaseGraphqlResponse<TData>;

    if (!response.ok) {
      throw new Error(
        `Supabase GraphQL request failed with status ${response.status}`,
      );
    }

    if (payload.errors && payload.errors.length > 0) {
      throw this.formatGraphqlBadRequest(payload.errors, query);
    }

    if (payload.data === undefined) {
      throw new Error('Supabase GraphQL response does not contain data');
    }

    return payload.data;
  }

  async healthCheck(): Promise<boolean> {
    await this.query<{ __typename: string }>('query { __typename }');

    return true;
  }
}
