import { version as uuidVersion } from "uuid";

import user from "models/user.js";
import password from "models/password.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With unique `username`", async () => {
      const uniqueUser1 = await orchestrator.createUser({
        username: "uniqueUser1",
      });

      const patchResponse = await fetch(
        `http://localhost:3000/api/v1/users/${uniqueUser1.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "uniqueUser2",
          }),
        },
      );

      expect(patchResponse.status).toBe(403);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        action: 'Verifique se o seu usuário possui a feature: "update:user".',
        message: "Você não possui permissão para executar esta ação.",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With nonexistent `username`", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser.id);
      const sessionObject = await orchestrator.createSession(activatedUser.id);

      const response2 = await fetch(
        "http://localhost:3000/api/v1/users/UsuarioInexistente",
        {
          method: "PATCH",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response2.status).toBe(404);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "NotFoundError",
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username está digitado corretamente.",
        status_code: 404,
      });
    });

    test("With duplicated `username`", async () => {
      await orchestrator.createUser({
        username: "user1",
      });

      const createdUser2 = await orchestrator.createUser({
        username: "user2",
      });
      const activatedUser2 = await orchestrator.activateUser(createdUser2.id);
      const sessionObject2 = await orchestrator.createSession(
        activatedUser2.id,
      );

      const patchResponse = await fetch(
        "http://localhost:3000/api/v1/users/user2",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject2.token}`,
          },
          body: JSON.stringify({
            username: "user1",
          }),
        },
      );

      expect(patchResponse.status).toBe(400);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        name: "ValidationError",
        message: "O username informado já está sendo utilizado.",
        action: "Utilize outro username para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With `userA` targeting `userB`", async () => {
      await orchestrator.createUser({
        username: "userA",
      });

      const createdUserB = await orchestrator.createUser({
        username: "userB",
      });
      const activatedUserB = await orchestrator.activateUser(createdUserB.id);
      const sessionObjectB = await orchestrator.createSession(
        activatedUserB.id,
      );

      const patchResponse = await fetch(
        "http://localhost:3000/api/v1/users/userA",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObjectB.token}`,
          },
          body: JSON.stringify({
            username: "userC",
          }),
        },
      );

      expect(patchResponse.status).toBe(403);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para atualizar outro usuário.",
        action:
          "Verifique se você possui a feature necessária para atualizar outro usuário.",
        status_code: 403,
      });
    });

    test("With duplicated `email`", async () => {
      await orchestrator.createUser({
        email: "email1@curso.dev",
      });

      const createdUser2 = await orchestrator.createUser({
        email: "email2@curso.dev",
      });
      const activatedUser2 = await orchestrator.activateUser(createdUser2.id);
      const sessionObject2 = await orchestrator.createSession(
        activatedUser2.id,
      );

      const patchResponse = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser2.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject2.token}`,
          },
          body: JSON.stringify({
            email: "email1@curso.dev",
          }),
        },
      );

      expect(patchResponse.status).toBe(400);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        name: "ValidationError",
        message: "O email informado já está sendo utilizado.",
        action: "Utilize outro email para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With unique `username`", async () => {
      const uniqueUser = await orchestrator.createUser({
        username: "uniqueUsername1",
      });
      const activatedUser = await orchestrator.activateUser(uniqueUser.id);
      const sessionObject = await orchestrator.createSession(activatedUser.id);

      const patchResponse = await fetch(
        `http://localhost:3000/api/v1/users/${uniqueUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "uniqueUsername2",
          }),
        },
      );

      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: patchResponseBody.id,
        username: "uniqueUsername2",
        email: uniqueUser.email,
        features: ["create:session", "read:session", "update:user"],
        password: patchResponseBody.password,
        created_at: patchResponseBody.created_at,
        updated_at: patchResponseBody.updated_at,
      });

      expect(uuidVersion(patchResponseBody.id)).toBe(4);
      expect(Date.parse(patchResponseBody.created_at)).not.toBeNaN();
      expect(Date.parse(patchResponseBody.updated_at)).not.toBeNaN();

      expect(patchResponseBody.updated_at > patchResponseBody.created_at).toBe(
        true,
      );
    });

    test("With unique `email`", async () => {
      const testUser = await orchestrator.createUser({
        email: "uniqueEmail1@curso.dev",
      });
      const activatedUser = await orchestrator.activateUser(testUser.id);
      const sessionObject = await orchestrator.createSession(activatedUser.id);

      const patchResponse = await fetch(
        `http://localhost:3000/api/v1/users/${testUser?.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            email: "uniqueEmail2@curso.dev",
          }),
        },
      );

      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: patchResponseBody.id,
        username: testUser.username,
        email: "uniqueEmail2@curso.dev",
        features: ["create:session", "read:session", "update:user"],
        password: patchResponseBody.password,
        created_at: patchResponseBody.created_at,
        updated_at: patchResponseBody.updated_at,
      });

      expect(uuidVersion(patchResponseBody.id)).toBe(4);
      expect(Date.parse(patchResponseBody.created_at)).not.toBeNaN();
      expect(Date.parse(patchResponseBody.updated_at)).not.toBeNaN();

      expect(patchResponseBody.updated_at > patchResponseBody.created_at).toBe(
        true,
      );
    });

    test("With new `password`", async () => {
      const testUser = await orchestrator.createUser({
        password: "initialPassword",
      });
      const activatedUser = await orchestrator.activateUser(testUser.id);
      const sessionObject = await orchestrator.createSession(activatedUser.id);

      const patchResponse = await fetch(
        `http://localhost:3000/api/v1/users/${testUser?.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            password: "newPassword",
          }),
        },
      );

      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: patchResponseBody.id,
        username: testUser.username,
        email: testUser.email,
        features: ["create:session", "read:session", "update:user"],
        password: patchResponseBody.password,
        created_at: patchResponseBody.created_at,
        updated_at: patchResponseBody.updated_at,
      });

      expect(uuidVersion(patchResponseBody.id)).toBe(4);
      expect(Date.parse(patchResponseBody.created_at)).not.toBeNaN();
      expect(Date.parse(patchResponseBody.updated_at)).not.toBeNaN();

      expect(patchResponseBody.updated_at > patchResponseBody.created_at).toBe(
        true,
      );

      const userInDatabase = await user.findOneByUsername(testUser.username);
      const correctPasswordMatch = await password.compare(
        "newPassword",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);

      const incorrectPasswordMatch = await password.compare(
        "initialPassword",
        userInDatabase.password,
      );

      expect(incorrectPasswordMatch).toBe(false);
    });
  });

  describe("Privileged user", () => {
    test("With `update:user:others` targeting `defaultUser`", async () => {
      const defaultUser = await orchestrator.createUser({});

      const privilegedUser = await orchestrator.createUser({});
      const activatedPrivilegedUser = await orchestrator.activateUser(
        privilegedUser.id,
      );

      await orchestrator.addFeaturesToUser(privilegedUser.id, [
        "update:user:others",
      ]);

      const privilegedUserSessionObject = await orchestrator.createSession(
        activatedPrivilegedUser.id,
      );

      const patchResponse = await fetch(
        `http://localhost:3000/api/v1/users/${defaultUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${privilegedUserSessionObject.token}`,
          },
          body: JSON.stringify({
            username: "ChangedByPrivilegedUser",
          }),
        },
      );

      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: defaultUser.id,
        username: "ChangedByPrivilegedUser",
        email: defaultUser.email,
        features: defaultUser.features,
        password: patchResponseBody.password,
        created_at: patchResponseBody.created_at,
        updated_at: patchResponseBody.updated_at,
      });

      expect(uuidVersion(patchResponseBody.id)).toBe(4);
      expect(Date.parse(patchResponseBody.created_at)).not.toBeNaN();
      expect(Date.parse(patchResponseBody.updated_at)).not.toBeNaN();

      expect(patchResponseBody.updated_at > patchResponseBody.created_at).toBe(
        true,
      );
    });
  });
});
