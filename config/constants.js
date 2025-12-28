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
  profiles: {
    defaultType: getString('DEFAULT_PROFILE_TYPE', 'unknown'),
  },
  kafka: {
    maxBufferedEvents: getInt('MAX_BUFFERED_EVENTS', 1000),
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
