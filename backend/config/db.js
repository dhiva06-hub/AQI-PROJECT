const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

let listenersRegistered = false;

/**
 * Sanitizes MongoDB connection string to ensure credentials are never logged.
 */
function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/(.*?):(.*?)@/, (match, user) => `//${user}:****@`);
}

/**
 * Categorizes MongoDB errors and produces specific corrective actions.
 */
function categorizeMongoError(err) {
  const msg = err?.message || '';
  const code = err?.code || err?.codeName || '';
  if (code === 18 || code === 'AuthenticationFailed' || /authentication failed/i.test(msg)) {
    return {
      category: 'AUTHENTICATION_FAILED',
      action: 'Verify that the MongoDB Atlas username and password in backend/.env are correct and properly URL-encoded.',
    };
  }
  if (err?.name === 'MongooseServerSelectionError' || /whitelist|IP|timed out|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
    return {
      category: 'NETWORK_OR_IP_RESTRICTION',
      action: 'Verify network connection and check that your current public IP is allowed in MongoDB Atlas Network Access (or configure 0.0.0.0/0 for global access during development).',
    };
  }
  if (err?.name === 'MongoParseError' || /Invalid scheme|URI/i.test(msg)) {
    return {
      category: 'INVALID_URI',
      action: 'Check that MONGODB_URI in backend/.env is a valid MongoDB Atlas connection string starting with mongodb+srv://.',
    };
  }
  return {
    category: 'DATABASE_CONNECTION_ERROR',
    action: 'Inspect MongoDB Atlas cluster health and service logs.',
  };
}

function registerConnectionListeners() {
  mongoose.connection.on('connected', () => {
    console.log(`[db] Mongoose event: connected to "${mongoose.connection.name}" on ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    const diag = categorizeMongoError(err);
    console.error(`[db] Mongoose connection error [${diag.category}]: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] Mongoose event: disconnected from MongoDB.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[db] Mongoose event: reconnected to MongoDB.');
  });
}

/**
 * Connects to MongoDB Atlas using process.env.MONGODB_URI.
 * Throws on fatal error so caller can manage application lifecycle.
 */
async function connectDB() {
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri || !rawUri.trim()) {
    const error = new Error('MONGODB_URI is missing or empty in backend/.env.');
    console.error(`[db] Configuration Error: ${error.message}`);
    throw error;
  }

  // Ensure the target database is aqi_aggregator if none was provided
  let uri = rawUri.trim();
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/[^\/]+)\/?([^?]*)(.*)$/);
  if (match && (!match[2] || match[2] === 'test')) {
    const base = match[1];
    const query = match[3] || '?retryWrites=true&w=majority';
    uri = `${base}/aqi_aggregator${query.startsWith('?') ? query : `?${query}`}`;
  }

  if (!listenersRegistered) {
    registerConnectionListeners();
    listenersRegistered = true;
  }

  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log(`[db] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    const diag = categorizeMongoError(err);
    console.error(`[db] MongoDB connection failed [Category: ${diag.category}]: ${err.message}`);
    console.error(`[db] Corrective Action: ${diag.action}`);
    throw err;
  }
}

function isConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

async function closeDB() {
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    console.log('[db] MongoDB connection closed gracefully.');
  }
}

module.exports = {
  connectDB,
  isConnected,
  closeDB,
  sanitizeMongoUri,
  categorizeMongoError,
};
