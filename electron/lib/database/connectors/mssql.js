const sql = require("mssql");

const connectMSSQL = async (config) => {
  try {
    const connection = await sql.connect({
      user: config.username,
      password: config.password,
      server: config.host,
      database: config.database,
      options: { encrypt: true, trustServerCertificate: true },
    });
    console.log("Connected to MSSQL.");
    return { ok: connection };
  } catch (err) {
    return { error: `MSSQL connection failed: ${err.message}` };
  }
};

const queryMSSQL = async (connection, queryString) => {
  try {
    const result = await connection.query(queryString);
    const plainColumns = Object.entries(result.recordset.columns || {}).reduce(
      (acc, [colName, meta]) => ({
        ...acc,
        [colName]: { type: { name: meta.type?.name || "" } },
      }),
      {},
    );
    return { ok: { rows: result.recordset, columns: plainColumns } };
  } catch (err) {
    return { error: `MSSQL query failed: ${err.message}` };
  }
};

const disconnectMSSQL = async (connection) => {
  try {
    await sql.close();
    console.log("Disconnected from MSSQL.");
    return { ok: true };
  } catch (err) {
    return { error: `MSSQL disconnection failed: ${err.message}` };
  }
};

module.exports = { connectMSSQL, queryMSSQL, disconnectMSSQL };
