const { connectMSSQL, queryMSSQL, disconnectMSSQL } = require("./connectors/mssql");
const { connectMySQL, queryMySQL, disconnectMySQL } = require("./connectors/mysql");
// Placeholder for future connectors
// const { connectMySQL, queryMySQL, disconnectMySQL } = require("./connectors/mysql");
// const { connectBigQuery, queryBigQuery, disconnectBigQuery } = require("./connectors/bigquery");

const getConnector = (dbType) => {
  switch (dbType) {
    case "mssql":
      return { connect: connectMSSQL, query: queryMSSQL, disconnect: disconnectMSSQL };
    case "mysql":
      return { connect: connectMySQL, query: queryMySQL, disconnect: disconnectMySQL };
    default:
      return null; // Invalid dbType will be handled upstream
  }
};

module.exports = { getConnector };
