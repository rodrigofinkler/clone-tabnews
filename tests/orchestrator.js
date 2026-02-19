import retry from "async-retry";
import { faker } from "@faker-js/faker";

import database from "infra/database.js";
import activation from "models/activation.js";
import migrator from "models/migrator.js";
import session from "models/session.js";
import user from "models/user.js";

const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;

async function activateUser(userId) {
  return await activation.activateUserByUserId(userId);
}

async function clearDatabase() {
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
}

async function createSession(userId) {
  return await session.create(userId);
}

async function createUser(userObject) {
  return await user.create({
    username:
      userObject?.username ?? faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject?.email ?? faker.internet.email(),
    password: userObject?.password ?? "validpassword",
  });
}

async function createUserActivationToken(userId) {
  const activationToken = await activation.create(userId);
  return activationToken;
}

async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: "DELETE",
  });
}

async function getLastEmail() {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);
  const emailListBody = await emailListResponse.json();
  const lastEmailItem = emailListBody.pop();

  if (!lastEmailItem) {
    return null;
  }

  const lastEmailTextResponse = await fetch(
    `${emailHttpUrl}/messages/${lastEmailItem?.id}.plain`,
  );
  const lastEmailTextResponseBody = await lastEmailTextResponse.text();

  return {
    ...lastEmailItem,
    text: lastEmailTextResponseBody,
  };
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function waitForAllServices() {
  await waitForEmailServer();
  await waitForWebServer();

  async function waitForEmailServer() {
    return retry(fetchEmailPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchEmailPage() {
      const response = await fetch(emailHttpUrl);

      if (response.status != 200) {
        throw Error();
      }
    }
  }

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (response.status != 200) {
        throw Error();
      }
    }
  }
}

function extractUuid(text) {
  const match = text.match(/[0-9a-fA-F-]{36}/);
  return match ? match[0] : null;
}

const orchestrator = {
  activateUser,
  clearDatabase,
  createSession,
  createUser,
  createUserActivationToken,
  deleteAllEmails,
  getLastEmail,
  runPendingMigrations,
  waitForAllServices,
  extractUuid,
};

export default orchestrator;
