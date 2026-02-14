import webserver from "infra/webserver.js";
import activation from "models/activation.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: Registration Flow (all successful)", () => {
  let createUserResponseBody;

  test("Create user account", async () => {
    const createUserResponse = await fetch(
      "http://localhost:3000/api/v1/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "RegistrationFlow",
          email: "registrationflow@curso.dev",
          password: "RegistrationFlowPwd",
        }),
      },
    );

    expect(createUserResponse.status).toBe(201);

    createUserResponseBody = await createUserResponse.json();

    expect(createUserResponseBody).toEqual({
      id: createUserResponseBody.id,
      username: "RegistrationFlow",
      email: "registrationflow@curso.dev",
      features: ["read:activation_token"],
      password: createUserResponseBody.password,
      created_at: createUserResponseBody.created_at,
      updated_at: createUserResponseBody.updated_at,
    });
  });

  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail.sender).toBe("<nao-responda@rodrigofinkler.com.br>");
    expect(lastEmail.recipients[0]).toBe("<registrationflow@curso.dev>");
    expect(lastEmail.subject).toBe("Ative seu cadastro na plataforma!");
    expect(lastEmail.text).toContain("RegistrationFlow");

    const extractedToken = orchestrator.extractUuid(lastEmail.text);

    expect(lastEmail.text).toContain(
      `${webserver.origin}/cadastro/ativar/${extractedToken}`,
    );

    const validToken = await activation.findValidTokenById(extractedToken);

    expect(validToken.user_id).toBe(createUserResponseBody.id);
    expect(validToken.used_at).toBe(null);
  });

  test("Activate account", async () => {});

  test("Login", async () => {});

  test("Get user information", async () => {});
});
