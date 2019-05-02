/**
 * Import external libraries
 */
require('dotenv').config();

const restify = require('restify');
const fs = require('fs');
const UUID = require('pure-uuid');
const { Pool } = require('pg');

/**
 * ELK Perf data setup
 */
if (process.env.Environment === 'production') {
  const apm = require('elastic-apm-node').start({
    serverUrl: process.env.APMServerIP,
  });
}

/**
 * Import helper libraries
 */
const lightNames = require('./lightNames.js');
const serviceHelper = require('./helper.js');

global.lightsDataClient = new Pool({
  host: process.env.DataStore,
  database: 'lights',
  user: process.env.DataStoreUser,
  password: process.env.DataStoreUserPassword,
  port: 5432,
});

global.schedulesDataClient = new Pool({
  host: process.env.DataStore,
  database: 'schedules',
  user: process.env.DataStoreUser,
  password: process.env.DataStoreUserPassword,
  port: 5432,
});

global.instanceTraceID = new UUID(4);
global.callTraceID = null;
global.lightNames = [];
global.lightGroupNames = [];

/**
 * Restify server Init
 */
const server = restify.createServer({
  name: process.env.ServiceName,
  version: process.env.Version,
  key: fs.readFileSync('./certs/server.key'),
  certificate: fs.readFileSync('./certs/server.crt'),
});

/**
 * Setup API middleware
 */
server.use(restify.plugins.jsonBodyParser({ mapParams: true }));
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser({ mapParams: true }));
server.use(restify.plugins.fullResponse());
server.use((req, res, next) => {
  serviceHelper.log('trace', req.url);
  next();
});
server.use((req, res, next) => {
  // Check for a trace id
  if (typeof req.headers['trace-id'] === 'undefined') { global.callTraceID = new UUID(4); } // Generate new trace id

  // Check for valid auth key
  if (req.headers['client-access-key'] !== process.env.ClientAccessKey) {
    serviceHelper.log('warn', `Invaid client access key: ${req.headers.ClientAccessKey}`);
    serviceHelper.sendResponse(res, 401, 'There was a problem authenticating you.');
    return;
  }
  next();
});

server.on('NotFound', (req, res, err) => {
  serviceHelper.log('error', `${err.message}`);
  serviceHelper.sendResponse(res, 404, err.message);
});
server.on('uncaughtException', (req, res, route, err) => {
  serviceHelper.log('error', `${route}: ${err.message}`);
  serviceHelper.sendResponse(res, err.message);
});

/**
 * Configure API end points
 */
require('../api/root/root.js').applyRoutes(server);
require('../api/lights/lights.js').skill.applyRoutes(server, '/lights');
require('../api/sensors/sensors.js').applyRoutes(server, '/sensors');

/**
 * Stop server if process close event is issued
 */
async function cleanExit() {
  serviceHelper.log('warn', 'Service stopping');
  serviceHelper.log('warn', 'Closing the data store pools');
  await global.lightsDataClient.end();
  await global.schedulesDataClient.end();
  serviceHelper.log('warn', 'Close rest server');
  server.close(() => { // Ensure rest server is stopped
    serviceHelper.log('warn', 'Exit the app');
    process.exit(); // Exit app
  });
}
process.on('SIGINT', () => { cleanExit(); });
process.on('SIGTERM', () => { cleanExit(); });
process.on('SIGUSR2', () => { cleanExit(); });
process.on('uncaughtException', (err) => {
  if (err) serviceHelper.log('error', err.message); // log the error
  cleanExit();
});

/**
 * Data store error events
 */
global.lightsDataClient.on('error', (err) => {
  serviceHelper.log('error', 'Lights data store: Unexpected error on idle client');
  serviceHelper.log('error', err.message);
  cleanExit();
});

global.schedulesDataClient.on('error', (err) => {
  serviceHelper.log('error', 'Schedules data store: Unexpected error on idle client');
  serviceHelper.log('error', err.message);
  cleanExit();
});

// Setup light names
setTimeout(() => { lightNames.setup(); }, 1000);

// Start service and listen to requests
server.listen(process.env.Port, () => {
  serviceHelper.log('info', `${process.env.ServiceName} has started and is listening on port ${process.env.Port}`);
});
