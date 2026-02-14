export const GET_CONVERSATION_LIST_QUERY = `
  query GetConversationList($first: Int!, $offset: Int!, $orderBy: [chat_participantsOrderBy!], $currentUserId: UUID!) {
    chat_participantsCollection(
      first: $first
      offset: $offset
      orderBy: $orderBy
      filter: { user_id: { eq: $currentUserId } }
    ) {
      edges {
        node {
          user_id
          chat: chats {
            id
            created_at
            updated_at
            name
            is_group
            chat_participantsCollection {
              edges {
                node {
                  id
                  updated_at
                  user_id
                  users {
                    email
                  }
                }
              }
            }
            chat_messagesCollection(first: 1, orderBy: [{ sent_at: DescNullsLast }]) {
              edges {
                node {
                  id
                  created_at
                  updated_at
                  chat_id
                  sender_id
                  content
                  message_type
                  status
                  sequence
                  sent_at
                  chat_message_attachmentsCollection(first: 1) {
                    edges {
                      node {
                        id
                        created_at
                        updated_at
                        file_key
                        mime_type
                        size
                        attachment_type
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

export const GET_CONVERSATION_MESSAGES_QUERY = `
  query GetConversationMessages($chatId: UUID!, $first: Int!, $offset: Int!, $orderBy: [chat_messagesOrderBy!]!) {
    chat_messagesCollection(
      filter: { chat_id: { eq: $chatId } }
      first: $first
      offset: $offset
      orderBy: $orderBy
    ) {
      edges {
        node {
          id
          created_at
          updated_at
          chat_id
          sender_id
          content
          message_type
          status
          sequence
          sent_at
          chat_message_attachmentsCollection(first: 1) {
            edges {
              node {
                id
                created_at
                updated_at
                file_key
                mime_type
                size
                attachment_type
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

export const GET_CONVERSATION_MESSAGES_WITH_SEARCH_QUERY = `
  query GetConversationMessagesWithSearch($chatId: UUID!, $first: Int!, $offset: Int!, $orderBy: [chat_messagesOrderBy!]!, $search: String!) {
    chat_messagesCollection(
      filter: {
        chat_id: { eq: $chatId }
        content: { ilike: $search }
      }
      first: $first
      offset: $offset
      orderBy: $orderBy
    ) {
      edges {
        node {
          id
          created_at
          updated_at
          chat_id
          sender_id
          content
          message_type
          status
          sequence
          sent_at
          chat_message_attachmentsCollection(first: 1) {
            edges {
              node {
                id
                created_at
                updated_at
                file_key
                mime_type
                size
                attachment_type
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;
