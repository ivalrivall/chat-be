import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { PageDto } from '../../common/dto/page.dto.ts';
import { Order } from '../../constants/order.ts';
import { RoleType } from '../../constants/role-type.ts';
import { ApiPageResponse } from '../../decorators/api-page-response.decorator.ts';
import { AuthUser } from '../../decorators/auth-user.decorator.ts';
import {
  ApiUUIDParam,
  Auth,
  UUIDParam,
} from '../../decorators/http.decorators.ts';
import { ApiFile } from '../../decorators/swagger.schema.ts';
import type { IFile } from '../../interfaces/i-file.ts';
import { SupabaseGraphqlService } from '../../shared/services/supabase-graphql.service.ts';
import type { Reference } from '../../types.ts';
import type { UserEntity } from '../user/user.entity.ts';
import { ChatService } from './chat.service.ts';
import {
  GET_CONVERSATION_LIST_QUERY,
  GET_CONVERSATION_MESSAGES_QUERY,
  GET_CONVERSATION_MESSAGES_WITH_SEARCH_QUERY,
} from './constants/chat-graphql-queries.ts';
import { ChatDto } from './dtos/chat.dto.ts';
import { ChatMessageDto } from './dtos/chat-message.dto.ts';
import { ChatMessagesPageOptionsDto } from './dtos/chat-messages-page-options.dto.ts';
import { ChatsPageOptionsDto } from './dtos/chats-page-options.dto.ts';
import { CreateChatDto } from './dtos/create-chat.dto.ts';
import { SendChatMessageDto } from './dtos/send-chat-message.dto.ts';
import { SendChatMessageAcceptedDto } from './dtos/send-chat-message-accepted.dto.ts';

@Controller('chats')
@ApiTags('chats')
export class ChatController {
  private resolveChatOrder(order: Order): string {
    return order === Order.DESC ? 'DescNullsLast' : 'AscNullsLast';
  }

  private resolveParticipantOrder(order: Order): string {
    return order === Order.DESC ? 'DescNullsLast' : 'AscNullsLast';
  }

  constructor(
    private chatService: ChatService,
    private supabaseGraphqlService: SupabaseGraphqlService,
  ) {}

  @Post()
  @Auth([RoleType.VISITOR, RoleType.AGENT])
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: ChatDto })
  async createChat(
    @AuthUser() user: UserEntity,
    @Body() createChatDto: CreateChatDto,
  ): Promise<ChatDto> {
    return this.chatService.createChat(user.id, createChatDto);
  }

  @Get()
  @Auth([RoleType.VISITOR, RoleType.AGENT])
  @ApiPageResponse({ type: ChatDto })
  async getChats(
    @AuthUser() user: UserEntity,
    @Query() pageOptionsDto: ChatsPageOptionsDto,
  ): Promise<PageDto<ChatDto>> {
    return this.chatService.getChats(user.id, pageOptionsDto);
  }

  @Get('room-ids')
  @Auth([RoleType.VISITOR, RoleType.AGENT])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Get room ids where current user is a participant',
    schema: {
      type: 'array',
      items: { type: 'string', format: 'uuid' },
    },
  })
  async getJoinedRoomIds(@AuthUser() user: UserEntity): Promise<Uuid[]> {
    return this.chatService.getJoinedRoomIds(user.id);
  }

  @Get(':chatId/messages')
  @Auth([RoleType.VISITOR, RoleType.AGENT])
  @ApiUUIDParam('chatId')
  @ApiPageResponse({ type: ChatMessageDto })
  async getChatMessages(
    @AuthUser() user: UserEntity,
    @UUIDParam('chatId') chatId: Uuid,
    @Query() pageOptionsDto: ChatMessagesPageOptionsDto,
  ): Promise<PageDto<ChatMessageDto>> {
    return this.chatService.getChatMessages(chatId, user.id, pageOptionsDto);
  }

  @Post(':chatId/messages')
  @Auth([RoleType.VISITOR, RoleType.AGENT])
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiUUIDParam('chatId')
  @ApiFile({ name: 'attachment' })
  @ApiAcceptedResponse({ type: SendChatMessageAcceptedDto })
  async sendMessage(
    @AuthUser() user: UserEntity,
    @UUIDParam('chatId') chatId: Uuid,
    @Body() sendChatMessageDto: SendChatMessageDto,
    @UploadedFile() file?: Reference<IFile>,
  ): Promise<SendChatMessageAcceptedDto> {
    await this.chatService.touchRoomActivity(chatId);

    return this.chatService.queueMessage(
      chatId,
      user.id,
      sendChatMessageDto,
      file,
    );
  }

  @Get('graphql')
  @Auth([RoleType.VISITOR, RoleType.AGENT])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description:
      'Get chat list through Supabase GraphQL with user-based filter',
    schema: { type: 'object', additionalProperties: true },
  })
  getChatsGraphql(
    @AuthUser() user: UserEntity,
    @Query() pageOptionsDto: ChatsPageOptionsDto,
  ): Promise<Record<string, unknown>> {
    return this.supabaseGraphqlService.query<Record<string, unknown>>(
      GET_CONVERSATION_LIST_QUERY,
      {
        first: pageOptionsDto.take,
        offset: pageOptionsDto.skip,
        orderBy: [
          { created_at: this.resolveParticipantOrder(pageOptionsDto.order) },
        ],
        currentUserId: user.id,
      },
    );
  }

  @Get(':chatId/messages/graphql')
  @Auth([RoleType.VISITOR, RoleType.AGENT])
  @HttpCode(HttpStatus.OK)
  @ApiUUIDParam('chatId')
  @ApiOkResponse({
    description:
      'Get chat messages through Supabase GraphQL for a chat where current user is participant',
    schema: { type: 'object', additionalProperties: true },
  })
  getChatMessagesGraphql(
    @AuthUser() user: UserEntity,
    @UUIDParam('chatId') chatId: Uuid,
    @Query() pageOptionsDto: ChatMessagesPageOptionsDto,
  ): Promise<Record<string, unknown>> {
    const search = pageOptionsDto.search?.trim();
    const query = search
      ? GET_CONVERSATION_MESSAGES_WITH_SEARCH_QUERY
      : GET_CONVERSATION_MESSAGES_QUERY;
    const variables: Record<string, unknown> = {
      chatId,
      first: pageOptionsDto.take,
      offset: pageOptionsDto.skip,
      orderBy: [
        { sent_at: this.resolveChatOrder(pageOptionsDto.order) },
        { sequence: this.resolveChatOrder(pageOptionsDto.order) },
      ],
    };

    if (search) {
      variables.search = `%${search}%`;
    }

    return this.chatService
      .assertUserInChat(chatId, user.id)
      .then(() =>
        this.supabaseGraphqlService.query<Record<string, unknown>>(
          query,
          variables,
        ),
      );
  }
}
