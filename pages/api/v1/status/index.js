import database from "../../../../infra/database";

async function Status(request, response) {
  const result = await database.query("SELECT 1 + 1 AS sum;");
  console.log(result.rows);
  response.status(200).json("This will be the status endpoint at some point.");
}

export default Status;
