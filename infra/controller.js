import * as cookie from "cookie";

import session from "models/session.js";
import user from "models/user.js";
import {
  ForbiddenError,
  InternalServerError,
  MethodNotAllowedError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "infra/errors.js";

function onErrorHandler(error, request, response) {
  if (
    error instanceof ForbiddenError ||
    error instanceof NotFoundError ||
    error instanceof ValidationError
  ) {
    return response.status(error.statusCode).json(error);
  }
  if (error instanceof UnauthorizedError) {
    clearSessionCookie(response);
    return response.status(error.statusCode).json(error);
  }

  const publicErrorObject = new InternalServerError({
    cause: error,
  });

  console.error(publicErrorObject);

  return response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function canRequest(feature) {
  return function canRequestMiddleware(request, response, next) {
    const userAttemptingRequest = request.context.user;
    if (userAttemptingRequest?.features?.includes(feature)) {
      return next();
    }
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action: `Verifique se o seu usuário possui a feature: ${feature}`,
    });
  };
}

async function clearSessionCookie(response) {
  const setCookie = cookie.serialize("session_id", "invalid", {
    path: "/",
    maxAge: -1, // makes browser remove the cookie
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  response.setHeader("Set-Cookie", setCookie);
}

async function injectAnonymousOrUser(request, response, next) {
  // 1. If the `session_id` cookie exists, inject user
  if (request.cookies?.session_id) {
    await injectAuthenticatedUser(request);
    return next();
  }
  // 2. If the cookie does not exist, inject anonymous user
  injectAnonymousUser(request);
  return next();

  async function injectAuthenticatedUser(request) {
    const sessionToken = request.cookies.session_id;
    const sessionObject = await session.findOneValidByToken(sessionToken);
    const userObject = await user.findOneById(sessionObject.user_id);
    request.context = {
      ...request.context,
      user: userObject,
    };
  }

  async function injectAnonymousUser(request) {
    const anonymousUserObject = {
      features: ["read:activation_token", "create:session", "create:user"],
    };

    request.context = {
      ...request.context,
      user: anonymousUserObject,
    };
  }
}

async function setSessionCookie(response, sessionToken) {
  const setCookie = cookie.serialize("session_id", sessionToken, {
    path: "/",
    maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000, // maxAge in seconds
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  response.setHeader("Set-Cookie", setCookie);
}

const controller = {
  errorHandlers: {
    onError: onErrorHandler,
    onNoMatch: onNoMatchHandler,
  },
  canRequest,
  clearSessionCookie,
  injectAnonymousOrUser,
  setSessionCookie,
};

export default controller;
