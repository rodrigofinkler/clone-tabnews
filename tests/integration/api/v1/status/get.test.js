import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/status", () => {
  describe("Anonymous user", () => {
    test("Retrieving current system status", async () => {
      const response = await fetch("http://localhost:3000/api/v1/status");
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();
      expect(responseBody.updated_at).toEqual(parsedUpdatedAt);

      const databaseDep = responseBody?.dependencies?.database;

      expect(databaseDep.max_connections).toEqual(100);
      expect(databaseDep.opened_connections).toEqual(1);
      expect(databaseDep).not.toHaveProperty("version");
    });
  });
  describe("Default user", () => {
    test("Retrieving current system status", async () => {
      const defaultUser = await orchestrator.createUser();
      const activatedDefaultUser = await orchestrator.activateUser(
        defaultUser.id,
      );
      const defaultUserSessionObject = await orchestrator.createSession(
        activatedDefaultUser.id,
      );

      const response = await fetch("http://localhost:3000/api/v1/status", {
        headers: {
          Cookie: `session_id=${defaultUserSessionObject.token}`,
        },
      });
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();
      expect(responseBody.updated_at).toEqual(parsedUpdatedAt);

      const databaseDep = responseBody?.dependencies?.database;

      expect(databaseDep.max_connections).toEqual(100);
      expect(databaseDep.opened_connections).toEqual(1);
      expect(databaseDep).not.toHaveProperty("version");
    });
  });
  describe("Privileged user", () => {
    test("Retrieving current system status", async () => {
      const privilegedUser = await orchestrator.createUser();

      const activatedPrivilegedUser = await orchestrator.activateUser(
        privilegedUser.id,
      );

      await orchestrator.addFeaturesToUser(privilegedUser.id, [
        "read:status:all",
      ]);

      const privilegedUserSessionObject = await orchestrator.createSession(
        activatedPrivilegedUser.id,
      );

      const response = await fetch("http://localhost:3000/api/v1/status", {
        headers: {
          Cookie: `session_id=${privilegedUserSessionObject.token}`,
        },
      });
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();
      expect(responseBody.updated_at).toEqual(parsedUpdatedAt);

      const databaseDep = responseBody?.dependencies?.database;

      expect(databaseDep.version).toBe("16.0");

      expect(databaseDep.max_connections).toEqual(100);

      expect(databaseDep.opened_connections).toEqual(1);
    });
  });
});
