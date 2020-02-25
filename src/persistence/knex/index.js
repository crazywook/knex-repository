const Knex = require('knex');
const config = require('config');
const log4js = require('log4js');

const logger = log4js.getLogger();

const {
  host,
  user,
  password,
  database,
} = config.get('database');

logger.info('config loaded from node_env: ', config.util.getEnv('NODE_ENV'));
logger.debug('database host is', host);

const knex = Knex({
  debug: databaseDebug,
  client: 'mysql2',
  connection: {
    host,
    user,
    password,
    database,
  },
  pool: { min: 2, max: 10 },
});

module.exports = knex;
