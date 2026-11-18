import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/domain/permissions";
import { exportOrganizationData } from "@/server/services/backup";
import { createClient } from "@/server/services/clients";
import { resetDb, setupOrg } from "./helpers";

beforeEach(resetDb);

describe("backup", () => {
  it("exporta dados sem senhas e só para administrador", async () => {
    const s = await setupOrg();
    await createClient(s.admin, { legalName: "Cliente Ltda", tradeName: "Cliente", status: "ATIVO", services: [], memberIds: [] });
    const data = await exportOrganizationData(s.admin);
    expect(data.clientes).toHaveLength(1);
    const json = JSON.stringify(data);
    expect(json).not.toContain("passwordHash");
    expect(json).not.toContain("secretEnc");
    expect(json).not.toContain("totpSecretEnc");
    await expect(exportOrganizationData(s.op)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
