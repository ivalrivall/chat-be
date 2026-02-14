import { ForbiddenException } from '@nestjs/common';

export class ChatForbiddenException extends ForbiddenException {
  constructor(error?: string) {
    super('error.chatForbidden', error);
  }
}
