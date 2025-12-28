const getString = (key, fallback) => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
};

const getInt = (key, fallback) => {
  const value = parseInt(process.env[key], 10);
  return Number.isNaN(value) ? fallback : value;
};

const getFloat = (key, fallback) => {
  const value = parseFloat(process.env[key]);
  return Number.isNaN(value) ? fallback : value;
};

const CONFIG = Object.freeze({
  firebase: {
    projectId: getString('FIREBASE_PROJECT_ID', 'allinonehrm'),
    collections: {
      events: getString('FIREBASE_COLLECTION_KAFKA_EVENTS', 'kafka_events'),
      messages: getString('FIREBASE_COLLECTION_KAFKA_MESSAGES', 'kafka_messages'),
      typingIndicators: getString(
        'FIREBASE_COLLECTION_KAFKA_TYPING_INDICATORS',
        'kafka_typing_indicators'
      ),
      users: getString('FIREBASE_COLLECTION_USERS', 'users'),
    },
  },
  messaging: {
    defaultService: getString('DEFAULT_MESSAGE_SERVICE', 'iMessage'),
    defaultMessageType: getString('DEFAULT_MESSAGE_TYPE', 'message'),
  },
  chatbot: {
    model: getString('CHATBOT_MODEL', 'claude-3-haiku-20240307'),
    maxContextMessages: getInt('CHATBOT_MAX_CONTEXT_MESSAGES', 20),
    minResponseLength: getInt('CHATBOT_MIN_RESPONSE_LENGTH', 5),
    maxResponseLength: getInt('CHATBOT_MAX_RESPONSE_LENGTH', 150),
    temperature: getFloat('CHATBOT_TEMPERATURE', 0.9),
    maxTokens: getInt('CHATBOT_MAX_TOKENS', 80),
    logPreviewLength: getInt('CHATBOT_LOG_PREVIEW_LENGTH', 100),
    historyWindow: getInt('CHATBOT_HISTORY_WINDOW', 10),
    truncationThresholdRatio: getFloat('CHATBOT_TRUNCATION_THRESHOLD_RATIO', 0.5),
  },
  profiles: {
    defaultType: getString('DEFAULT_PROFILE_TYPE', 'unknown'),
  },
  kafka: {
    maxBufferedEvents: getInt('MAX_BUFFERED_EVENTS', 1000),
    connectionTimeoutMs: getInt('KAFKA_CONNECTION_TIMEOUT_MS', 3000),
    requestTimeoutMs: getInt('KAFKA_REQUEST_TIMEOUT_MS', 30000),
    sessionTimeoutMs: getInt('KAFKA_SESSION_TIMEOUT_MS', 30000),
    heartbeatIntervalMs: getInt('KAFKA_HEARTBEAT_INTERVAL_MS', 3000),
    maxInFlightRequests: getInt('KAFKA_MAX_IN_FLIGHT_REQUESTS', 1),
    rebalanceTimeoutMs: getInt('KAFKA_REBALANCE_TIMEOUT_MS', 60000),
    retryInitialMs: getInt('KAFKA_RETRY_INITIAL_MS', 100),
    retryCount: getInt('KAFKA_RETRY_COUNT', 8),
    consumerErrorBackoffMs: getInt('KAFKA_CONSUMER_ERROR_BACKOFF_MS', 5000),
  },
  server: {
    firebaseInitDelayMs: getInt('FIREBASE_INIT_DELAY_MS', 1000),
    messagePreviewShort: getInt('MESSAGE_PREVIEW_SHORT', 50),
    messagePreviewLong: getInt('MESSAGE_PREVIEW_LONG', 100),
    conversationFetchLimit: getInt('CONVERSATION_FETCH_LIMIT', 100),
    defaultPort: getInt('DEFAULT_PORT', 8000),
    defaultHost: getString('DEFAULT_HOST', '0.0.0.0'),
  },
  matching: {
    baseScore: getInt('MATCHING_BASE_SCORE', 50),
    maxScore: getInt('MATCHING_MAX_SCORE', 100),
    matchLimit: getInt('MATCHING_RESULTS_LIMIT', 30),
    scoredProfilesLimit: getInt('MATCHING_SCORED_PROFILES_LIMIT', 20),
    scoringModel: getString('MATCHING_SCORING_MODEL', 'claude-3-5-sonnet-20241022'),
    scoringMaxTokens: getInt('MATCHING_SCORING_MAX_TOKENS', 2000),
    weights: {
      professionMatch: getInt('MATCHING_SCORE_PROFESSION_MATCH', 20),
      locationMatch: getInt('MATCHING_SCORE_LOCATION_MATCH', 15),
      skillMatch: getInt('MATCHING_SCORE_SKILL_MATCH', 5),
      interestMatch: getInt('MATCHING_SCORE_INTEREST_MATCH', 10),
      specialtyMatch: getInt('MATCHING_SCORE_SPECIALTY_MATCH', 15),
      bioKeywordMatch: getInt('MATCHING_SCORE_BIO_KEYWORD_MATCH', 5),
      techBoost: getInt('MATCHING_SCORE_TECH_BOOST', 10),
    },
    thresholds: {
      excellent: getInt('MATCHING_THRESHOLD_EXCELLENT', 80),
      strong: getInt('MATCHING_THRESHOLD_STRONG', 70),
      good: getInt('MATCHING_THRESHOLD_GOOD', 60),
    },
    bioKeywordMinLength: getInt('MATCHING_BIO_KEYWORD_MIN_LENGTH', 4),
  },
  events: {
    messageReceived: getString('EVENT_TYPE_MESSAGE_RECEIVED', 'message.received'),
    messageSent: getString('EVENT_TYPE_MESSAGE_SENT', 'message.sent'),
    typingIndicatorReceived: getString(
      'EVENT_TYPE_TYPING_INDICATOR_RECEIVED',
      'typing_indicator.received'
    ),
    typingIndicatorRemoved: getString(
      'EVENT_TYPE_TYPING_INDICATOR_REMOVED',
      'typing_indicator.removed'
    ),
    unknown: getString('EVENT_TYPE_UNKNOWN', 'unknown'),
  },
});

module.exports = { CONFIG };
