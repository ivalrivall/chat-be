import type {
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { EventSubscriber } from 'typeorm';

import { generateHash } from '../common/utils.ts';
import { UserEntity } from '../modules/user/user.entity.ts';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<UserEntity> {
  listenTo(): typeof UserEntity {
    return UserEntity;
  }

  beforeInsert(event: InsertEvent<UserEntity>): void {
    if (event.entity.password) {
      event.entity.password = generateHash(event.entity.password);
    }
  }

  beforeUpdate(event: UpdateEvent<UserEntity>): void {
    if (!event.entity) {
      return;
    }

    const entity = event.entity as Partial<UserEntity>;
    const databaseEntity = event.databaseEntity as
      | Partial<UserEntity>
      | undefined;
    const password = entity.password;

    if (typeof password !== 'string' || password === '') {
      return;
    }

    if (password === databaseEntity?.password) {
      return;
    }

    entity.password = generateHash(password);
  }
}
