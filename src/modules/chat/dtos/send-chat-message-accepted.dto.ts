import {
  StringField,
  UUIDField,
} from '../../../decorators/field.decorators.ts';

export class SendChatMessageAcceptedDto {
  @StringField()
  status!: string;

  @UUIDField()
  brokerMessageId!: Uuid;

  @UUIDField()
  clientMessageId!: Uuid;

  constructor(data: { brokerMessageId: Uuid; clientMessageId: Uuid }) {
    this.status = 'queued';
    this.brokerMessageId = data.brokerMessageId;
    this.clientMessageId = data.clientMessageId;
  }
}
