import { createRouter } from "next-connect";

import controller from "infra/controller.js";
import { ForbiddenError } from "infra/errors.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import session from "models/session.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);

router.delete(deleteHandler);
router.post(controller.canRequest("create:session"), postHandler);

export default router.handler(controller.errorHandlers);

async function deleteHandler(request, response) {
  const sessionToken = request.cookies.session_id;

  const sessionObject = await session.findOneValidByToken(sessionToken);
  const expiredSession = await session.expireById(sessionObject.id);

  controller.clearSessionCookie(response);
  return response.status(200).json(expiredSession);
}

async function postHandler(request, response) {
  const userInputValues = request.body;

  const authenticatedUser = await authentication.getAuthenticatedUser(
    userInputValues.email,
    userInputValues.password,
  );

  if (!authorization.can(authenticatedUser, "create:session")) {
    throw new ForbiddenError({
      message: "Você não possui permissão para fazer login.",
      action: "Contate suporte caso você acredite que isso seja um erro.",
    });
  }

  const newSession = await session.create(authenticatedUser.id);

  controller.setSessionCookie(response, newSession.token);

  return response.status(201).json(newSession);
}
