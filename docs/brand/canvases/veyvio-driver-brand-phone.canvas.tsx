import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  Pill,
  Stack,
  Text,
  useHostTheme,
} from "cursor/canvas";

const MIDNIGHT = "#0B1526";
const DRIVER_BLUE = "#2F6BFF";
const DRIVER_SKY = "#8EC5FF";
const PAGE_BG = "#F5F7FA";

function PhoneFrame({ children, label }: { children: unknown; label: string }) {
  const { tokens } = useHostTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Text size="small" weight="semibold">
        {label}
      </Text>
      <div
        style={{
          width: 260,
          height: 520,
          borderRadius: 24,
          border: `1px solid ${tokens.stroke.primary}`,
          background: tokens.bg.elevated,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Wordmark({
  scale = 1,
  showAccent = false,
  size = "splash",
}: {
  scale?: number;
  showAccent?: boolean;
  size?: "splash" | "header" | "chrome";
}) {
  const veyvioSize = size === "splash" ? 28 : size === "header" ? 14 : 11;
  const driverSize = size === "splash" ? 13 : size === "header" ? 9 : 8;

  return (
    <div style={{ textAlign: "left", transform: `scale(${scale})`, transformOrigin: "left center" }}>
      {showAccent ? (
        <div
          style={{
            width: 40,
            height: 2,
            borderRadius: 99,
            background: DRIVER_BLUE,
            marginBottom: 14,
          }}
        />
      ) : null}
      <div
        style={{
          fontSize: veyvioSize,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: "#FFFFFF",
        }}
      >
        VEYVIO
      </div>
      <div
        style={{
          marginTop: size === "splash" ? 8 : 4,
          fontSize: driverSize,
          fontWeight: 600,
          letterSpacing: "0.28em",
          color: DRIVER_SKY,
        }}
      >
        DRIVER
      </div>
    </div>
  );
}

function SignedInChrome() {
  return (
    <div style={{ background: MIDNIGHT, color: "#FFFFFF" }}>
      <div style={{ height: 4, background: DRIVER_BLUE }} />
      <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Wordmark size="header" />
            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.2)" }} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: DRIVER_SKY,
                }}
              >
                Depot
              </div>
              <div style={{ fontSize: 10, fontWeight: 800 }}>WEMBLEY DEPOT</div>
            </div>
          </div>
          <div
            style={{
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "3px 6px",
              borderRadius: 4,
              color: "#178C4B",
              background: "rgba(23,140,75,0.15)",
            }}
          >
            Synced
          </div>
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Move smarter. Operate safer.
        </div>
      </div>
    </div>
  );
}

function BottomTabs() {
  return (
    <div
      style={{
        marginTop: "auto",
        background: MIDNIGHT,
        borderTop: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 4px 14px",
      }}
    >
      {["Home", "Trips", "Checks", "Msgs", "More"].map((label, i) => {
        const active = i === 0;
        return (
          <div
            key={label}
            style={{
              minWidth: 44,
              padding: "6px 4px",
              borderRadius: 8,
              background: active ? "rgba(47,107,255,0.2)" : "transparent",
              color: active ? DRIVER_BLUE : "rgba(255,255,255,0.55)",
              textAlign: "center",
              position: "relative",
            }}
          >
            {active ? (
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 18,
                  height: 3,
                  borderRadius: 99,
                  background: DRIVER_BLUE,
                }}
              />
            ) : null}
            <div style={{ fontSize: 11, marginTop: 4 }}>⌂</div>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", marginTop: 2 }}>
              {label.toUpperCase()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function VeyvioDriverBrandPhoneCanvas() {
  const { tokens } = useHostTheme();

  return (
    <Stack gap={20} style={{ padding: 8 }}>
      <Stack gap={6}>
        <H1>Veyvio Driver — phone brand (Jul 2026 refresh)</H1>
        <Text tone="secondary">
          Stronger Midnight chrome: 4px Driver Blue rail, header-size VEYVIO/DRIVER lockup, promise
          line, home brand chip, and active tab fill. Operational headline still leads Home content.
        </Text>
        <Pill tone="info" size="sm">
          Midnight #0B1526 · Driver Blue #2F6BFF · Driver Sky #8EC5FF
        </Pill>
      </Stack>

      <Callout tone="warning" title="Why phone looked unchanged before">
        First pass only nudged spacing/SVG size against chrome that was already midnight + wordmark —
        differences were easy to miss. This refresh makes the brand rail, home chip, and tab fill
        unmistakable. Always uninstall/clear WebView after APK install so assets reload.
      </Callout>

      <Grid columns={3} gap={16}>
        <Card>
          <CardHeader trailing={<Pill size="sm">Updated</Pill>}>Splash</CardHeader>
          <CardBody>
            <PhoneFrame label="Midnight + Driver Blue glow">
              <div
                style={{
                  flex: 1,
                  background: `radial-gradient(ellipse at 50% 30%, rgba(47,107,255,0.28), transparent 55%), ${MIDNIGHT}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <Wordmark showAccent size="splash" scale={1} />
                </div>
                <div
                  style={{
                    marginTop: 20,
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: "rgba(255,255,255,0.85)",
                    textAlign: "center",
                  }}
                >
                  Know your vehicle before you move.
                </div>
                <div style={{ marginTop: 28, fontSize: 10, color: DRIVER_SKY }}>Checking duty status…</div>
                <div
                  style={{
                    marginTop: "auto",
                    paddingBottom: 16,
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.28em",
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  VEYVIO
                </div>
              </div>
            </PhoneFrame>
          </CardBody>
        </Card>

        <Card>
          <CardHeader trailing={<Pill size="sm">Updated</Pill>}>Signed-in shell</CardHeader>
          <CardBody>
            <PhoneFrame label="Thick blue rail + promise">
              <SignedInChrome />
              <div style={{ flex: 1, background: PAGE_BG, padding: 12, display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    background: MIDNIGHT,
                    borderRadius: 12,
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Wordmark size="chrome" />
                  <div
                    style={{
                      maxWidth: 96,
                      fontSize: 7,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: DRIVER_SKY,
                      textAlign: "right",
                      lineHeight: 1.35,
                    }}
                  >
                    Know your vehicle before you move.
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: MIDNIGHT, lineHeight: 1.2 }}>
                  Vehicle check overdue
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: tokens.text.secondary }}>
                  Wembley Depot · Ridgeway School Transport
                </div>
                <BottomTabs />
              </div>
            </PhoneFrame>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Public auth chrome</CardHeader>
          <CardBody>
            <PhoneFrame label="Sign-in">
              <div style={{ background: MIDNIGHT }}>
                <div style={{ height: 4, background: DRIVER_BLUE }} />
                <div
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Wordmark size="header" />
                  <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.15)" }} />
                  <div
                    style={{
                      fontSize: 8,
                      color: "rgba(255,255,255,0.55)",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      lineHeight: 1.4,
                    }}
                  >
                    Move smarter.
                    <br />
                    Operate safer.
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, background: PAGE_BG, padding: 16 }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: tokens.text.tertiary,
                  }}
                >
                  Step 1 of 2
                </div>
                <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800, color: MIDNIGHT }}>
                  Sign in to Veyvio Driver
                </div>
              </div>
            </PhoneFrame>
          </CardBody>
        </Card>
      </Grid>

      <Card>
        <CardHeader>Rules shipped in app</CardHeader>
        <CardBody>
          <Stack gap={8}>
            <Text>
              Components: AppChromeHeader · HomeHeader brand chip · BottomNav active fill ·
              SplashBrandMark · NavShell product line
            </Text>
            <Divider />
            <Text size="small" tone="secondary">
              After APK install: uninstall previous build or clear app storage so Android WebView does
              not keep old hashed bundles.
            </Text>
            <H2>Phone verify checklist</H2>
            <Text size="small">1. Thick blue bar on top of midnight header</Text>
            <Text size="small">2. Midnight chip on Home with VEYVIO / DRIVER + campaign line</Text>
            <Text size="small">3. Home tab: blue fill + blue pill above icon</Text>
            <Text size="small">4. Promise line under chrome: Move smarter. Operate safer.</Text>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
