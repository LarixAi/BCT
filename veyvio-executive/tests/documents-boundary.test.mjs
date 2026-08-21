import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Phase 8 Executive file routes keep signed downloads behind CSRF and session", async () => {
  const files = await readFile(
    new URL("../app/api/executive/files/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(files, /assertSameOrigin\(request\)/);
  assert.match(files, /\/executive\/documents/);
  assert.match(files, /delete doc\.storageKey/);
  assert.match(files, /from "\.\.\/\.\.\/\.\.\/chatgpt-auth"/);
  assert.doesNotMatch(files, /service_role|sb_secret_/i);

  const download = await readFile(
    new URL(
      "../app/api/executive/files/[id]/download/route.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(download, /assertSameOrigin\(request\)/);
  assert.match(download, /\/download/);
  assert.match(download, /delete safe\.storageKey/);
  assert.match(
    download,
    /from "\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/chatgpt-auth"/,
  );

  const fileDelete = await readFile(
    new URL("../app/api/executive/files/[id]/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    fileDelete,
    /from "\.\.\/\.\.\/\.\.\/\.\.\/chatgpt-auth"/,
  );

  const fulfil = await readFile(
    new URL(
      "../app/api/executive/exports/[id]/fulfil/route.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(fulfil, /assertSameOrigin\(request\)/);
  assert.match(fulfil, /\/fulfil/);
  assert.match(fulfil, /executive\.export\.propose/);
  assert.match(
    fulfil,
    /from "\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/chatgpt-auth"/,
  );
});
