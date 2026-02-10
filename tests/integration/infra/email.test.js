import email from "infra/email.js";
import orchestrator from "tests/orchestrator.js";

describe("infra/email.js", () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
  });

  beforeEach(async () => {
    await orchestrator.deleteAllEmails();
  });

  test("send()", async () => {
    await email.send({
      from: "Admin <admin@rodrigofinkler.com.br>",
      to: "contato@rodrigofinkler.com.br",
      subject: "Teste de assunto.",
      text: "Teste de corpo.",
    });
    await email.send({
      from: "Admin <admin@rodrigofinkler.com.br>",
      to: "contato@rodrigofinkler.com.br",
      subject: "Último email enviado.",
      text: "Corpo do último email.",
    });

    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail.sender).toBe("<admin@rodrigofinkler.com.br>");
    expect(lastEmail.recipients[0]).toBe("<contato@rodrigofinkler.com.br>");
    expect(lastEmail.subject).toBe("Último email enviado.");
    expect(lastEmail.text).toBe("Corpo do último email.\r\n");
  });
});
