/* eslint-disable no-console */
const e = require('express');
const { Pool } = require('pg');


const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

class MySqlConn {
  async execSQLQuery(query) {
    const client = await pool.connect();
    const result = await client.query({
      text: query,
    });
    await client.end();
    if (['INSERT', 'UPDATE', 'DELETE'].includes(result.command)) return result.rowCount;
    return result.rows;
  }

  async execSQLTxn(arrayOfQueryInSequence) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < arrayOfQueryInSequence.length; i += 1) {
        await client.query(arrayOfQueryInSequence[i]);
      }
      await client.query('COMMIT');
    } catch (err) {
      console.log(err);
      await client.query('ROLLBACK');
      client.release();
      throw e;
    }
  }
}

module.exports = new MySqlConn();
