import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere } from 'typeorm';
import type { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import { PageDto } from '../../common/dto/page.dto.ts';
import { UserNotFoundException } from '../../exceptions/user-not-found.exception.ts';
import type { UserRegisterDto } from '../auth/dto/user-register.dto.ts';
import type { UserDto } from './dtos/user.dto.ts';
import type { UsersPageOptionsDto } from './dtos/users-page-options.dto.ts';
import { UserEntity } from './user.entity.ts';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Find single user
   */
  findOne(findData: FindOptionsWhere<UserEntity>): Promise<UserEntity | null> {
    return this.userRepository.findOneBy(findData);
  }

  @Transactional()
  async createUser(userRegisterDto: UserRegisterDto): Promise<UserEntity> {
    const user = this.userRepository.create(userRegisterDto);

    await this.userRepository.save(user);

    return user;
  }

  async touchUserActivity(userId: Uuid): Promise<void> {
    await this.userRepository.update(userId, {
      updatedAt: new Date(),
    });
  }

  async getUsers(
    pageOptionsDto: UsersPageOptionsDto,
  ): Promise<PageDto<UserDto>> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);
    const normalizedSearch = pageOptionsDto.search?.trim();
    const normalizedQ = pageOptionsDto.q?.trim();
    const search =
      normalizedSearch && normalizedSearch.length > 0
        ? normalizedSearch
        : normalizedQ;

    if (search) {
      queryBuilder.where('user.email ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, pageMetaDto] = await queryBuilder.paginate(pageOptionsDto);

    return new PageDto(items.toDtos(), pageMetaDto);
  }

  async getUser(userId: Uuid): Promise<UserDto> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    queryBuilder.where('user.id = :userId', { userId });

    const userEntity = await queryBuilder.getOne();

    if (!userEntity) {
      throw new UserNotFoundException();
    }

    return userEntity.toDto();
  }
}
