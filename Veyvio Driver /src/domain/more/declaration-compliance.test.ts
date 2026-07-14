import { describe, expect, it } from "vitest";
import {
  applyStatementResponse,
  declarationCanSubmit,
  declarationHasReportedChanges,
} from "@/domain/more/declaration-compliance";
import { buildMockDeclarations } from "@/data/mocks/driver-declarations";

describe("declaration compliance", () => {
  it("requires every statement to be confirmed before submit", () => {
    const declaration = buildMockDeclarations().declarations[0];
    expect(declarationCanSubmit(declaration)).toBe(false);

    let working = declaration;
    for (const statement of declaration.statements) {
      working = applyStatementResponse(working, statement.id, "confirmed");
    }

    expect(declarationCanSubmit(working)).toBe(true);
  });

  it("blocks submit when a change is reported", () => {
    const declaration = buildMockDeclarations().declarations[0];
    const withReport = applyStatementResponse(declaration, "licence_status", "change_reported");

    expect(declarationHasReportedChanges(withReport)).toBe(true);
    expect(declarationCanSubmit(withReport)).toBe(false);
  });
});
