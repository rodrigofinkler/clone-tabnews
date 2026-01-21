import { createRouter } from "next-connect";

import database from "infra/database";
import { InternalServerError, MethodNotAllowedError } from "infra/errors";

const router = createRouter();

router.get(getHandler);

export default router.handler({
  onNoMatch: onNoMatchHandler,
  onError: onErrorHandler,
});

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onErrorHandler(error, request, response) {
  const publicErrorObject = new InternalServerError({
    cause: error,
  });
  console.log(`\nErro dentro do router do next-connect:`);
  console.error(publicErrorObject);

  console.error(publicErrorObject.toJSON());

  response.status(500).json(publicErrorObject);
}

async function getHandler(request, response) {
  const updatedAt = new Date();

  const databaseVersionResult = await database.query("SHOW server_version;");
  const databaseVersionValue = databaseVersionResult?.rows[0]?.server_version;

  const databaseMaxConnectionsResult = await database.query(
    "SHOW max_connections;",
  );
  const databaseMaxConnectionsValue =
    databaseMaxConnectionsResult?.rows[0]?.max_connections;

  const databaseName = process.env.POSTGRES_DB;
  const databaseOpenedConnectionsResult = await database.query(
    {
      text: `SELECT COUNT(*)::int AS opened_connections FROM pg_stat_activity WHERE datname = $1;`,
      values: [databaseName],
    },
    [databaseName],
  );
  const databaseOpenedConnectionsValue =
    databaseOpenedConnectionsResult?.rows[0]?.opened_connections;

  return response.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: databaseVersionValue,
        max_connections: parseInt(databaseMaxConnectionsValue),
        opened_connections: databaseOpenedConnectionsValue,
      },
    },
  });
}
