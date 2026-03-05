import { createRouter } from "next-connect";

import controller from "infra/controller.js";
import activation from "models/activation.js";
import authorization from "models/authorization.js";
import user from "models/user.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:user"), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const userTryingToPost = request.context.user;
  const userInputValues = request.body;

  const newUser = await user.create(userInputValues);

  // 1. Create activation token
  const activationToken = await activation.create(newUser.id);
  // 2. Send token via email
  await activation.sendEmailToUser(newUser, activationToken);

  const secureOutputValues = authorization.filterOutput(
    userTryingToPost,
    "read:user",
    newUser,
  );

  return response.status(201).json(secureOutputValues);
}
