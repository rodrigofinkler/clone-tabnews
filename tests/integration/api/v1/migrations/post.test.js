import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("Running pending migrations", async () => {
      const response1 = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "POST",
      });
      expect(response1.status).toBe(403);

      const responseBody = await response1.json();

      expect(responseBody).toEqual({
        action:
          'Verifique se o seu usuário possui a feature: "create:migration".',
        message: "Você não possui permissão para executar esta ação.",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("Running pending migrations", async () => {
      const defaultUser = await orchestrator.createUser();
      const activatedDefaultUser = await orchestrator.activateUser(
        defaultUser.id,
      );
      const defaultUserSessionObject = await orchestrator.createSession(
        activatedDefaultUser.id,
      );

      const response1 = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "POST",
        headers: {
          Cookie: `session_id=${defaultUserSessionObject.token}`,
        },
      });

      expect(response1.status).toBe(403);

      const responseBody = await response1.json();

      expect(responseBody).toEqual({
        action:
          'Verifique se o seu usuário possui a feature: "create:migration".',
        message: "Você não possui permissão para executar esta ação.",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });
});

describe("Privileged user", () => {
  describe("Running pending migrations", () => {
    test("With feature `create:migration`", async () => {
      const privilegedUser = await orchestrator.createUser();
      const activatedPrivilegedUser = await orchestrator.activateUser(
        privilegedUser.id,
      );
      await orchestrator.addFeaturesToUser(privilegedUser.id, [
        "create:migration",
      ]);
      const privilegedUserSessionObject = await orchestrator.createSession(
        activatedPrivilegedUser.id,
      );

      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "POST",
        headers: {
          Cookie: `session_id=${privilegedUserSessionObject.token}`,
        },
      });
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(Array.isArray(responseBody)).toBe(true);
    });
  });
});
