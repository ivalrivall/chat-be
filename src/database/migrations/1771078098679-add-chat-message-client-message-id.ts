import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatMessageClientMessageId1771078098679 implements MigrationInterface {
  name = 'addChatMessageClientMessageId1771078098679';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "chat_messages" ADD "client_message_id" character varying',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "chat_messages" DROP COLUMN "client_message_id"',
    );
  }
}
