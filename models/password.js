import bcryptjs from "bcryptjs";

async function compare(providedPassword, storedHashedPassword) {
  return await bcryptjs.compare(providedPassword, storedHashedPassword);
}

async function hash(password) {
  const rounds = getNumberOfRounds();
  return await bcryptjs.hash(password, rounds);
}

function getNumberOfRounds() {
  return process.env.NODE_ENV === "production" ? 14 : 1;
}

const password = {
  compare,
  hash,
};

export default password;
