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
  Row,
  Stack,
  Stat,
  Text,
  useHostTheme,
} from "cursor/canvas";

/** Brand hexes — intentional for this phone brand inventory canvas. */
const MIDNIGHT = "#0B1526";
const DRIVER_BLUE = "#2F6BFF";
const DRIVER_SKY = "#8EC5FF";
const SOFT = "#EFF6FF";
const PAGE_BG = "#F4F6F8";
const OK = "#178C4B";
const WARN = "#D97706";
const BORDER = "#E4E7EC";
const MUTED = "#667085";

type HubTab = "Home" | "Duties" | "Checks" | "Messages" | "More";

function SvgIcon({
  children,
  size = 16,
  color = "currentColor",
}: {
  children: unknown;
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function TabGlyph({ tab, color }: { tab: HubTab; color: string }) {
  if (tab === "Home") {
    return (
      <SvgIcon color={color} size={18}>
        <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
      </SvgIcon>
    );
  }
  if (tab === "Duties") {
    return (
      <SvgIcon color={color} size={18}>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </SvgIcon>
    );
  }
  if (tab === "Checks") {
    return (
      <SvgIcon color={color} size={18}>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1H9V5Z" />
        <path d="m9 14 2 2 4-4" />
      </SvgIcon>
    );
  }
  if (tab === "Messages") {
    return (
      <SvgIcon color={color} size={18}>
        <path d="M4 5h16v11H8l-4 4V5Z" />
      </SvgIcon>
    );
  }
  return (
    <SvgIcon color={color} size={18}>
      <path d="M5 12h.01M12 12h.01M19 12h.01" />
    </SvgIcon>
  );
}

function PhoneFrame({
  children,
  label,
  status = "light",
}: {
  children: unknown;
  label: string;
  status?: "light" | "midnight";
}) {
  const { tokens } = useHostTheme();
  const light = status === "light";

  return (
    <Stack gap={8}>
      <Text size="small" weight="semibold" tone="secondary">
        {label}
      </Text>
      <div
        style={{
          width: 270,
          height: 560,
          borderRadius: 24,
          border: `1px solid ${tokens.stroke.primary}`,
          background: PAGE_BG,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            height: 32,
            padding: "8px 14px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            fontWeight: 650,
            color: light ? MIDNIGHT : "#FFFFFF",
            background: light ? PAGE_BG : MIDNIGHT,
            flexShrink: 0,
          }}
        >
          <span>06:14</span>
          <span>5G · 81%</span>
        </div>
        {children}
      </div>
    </Stack>
  );
}

function HubBottomNav({ active = "Home" }: { active?: HubTab }) {
  const tabs: HubTab[] = ["Home", "Duties", "Checks", "Messages", "More"];
  return (
    <div
      style={{
        marginTop: "auto",
        background: "rgba(255,255,255,0.97)",
        borderTop: `1px solid ${BORDER}`,
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        padding: "4px 4px 10px",
        flexShrink: 0,
      }}
    >
      {tabs.map(label => {
        const isActive = label === active;
        const color = isActive ? DRIVER_BLUE : MUTED;
        return (
          <div
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              color,
            }}
          >
            <div
              style={{
                width: 30,
                height: 26,
                borderRadius: 10,
                background: isActive ? SOFT : "transparent",
                display: "grid",
                placeItems: "center",
              }}
            >
              <TabGlyph tab={label} color={color} />
            </div>
            <div style={{ fontSize: 8, fontWeight: 650 }}>{label === "Messages" ? "Msgs" : label}</div>
          </div>
        );
      })}
    </div>
  );
}

function RoundBtn({ children }: { children: unknown }) {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 99,
        background: "#FFFFFF",
        border: `1px solid ${BORDER}`,
        display: "grid",
        placeItems: "center",
        color: MIDNIGHT,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function MapSurface({ label }: { label: string }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#D8E2EC", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "10%", top: 0, bottom: 0, width: 2, background: "#F8FAFC" }} />
      <div style={{ position: "absolute", left: "48%", top: 0, bottom: 0, width: 3, background: "#F8FAFC" }} />
      <div style={{ position: "absolute", top: "36%", left: 0, right: 0, height: 2, background: "#F8FAFC" }} />
      <div style={{ position: "absolute", top: "62%", left: 0, right: 0, height: 3, background: "#F8FAFC" }} />
      <div
        style={{
          position: "absolute",
          left: "16%",
          top: "40%",
          width: "60%",
          height: 4,
          borderRadius: 99,
          background: DRIVER_BLUE,
          transform: "rotate(-10deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 10,
          top: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: 99,
          background: "rgba(255,255,255,0.96)",
          border: `1px solid ${BORDER}`,
          fontSize: 9,
          fontWeight: 700,
          color: MIDNIGHT,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 99, background: OK }} />
        {label}
      </div>
    </div>
  );
}

function Wordmark({
  onDark = true,
  size = "splash",
}: {
  onDark?: boolean;
  size?: "splash" | "header" | "quiet";
}) {
  const veyvioSize = size === "splash" ? 26 : size === "header" ? 13 : 11;
  const driverSize = size === "splash" ? 12 : size === "header" ? 8 : 7;
  const veyvioColor = onDark ? "#FFFFFF" : MIDNIGHT;
  const driverColor = onDark ? DRIVER_SKY : DRIVER_BLUE;

  return (
    <div style={{ textAlign: "left" }}>
      <div style={{ fontSize: veyvioSize, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, color: veyvioColor }}>
        VEYVIO
      </div>
      <div
        style={{
          marginTop: size === "splash" ? 7 : 3,
          fontSize: driverSize,
          fontWeight: 600,
          letterSpacing: "0.28em",
          color: driverColor,
        }}
      >
        DRIVER
      </div>
    </div>
  );
}

function SplashPhone() {
  return (
    <PhoneFrame label="Splash · Midnight" status="midnight">
      <div
        style={{
          flex: 1,
          background: MIDNIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 22,
        }}
      >
        <div style={{ width: 36, height: 2, background: DRIVER_BLUE, marginBottom: 14 }} />
        <Wordmark size="splash" />
        <div style={{ marginTop: 18, fontSize: 12, lineHeight: 1.4, color: "rgba(255,255,255,0.85)", textAlign: "center" }}>
          Know your vehicle before you move.
        </div>
        <div style={{ marginTop: 24, fontSize: 10, color: DRIVER_SKY }}>Checking duty status…</div>
      </div>
    </PhoneFrame>
  );
}

function HomePhone() {
  return (
    <PhoneFrame label="Home · status strip + hub tabs">
      <div style={{ padding: "10px 12px", background: WARN, color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: "#FFFFFF" }} />
        <span style={{ flex: 1, fontSize: 11, fontWeight: 800 }}>Vehicle check overdue</span>
        <span>›</span>
      </div>
      <div style={{ background: "#FFFFFF", padding: "12px 14px 10px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Wordmark onDark={false} size="quiet" />
          <div style={{ display: "flex", gap: 6 }}>
            <RoundBtn>
              <SvgIcon size={14} color={MIDNIGHT}>
                <path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4Z" />
                <path d="m9.5 12 1.7 1.7L14.8 10" />
              </SvgIcon>
            </RoundBtn>
            <RoundBtn>
              <SvgIcon size={14} color={MIDNIGHT}>
                <path d="M20 21a8 8 0 1 0-16 0" />
                <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              </SvgIcon>
            </RoundBtn>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 20, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, color: MIDNIGHT }}>
          Vehicle check overdue
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: MUTED, lineHeight: 1.35 }}>
          Complete the walkaround before you can open the journey.
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "10px 12px" }}>
        <div style={{ height: 96, borderRadius: 14, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          <MapSurface label="Route 14A preview" />
        </div>
        <div style={{ marginTop: 10, background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: DRIVER_BLUE }}>
            Next action
          </div>
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 800, color: MIDNIGHT }}>Start vehicle check</div>
          <div style={{ marginTop: 4, fontSize: 10, color: MUTED }}>LX24 ABC · Bay D03 · 06:45</div>
          <div
            style={{
              marginTop: 10,
              background: MIDNIGHT,
              color: "#FFFFFF",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 10,
              fontWeight: 800,
              textAlign: "center",
              letterSpacing: "0.12em",
            }}
          >
            START VEHICLE CHECK
          </div>
        </div>
        <div style={{ marginTop: 10, background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 10px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MIDNIGHT }}>Messages</div>
          <div style={{ marginTop: 2, fontSize: 9, color: MUTED }}>2 unread from Operations</div>
        </div>
      </div>
      <HubBottomNav active="Home" />
    </PhoneFrame>
  );
}

function DutiesPhone() {
  return (
    <PhoneFrame label="Duties · map workspace + sheet">
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#E8EEF4" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <MapSurface label="Duty map" />
        </div>
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            right: 10,
            display: "grid",
            gridTemplateColumns: "34px 1fr 34px",
            gap: 8,
            zIndex: 2,
          }}
        >
          <RoundBtn>
            <SvgIcon size={14} color={MIDNIGHT}>
              <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
            </SvgIcon>
          </RoundBtn>
          <div style={{ background: MIDNIGHT, color: "#FFFFFF", borderRadius: 99, padding: "7px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 800 }}>Route 14A</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.7)" }}>LX24 ABC · Pre-duty</div>
          </div>
          <RoundBtn>
            <SvgIcon size={14} color={MIDNIGHT}>
              <path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4Z" />
              <path d="m9.5 12 1.7 1.7L14.8 10" />
            </SvgIcon>
          </RoundBtn>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            background: "#FFFFFF",
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderTop: `1px solid ${BORDER}`,
            padding: "8px 12px 12px",
            zIndex: 2,
          }}
        >
          <div style={{ width: 36, height: 3, borderRadius: 99, background: "#D0D5DD", margin: "0 auto 8px" }} />
          <div style={{ textAlign: "center", fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>
            Vehicle check
          </div>
          <div style={{ marginTop: 2, textAlign: "center", fontSize: 14, fontWeight: 800, color: MIDNIGHT }}>Complete walkaround</div>
          <div style={{ marginTop: 8, textAlign: "center", fontSize: 10, color: MUTED }}>Riverside · 06:45–14:20 · Bay D03</div>
          <div
            style={{
              marginTop: 10,
              background: MIDNIGHT,
              color: "#FFFFFF",
              borderRadius: 12,
              padding: "10px",
              textAlign: "center",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.12em",
            }}
          >
            OPEN CHECKS
          </div>
        </div>
      </div>
      <HubBottomNav active="Duties" />
    </PhoneFrame>
  );
}

function ChecksPhone() {
  return (
    <PhoneFrame label="Checks · zones + sheet">
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#E8EEF4" }}>
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            right: 10,
            display: "grid",
            gridTemplateColumns: "34px 1fr 34px",
            gap: 8,
            zIndex: 2,
          }}
        >
          <RoundBtn>
            <SvgIcon size={14} color={MIDNIGHT}>
              <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
            </SvgIcon>
          </RoundBtn>
          <div style={{ background: MIDNIGHT, color: "#FFFFFF", borderRadius: 99, padding: "7px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 800 }}>LX24 ABC</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.7)" }}>Check required</div>
          </div>
          <RoundBtn>
            <SvgIcon size={14} color={MIDNIGHT}>
              <path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4Z" />
              <path d="m9.5 12 1.7 1.7L14.8 10" />
            </SvgIcon>
          </RoundBtn>
        </div>
        <div
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            top: 64,
            height: 120,
            borderRadius: 14,
            border: `2px solid ${DRIVER_BLUE}`,
            background: SOFT,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: DRIVER_BLUE }}>Bus outline · tap zones</div>
          <div style={{ display: "flex", gap: 5 }}>
            {["Front", "Near", "Off", "Rear"].map(z => (
              <div key={z} style={{ padding: "4px 6px", borderRadius: 8, background: "#FFFFFF", border: `1px solid ${BORDER}`, fontSize: 8, fontWeight: 700 }}>
                {z}
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            background: "#FFFFFF",
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderTop: `1px solid ${BORDER}`,
            padding: "8px 12px 12px",
          }}
        >
          <div style={{ width: 36, height: 3, borderRadius: 99, background: "#D0D5DD", margin: "0 auto 8px" }} />
          <div style={{ textAlign: "center", fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>
            Vehicle checks
          </div>
          <div style={{ marginTop: 2, textAlign: "center", fontSize: 14, fontWeight: 800, color: MIDNIGHT }}>Verify vehicle</div>
          <div
            style={{
              marginTop: 10,
              background: MIDNIGHT,
              color: "#FFFFFF",
              borderRadius: 12,
              padding: "10px",
              textAlign: "center",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.12em",
            }}
          >
            START WALKAROUND
          </div>
        </div>
      </div>
      <HubBottomNav active="Checks" />
    </PhoneFrame>
  );
}

function MessagesPhone() {
  return (
    <PhoneFrame label="Messages · thread + sheet">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 10px 0", display: "grid", gridTemplateColumns: "34px 1fr 34px", gap: 8 }}>
          <RoundBtn>
            <SvgIcon size={14} color={MIDNIGHT}>
              <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
            </SvgIcon>
          </RoundBtn>
          <div style={{ background: MIDNIGHT, color: "#FFFFFF", borderRadius: 99, padding: "7px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 800 }}>Operations</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.7)" }}>3 unread · Duty 14A</div>
          </div>
          <RoundBtn>
            <SvgIcon size={14} color={MIDNIGHT}>
              <path d="M4 5h16v11H8l-4 4V5Z" />
            </SvgIcon>
          </RoundBtn>
        </div>
        <div style={{ flex: 1, padding: "12px 14px", overflow: "auto" }}>
          <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "8px 10px", fontSize: 10, maxWidth: "90%", lineHeight: 1.4 }}>
            Entrance changed at Oakfield. Use the east gate.
          </div>
          <div style={{ marginTop: 8, marginLeft: "auto", background: MIDNIGHT, color: "#FFFFFF", borderRadius: 14, padding: "8px 10px", fontSize: 10, maxWidth: "78%", lineHeight: 1.4 }}>
            Understood — approaching east gate.
          </div>
          <div style={{ marginTop: 8, background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "8px 10px", fontSize: 10, maxWidth: "90%", lineHeight: 1.4 }}>
            Defect on LX24 ABC acknowledged. Vehicle remains available pending walkaround.
          </div>
        </div>
        <div style={{ margin: "0 10px 10px", padding: 10, background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 14 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1, padding: "8px 4px", textAlign: "center", fontSize: 8, fontWeight: 700, color: "#FFFFFF", background: MIDNIGHT, borderRadius: 8 }}>
              Acknowledge
            </div>
            <div style={{ flex: 1, padding: "8px 4px", textAlign: "center", fontSize: 8, fontWeight: 700, color: DRIVER_BLUE, background: SOFT, borderRadius: 8 }}>
              Reply
            </div>
          </div>
        </div>
      </div>
      <HubBottomNav active="Messages" />
    </PhoneFrame>
  );
}

function MorePhone() {
  return (
    <PhoneFrame label="More · hub (profile → Account)">
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "#F3F4F6" }}>
        <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${BORDER}`, padding: "14px 12px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 24, fontWeight: 850, letterSpacing: "-0.04em", color: MIDNIGHT }}>More</div>
            <div style={{ width: 34, height: 34, borderRadius: 99, background: "#F3F4F6", display: "grid", placeItems: "center", fontSize: 14 }}>?</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 10, alignItems: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 99, background: MIDNIGHT, color: "#FFFFFF", display: "grid", placeItems: "center", fontWeight: 850, fontSize: 14 }}>SP</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 850 }}>Samira Patel</div>
              <div style={{ marginTop: 3, fontSize: 9, color: MUTED, lineHeight: 1.3 }}>Approved PSV driver<br />Northwest Transport</div>
            </div>
            <span style={{ color: "#9CA3AF", fontSize: 20 }}>›</span>
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {["Documents", "Sync", "Support"].map((label) => (
              <div key={label} style={{ borderRadius: 12, background: "#F3F4F6", padding: "8px 6px", minHeight: 62 }}>
                <div style={{ fontSize: 10, fontWeight: 800 }}>{label}</div>
                <div style={{ marginTop: 2, fontSize: 8, color: MUTED }}>{label === "Documents" ? "2 attention" : "Ready"}</div>
              </div>
            ))}
          </div>
        </div>
        {[
          { title: "Driver", rows: ["Account", "Declarations", "Training"] },
          { title: "App", rows: ["App settings", "Offline sync"] },
        ].map((section) => (
          <div key={section.title} style={{ marginTop: 10 }}>
            <div style={{ padding: "0 12px 6px", fontSize: 9, fontWeight: 850, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>{section.title}</div>
            <div style={{ background: "#FFFFFF", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
              {section.rows.map((row) => (
                <div key={row} style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: MIDNIGHT }}>{row}</div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ margin: "12px", textAlign: "center", fontSize: 12, fontWeight: 800, color: "#D92D20" }}>Sign out</div>
      </div>
      <HubBottomNav active="More" />
    </PhoneFrame>
  );
}

function FocusedPhone() {
  return (
    <PhoneFrame label="Focused detail · Midnight chrome, no hub tabs" status="midnight">
      <div style={{ padding: "10px 14px", background: MIDNIGHT, color: "#FFFFFF", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Wordmark size="header" />
          <div style={{ fontSize: 9, color: DRIVER_SKY }}>Synced · 06:14</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: DRIVER_BLUE }}>← More</div>
        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: MIDNIGHT }}>Security and biometrics</div>
        <div style={{ marginTop: 8, fontSize: 11, color: MUTED, lineHeight: 1.4 }}>
          Hub tabs hidden — Back to More only.
        </div>
        <div style={{ marginTop: 14, padding: 12, background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MIDNIGHT }}>Face ID</div>
          <div style={{ marginTop: 4, fontSize: 10, color: MUTED }}>Enabled for sign-in and unlock</div>
        </div>
      </div>
    </PhoneFrame>
  );
}

export default function VeyvioDriverBrandPhoneCanvas() {
  return (
    <Stack gap={24} style={{ padding: 8 }}>
      <Stack gap={8}>
        <H1>Veyvio Driver — phone brand (Jul 2026 hubs)</H1>
        <Text tone="secondary">
          Working reference for all primary hubs: light OS chrome, SVG tab icons, status strips, map/sheet
          workspaces. Midnight reserved for splash and focused detail.
        </Text>
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          <Pill tone="info" size="sm">
            Midnight #0B1526
          </Pill>
          <Pill tone="info" size="sm">
            Driver Blue #2F6BFF
          </Pill>
          <Pill tone="info" size="sm">
            Soft #EFF6FF
          </Pill>
          <Pill tone="neutral" size="sm">
            Hub tabs: light · hub-only
          </Pill>
        </Row>
      </Stack>

      <Callout tone="info" title="How to use this canvas">
        Use these phones as the source of truth while iterating each hub. Live app screens:
        CleanHomeScreen · DutiesWorkspaceScreen · ChecksWorkspaceScreen · MessagesWorkspaceScreen · MoreHub.
        Say which hub to refine next and we update both canvas and product UI together.
      </Callout>

      <Grid columns={3} gap={16}>
        <Stat value="5" label="Primary hubs with bottom nav" tone="info" />
        <Stat value="Light" label="Tab bar surface (not Midnight)" />
        <Stat value="Hidden" label="Tabs on focused workflows" tone="warning" />
      </Grid>

      <H2>Primary hubs</H2>
      <Grid columns={3} gap={16}>
        <Card>
          <CardHeader trailing={<Pill size="sm">Launch</Pill>}>Splash</CardHeader>
          <CardBody>
            <SplashPhone />
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm">Hub</Pill>}>Home</CardHeader>
          <CardBody>
            <HomePhone />
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm">Hub</Pill>}>Duties</CardHeader>
          <CardBody>
            <DutiesPhone />
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm">Hub</Pill>}>Checks</CardHeader>
          <CardBody>
            <ChecksPhone />
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm">Hub</Pill>}>Messages</CardHeader>
          <CardBody>
            <MessagesPhone />
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm">Hub</Pill>}>More</CardHeader>
          <CardBody>
            <MorePhone />
          </CardBody>
        </Card>
      </Grid>

      <H2>Focused workflow (tabs hidden)</H2>
      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>Security · Midnight chrome</CardHeader>
          <CardBody>
            <FocusedPhone />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Policy</CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text size="small">1. Light hub tabs only on `/` · `/trips` · `/checks` · `/messages` · `/more`</Text>
              <Text size="small">2. Home/More: status strip first, no Midnight AppShell header</Text>
              <Text size="small">3. Duties/Checks/Messages: canvas + bottom sheet above shared light tabs</Text>
              <Text size="small">4. Focused routes: Midnight chrome returns, hub tabs gone</Text>
              <Divider />
              <Text size="small" tone="secondary">
                Brand foundation: Midnight for chrome/splash · Driver Blue for hub accents · Soft fill for
                active tab.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>
    </Stack>
  );
}
