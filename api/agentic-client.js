require('dotenv').config();
const https = require('https');
const http = require('http');

/**
 * Agentic AI Chat API client
 * Wraps all supported endpoints
 */
class AgenticAPIClient {
  constructor(options = {}) {
    this.apiBaseUrl = options.baseURL || process.env.AGENTIC_API_BASE_URL || '';
    this.apiToken = options.apiKey || process.env.AGENTIC_API_KEY || '';
    
    if (!this.apiBaseUrl) {
      throw new Error('API base URL is required. Set AGENTIC_API_BASE_URL environment variable or pass it in options.');
    }
    
    if (!this.apiToken) {
      throw new Error('API key is required. Set AGENTIC_API_KEY environment variable or pass it in options.');
    }
  }

  /**
   * Make an HTTP request to the API
   * @private
   */
  async request(method, path, data = null, options = {}) {
    const requestUrl = new URL(path, this.apiBaseUrl);
    
    // Add query params when provided
    if (options.queryParams) {
      Object.entries(options.queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => requestUrl.searchParams.append(key, v));
          } else {
            requestUrl.searchParams.append(key, value);
          }
        }
      });
    }

    const requestConfig = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    return new Promise((resolve, reject) => {
      const transport = requestUrl.protocol === 'https:' ? https : http;
      
      const req = transport.request(requestUrl, requestConfig, (res) => {
        let rawBody = '';
        
        res.on('data', (chunk) => {
          rawBody += chunk;
        });
        
        res.on('end', () => {
          try {
            const payload = rawBody ? JSON.parse(rawBody) : null;
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                status: res.statusCode,
                data: payload,
                headers: res.headers,
              });
            } else {
              reject({
                status: res.statusCode,
                message: payload?.message || payload?.error || `HTTP ${res.statusCode}`,
                data: payload,
              });
            }
          } catch (error) {
            reject({
              status: res.statusCode,
              message: 'Failed to parse response',
              error: error.message,
            });
          }
        });
      });

      req.on('error', (error) => {
        reject({
          status: 0,
          message: 'Request failed',
          error: error.message,
        });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  // ==================== Chat Messages ====================

  /**
   * List chat messages
   * GET /api/chats/{chat_id}/chat_messages
   */
  async listChatMessages(chatId) {
    return this.request('GET', `/api/chats/${chatId}/chat_messages`);
  }

  /**
   * Create chat message
   * POST /api/chats/{chat_id}/chat_messages
   */
  async createChatMessage(chatId, payload) {
    return this.request('POST', `/api/chats/${chatId}/chat_messages`, payload);
  }

  /**
   * Get chat message
   * GET /api/chats/{chat_id}/chat_messages/{message_id}
   */
  async getChatMessage(chatId, messageId) {
    return this.request('GET', `/api/chats/${chatId}/chat_messages/${messageId}`);
  }

  /**
   * Delete chat message
   * DELETE /api/chats/{chat_id}/chat_messages/{message_id}
   */
  async deleteChatMessage(chatId, messageId) {
    return this.request('DELETE', `/api/chats/${chatId}/chat_messages/${messageId}`);
  }

  /**
   * Edit chat message
   * POST /api/chats/{chat_id}/chat_messages/{message_id}/edit
   */
  async editChatMessage(chatId, messageId, payload) {
    return this.request('POST', `/api/chats/${chatId}/chat_messages/${messageId}/edit`, payload);
  }

  // ==================== Chats ====================

  /**
   * List chats
   * GET /api/chats
   */
  async listChats(options = {}) {
    const queryParams = {};
    
    if (options.phoneNumber) {
      queryParams.phone_number = options.phoneNumber;
    }
    if (options.page) {
      queryParams.page = options.page;
    }
    if (options.perPage) {
      queryParams.per_page = options.perPage;
    }
    
    return this.request('GET', '/api/chats', null, { queryParams });
  }

  /**
   * Create chat
   * POST /api/chats
   */
  async createChat(payload) {
    return this.request('POST', '/api/chats', payload);
  }

  /**
   * Get chat
   * GET /api/chats/{id}
   */
  async getChat(chatId) {
    return this.request('GET', `/api/chats/${chatId}`);
  }

  /**
   * Find chat
   * GET /api/chats/find
   */
  async findChat(options = {}) {
    const queryParams = {};
    
    if (options.phoneNumber) {
      queryParams.phone_number = options.phoneNumber;
    }
    if (options.phoneNumbers && Array.isArray(options.phoneNumbers)) {
      options.phoneNumbers.forEach(phone => {
        queryParams['phone_numbers[]'] = phone;
      });
    }
    
    return this.request('GET', '/api/chats/find', null, { queryParams });
  }

  /**
   * Mark chat as read
   * PUT /api/chats/{id}/mark_as_read
   */
  async markChatAsRead(chatId) {
    return this.request('PUT', `/api/chats/${chatId}/mark_as_read`);
  }

  /**
   * Start typing indicator
   * POST /api/chats/{id}/start_typing
   */
  async startTyping(chatId) {
    return this.request('POST', `/api/chats/${chatId}/start_typing`);
  }

  /**
   * Stop typing indicator
   * DELETE /api/chats/{id}/stop_typing
   */
  async stopTyping(chatId) {
    return this.request('DELETE', `/api/chats/${chatId}/stop_typing`);
  }

  // ==================== Message Reactions ====================

  /**
   * React to message
   * POST /api/chat_messages/{id}/reactions
   */
  async reactToMessage(messageId, payload) {
    return this.request('POST', `/api/chat_messages/${messageId}/reactions`, payload);
  }

  /**
   * Get reaction
   * GET /api/chat_message_reactions/{id}
   */
  async getReaction(reactionId) {
    return this.request('GET', `/api/chat_message_reactions/${reactionId}`);
  }

  // ==================== iMessage Availability ====================

  /**
   * Check iMessage availability
   * POST /api/i_message_availability/check
   */
  async checkIMessageAvailability(payload) {
    return this.request('POST', '/api/i_message_availability/check', payload);
  }
}

module.exports = AgenticAPIClient;
