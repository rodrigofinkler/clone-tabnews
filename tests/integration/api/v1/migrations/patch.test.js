import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
});

describe("PATCH /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("Retrieving pending migrations", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "PATCH",
      });
      expect(response.status).toBe(405);

      const responseBody = await response.json();

      expect(responseBody?.status_code).toBe(405);
      expect(responseBody?.name).toBe("MethodNotAllowedError");
    });
  });
});
