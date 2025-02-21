const mysql = require("mysql2/promise");

// Define a mapping from MySQL numeric type codes to readable type names.
// You can adjust these names as desired.
const typeMap = {
  0: "decimal",
  1: "tinyint",
  2: "smallint",
  3: "int",
  4: "float",
  5: "double",
  6: "null",
  7: "timestamp",
  8: "bigint",
  9: "mediumint",
  10: "date",
  11: "time",
  12: "datetime",
  13: "year",
  14: "date", // NEWDATE is treated as date
  15: "varchar",
  16: "bit",
  245: "json",
  246: "decimal", // newdecimal; you can change this if needed
  247: "enum",
  248: "set",
  249: "tinyblob",
  250: "mediumblob",
  251: "longblob",
  252: "blob",
  253: "var_string",
  254: "string",
  255: "geometry",
};

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
    // Build column information using our custom typeMap.
    const columns = fields.reduce((acc, field) => {
      const typeName = typeMap[field.type] || field.type;
      return {
        ...acc,
        [field.name]: { type: { name: typeName } },
      };
    }, {});
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
