import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChats1771078098289 implements MigrationInterface {
  name = 'addChats1771078098289';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"chat_messages_message_type_enum\" AS ENUM('TEXT', 'ATTACHMENT', 'MIXED')",
    );
    await queryRunner.query(
      'CREATE TYPE "chat_messages_status_enum" AS ENUM(\'SENT\')',
    );
    await queryRunner.query(
      "CREATE TYPE \"chat_message_attachments_attachment_type_enum\" AS ENUM('FILE', 'IMAGE', 'VIDEO')",
    );
    await queryRunner.query(`
      CREATE TABLE "chats"
      (
        "id"         uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name"       character varying,
        "is_group"   boolean   NOT NULL DEFAULT false,
        CONSTRAINT "PK_8d85dbcae4a31f7f35458d6a518" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`
      CREATE TABLE "chat_participants"
      (
        "id"         uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "chat_id"    uuid      NOT NULL,
        "user_id"    uuid      NOT NULL,
        CONSTRAINT "UQ_CHAT_PARTICIPANT_CHAT_USER" UNIQUE ("chat_id", "user_id"),
        CONSTRAINT "PK_9f2158cbf93a0a5e9f67f45f112" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`
      CREATE TABLE "chat_messages"
      (
        "id"                uuid                              NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"        TIMESTAMP                         NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP                         NOT NULL DEFAULT now(),
        "chat_id"           uuid                              NOT NULL,
        "sender_id"         uuid                              NOT NULL,
        "content"           character varying,
        "message_type"      "chat_messages_message_type_enum" NOT NULL,
        "status"            "chat_messages_status_enum"       NOT NULL,
        "sequence"          bigint                            NOT NULL,
        "broker_message_id" character varying                 NOT NULL,
        "sent_at"           TIMESTAMP                         NOT NULL,
        CONSTRAINT "UQ_CHAT_MESSAGE_BROKER_ID" UNIQUE ("broker_message_id"),
        CONSTRAINT "UQ_CHAT_MESSAGE_CHAT_SEQUENCE" UNIQUE ("chat_id", "sequence"),
        CONSTRAINT "PK_f8d6e8f8dc95d1f8c5d8c9fb8f5" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`
      CREATE TABLE "chat_message_attachments"
      (
        "id"              uuid                                                NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"      TIMESTAMP                                           NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP                                           NOT NULL DEFAULT now(),
        "message_id"      uuid                                                NOT NULL,
        "file_key"        character varying                                   NOT NULL,
        "mime_type"       character varying                                   NOT NULL,
        "size"            bigint                                              NOT NULL,
        "attachment_type" "chat_message_attachments_attachment_type_enum" NOT NULL,
        CONSTRAINT "PK_2bca4ded95e4d2a0beea8d96f2b" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`
      ALTER TABLE "chat_participants"
        ADD CONSTRAINT "FK_CHAT_PARTICIPANTS_CHAT" FOREIGN KEY ("chat_id") REFERENCES "chats" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`
      ALTER TABLE "chat_participants"
        ADD CONSTRAINT "FK_CHAT_PARTICIPANTS_USER" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
        ADD CONSTRAINT "FK_CHAT_MESSAGES_CHAT" FOREIGN KEY ("chat_id") REFERENCES "chats" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
        ADD CONSTRAINT "FK_CHAT_MESSAGES_SENDER" FOREIGN KEY ("sender_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`
      ALTER TABLE "chat_message_attachments"
        ADD CONSTRAINT "FK_CHAT_MESSAGE_ATTACHMENTS_MESSAGE" FOREIGN KEY ("message_id")
          REFERENCES "chat_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_message_attachments"
      DROP CONSTRAINT "FK_CHAT_MESSAGE_ATTACHMENTS_MESSAGE"`);
    await queryRunner.query(`ALTER TABLE "chat_messages"
      DROP CONSTRAINT "FK_CHAT_MESSAGES_SENDER"`);
    await queryRunner.query(`ALTER TABLE "chat_messages"
      DROP CONSTRAINT "FK_CHAT_MESSAGES_CHAT"`);
    await queryRunner.query(`ALTER TABLE "chat_participants"
      DROP CONSTRAINT "FK_CHAT_PARTICIPANTS_USER"`);
    await queryRunner.query(`ALTER TABLE "chat_participants"
      DROP CONSTRAINT "FK_CHAT_PARTICIPANTS_CHAT"`);
    await queryRunner.query('DROP TABLE "chat_message_attachments"');
    await queryRunner.query('DROP TABLE "chat_messages"');
    await queryRunner.query('DROP TABLE "chat_participants"');
    await queryRunner.query('DROP TABLE "chats"');
    await queryRunner.query(
      'DROP TYPE "chat_message_attachments_attachment_type_enum"',
    );
    await queryRunner.query('DROP TYPE "chat_messages_status_enum"');
    await queryRunner.query('DROP TYPE "chat_messages_message_type_enum"');
  }
}
