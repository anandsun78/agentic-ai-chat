/**
 * Agentic AI Chat API - Request/Response shapes
 * Mirrors the OpenAPI 3.0 contract
 */

/**
 * Chat message attachment shape
 */
const ChatMessageAttachment = {
  filename: String,      // Required
  mime_type: String,     // Required
  data_base64: String,   // Required - base64 payload (no data URI prefix)
};

/**
 * Create chat message payload
 */
const ChatMessagesCreateJSONPayload = {
  message: {
    text: String,        // Required, must be non-empty
    attachments: [ChatMessageAttachment], // Optional
  },
};

/**
 * Create chat payload
 */
const ChatsCreatePayload = {
  send_from: String,     // Required - E.164 format
  chat: {
    phone_numbers: [String], // Required, minimum 1
    display_name: String,    // Optional
  },
  message: {
    text: String,        // Required, must be non-empty
  },
};

/**
 * Reaction payload
 */
const ReactionPayload = {
  operation: String,     // Required - enum: 'add' | 'remove'
  type: String,          // Required - enum: 'love' | 'like' | 'dislike' | 'laugh' | 'emphasize' | 'question'
};

/**
 * iMessage availability check payload
 */
const IMessageAvailabilityCheckPayload = {
  phone_number: String,  // Required - number to check
};

/**
 * List chats query params
 */
const ListChatsQueryParams = {
  phone_number: String,  // Optional - filter by participant phone (E.164)
  page: Number,          // Optional - default 1, min 1
  per_page: Number,     // Optional - default 25, max 100
};

/**
 * Find chat query params
 */
const FindChatQueryParams = {
  phone_number: String,  // Optional - primary phone
  phone_numbers: [String], // Optional - additional phones to match
};

/**
 * Reaction types
 */
const ReactionTypes = {
  LOVE: 'love',
  LIKE: 'like',
  DISLIKE: 'dislike',
  LAUGH: 'laugh',
  EMPHASIZE: 'emphasize',
  QUESTION: 'question',
};

/**
 * Reaction operations
 */
const ReactionOperations = {
  ADD: 'add',
  REMOVE: 'remove',
};

module.exports = {
  ChatMessageAttachment,
  ChatMessagesCreateJSONPayload,
  ChatsCreatePayload,
  ReactionPayload,
  IMessageAvailabilityCheckPayload,
  ListChatsQueryParams,
  FindChatQueryParams,
  ReactionTypes,
  ReactionOperations,
};
