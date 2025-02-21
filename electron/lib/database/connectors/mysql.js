const mysql = require("mysql2/promise");

const connectMySQL = async (config) => {
  try {
    const connection = await mysql.createConnection({
      user: config.username,
      password: config.password,
      host: config.host,
      database: config.database,
    });
    console.log("Connected to MySQL.");
    return { ok: connection };
  } catch (err) {
    return { error: `MySQL connection failed: ${err.message}` };
  }
};

const queryMySQL = async (connection, queryString) => {
  try {
    const [rows, fields] = await connection.execute(queryString);
    const columns = fields.reduce(
      (acc, field) => ({
        ...acc,
        [field.name]: { type: { name: field.type } },
      }),
      {},
    );
    return { ok: { rows, columns } };
  } catch (err) {
    return { error: `MySQL query failed: ${err.message}` };
  }
};

const disconnectMySQL = async (connection) => {
  try {
    await connection.end();
    console.log("Disconnected from MySQL.");
    return { ok: true };
  } catch (err) {
    return { error: `MySQL disconnection failed: ${err.message}` };
  }
};

module.exports = { connectMySQL, queryMySQL, disconnectMySQL };
