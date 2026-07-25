/**
 * Fail-closed Base44 client for Command production builds.
 * Legacy PHV tree remains in repo for optional TfL pilots only.
 */

function blocked(access) {
  const err = () => {
    throw new Error(
      `PHV/Base44 path (${access}) is not available — enable VITE_ENABLE_PHV_MODULE only for TfL PHV pilots.`,
    );
  };
  const fn = function phvPathBlocked() {
    err();
  };
  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === "then") return undefined;
      return blocked(`${access}.${String(prop)}`);
    },
    apply: err,
  });
}

export const base44 = blocked("base44");
