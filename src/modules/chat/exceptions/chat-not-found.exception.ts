import { NotFoundException } from '@nestjs/common';

export class ChatNotFoundException extends NotFoundException {
  constructor(error?: string) {
    super('error.chatNotFound', error);
  }
}
