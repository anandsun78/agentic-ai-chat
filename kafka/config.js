require('dotenv').config();
const { Kafka } = require('kafkajs');
const { CONFIG } = require('../config/constants');

const { kafka: kafkaConstants } = CONFIG;

/**
 * Kafka config for Confluent Cloud
 * Values are sourced from environment variables
 */
const kafkaConfig = {
  clientId: kafkaConstants.clientId,
  brokers: [kafkaConstants.bootstrapServers],
  ssl: kafkaConstants.tlsEnabled,
  sasl: {
    mechanism: kafkaConstants.sasl.mechanism,
    username: kafkaConstants.sasl.username,
    password: kafkaConstants.sasl.password,
  },
  connectionTimeout: kafkaConstants.connectionTimeoutMs,
  requestTimeout: kafkaConstants.requestTimeoutMs,
  retry: {
    initialRetryTime: kafkaConstants.retryInitialMs,
    retries: kafkaConstants.retryCount,
  },
};

// Required environment variables
const requiredKafkaConfig = {
  KAFKA_BOOTSTRAP_SERVERS: kafkaConstants.bootstrapServers,
  KAFKA_SASL_USERNAME: kafkaConstants.sasl.username,
  KAFKA_SASL_PASSWORD: kafkaConstants.sasl.password,
  KAFKA_TOPIC_NAME: kafkaConstants.topicName,
  KAFKA_CONSUMER_GROUP: kafkaConstants.consumerGroup,
};

function validateConfig() {
  const missing = Object.entries(requiredKafkaConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or set these variables.'
    );
  }
}

// Singleton Kafka instance
let kafkaInstance = null;

function getKafkaInstance() {
  if (!kafkaInstance) {
    validateConfig();
    kafkaInstance = new Kafka(kafkaConfig);
  }
  return kafkaInstance;
}

// Export config + helpers
module.exports = {
  kafkaConfig,
  getKafkaInstance,
  validateConfig,
  getTopicName: () => kafkaConstants.topicName,
  getConsumerGroup: () => {
    // Allow override with unique consumer group for testing
    if (kafkaConstants.useUniqueGroup) {
      return `${kafkaConstants.consumerGroup}-${Date.now()}`;
    }
    return kafkaConstants.consumerGroup;
  },
  getClientId: () => kafkaConstants.clientId || kafkaConfig.clientId,
};
