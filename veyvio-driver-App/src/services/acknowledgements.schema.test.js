import { describe, expect, it } from "vitest";

function isSchemaUnavailableError(error) {
  if (!error) return false;
  const message = String(error.message ?? error).toLowerCase();
  const code = String(error.code ?? "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("does not exist")
  );
}

function toDriverError(raw) {
  const message = String(raw ?? "").trim();
  if (!message) return "";
  if (/schema cache|could not find the table|does not exist|PGRST205|42P01/i.test(message)) {
    return "";
  }
  return message;
}

describe("acknowledgements schema soft-fail", () => {
  it("detects missing corrective_actions table", () => {
    expect(
      isSchemaUnavailableError({
        code: "PGRST205",
        message: "Could not find the table 'public.corrective_actions' in the schema cache",
      }),
    ).toBe(true);
  });

  it("hides schema messages from drivers", () => {
    expect(
      toDriverError("Could not find the table 'public.corrective_actions' in the schema cache"),
    ).toBe("");
  });

  it("keeps real operational errors", () => {
    expect(toDriverError("Could not reach Command. Try again.")).toBe(
      "Could not reach Command. Try again.",
    );
  });
});
