import { describe, expect, it } from "vitest";
import { BODYWORK_LINKED_SECTIONS, isBodyworkLinkedSection } from "@/domain/condition/check-bodywork-link";

describe("check-bodywork-link", () => {
  it("links bodywork-related yard check sections", () => {
    expect(isBodyworkLinkedSection("body-exterior")).toBe(true);
    expect(isBodyworkLinkedSection("tyres-wheels")).toBe(true);
    expect(isBodyworkLinkedSection("audit-bodywork")).toBe(true);
    expect(isBodyworkLinkedSection("brakes")).toBe(false);
  });

  it("includes audit sections in the linked set", () => {
    expect(BODYWORK_LINKED_SECTIONS.has("audit-tyres")).toBe(true);
    expect(BODYWORK_LINKED_SECTIONS.has("audit-lights")).toBe(true);
  });
});
