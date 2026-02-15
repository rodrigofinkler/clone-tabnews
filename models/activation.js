import database from "infra/database";
import email from "infra/email.js";
import webserver from "infra/webserver.js";
import user from "models/user.js";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 15min

async function activateUserByUserId(userId) {
  const activatedUser = await user.setFeatures(userId, ["create:session"]);
  return activatedUser;
}

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newToken = await runInsertQuery(userId, expiresAt);
  return newToken;

  async function runInsertQuery(userId, expiresAt) {
    const results = await database.query({
      text: `
          INSERT INTO
            user_activation_tokens ( user_id, expires_at )
          VALUES
            ($1, $2)
          RETURNING
            *
      ;`,
      values: [userId, expiresAt],
    });
    return results.rows[0];
  }
}

async function findValidTokenById(tokenId) {
  const token = await runSelectQuery(tokenId);
  return token;

  async function runSelectQuery(tokenId) {
    const results = await database.query({
      text: `
        SELECT
          *
        FROM
          user_activation_tokens
        WHERE
          id = $1
          AND expires_at > NOW()
          AND used_at IS NULL
        LIMIT 1
      ;`,
      values: [tokenId],
    });
    return results.rows[0];
  }
}

async function markTokenAsUsed(activationTokenId) {
  const usedActivationToken = await runUpdateQuery(activationTokenId);
  return usedActivationToken;

  async function runUpdateQuery(activationTokenId) {
    const results = await database.query({
      text: `
        UPDATE
          user_activation_tokens
        SET
          used_at = TIMEZONE('utc', NOW()),
          updated_at = TIMEZONE('utc', NOW())
        WHERE
          id = $1
        RETURNING
          *
      ;`,
      values: [activationTokenId],
    });

    return results.rows[0];
  }
}

async function sendEmailToUser(user, activationToken) {
  await email.send({
    from: "Clone Tabnews <nao-responda@rodrigofinkler.com.br>",
    to: user.email,
    subject: "Ative seu cadastro na plataforma!",
    text: `${user.username}, clique no link abaixo para ativar o seu cadastro na plataforma Clone Tabnews       

${webserver.origin}/cadastro/ativar/${activationToken.id}

Atenciosamente,
Equipe Clone Tabnews`,
  });
}

const activation = {
  activateUserByUserId,
  create,
  findValidTokenById,
  markTokenAsUsed,
  sendEmailToUser,
};

export default activation;
