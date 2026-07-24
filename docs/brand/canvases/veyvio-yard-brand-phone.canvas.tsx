import type { ReactNode } from "react";
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

/** Brand hexes — matches shipped `src/styles.css` + live Yard UI (Jul 2026). */
const MIDNIGHT = "#0B1526";
const COMMAND_BLUE = "#2F6BFF";
const YARD_TEAL = "#12A89D";
const YARD_SKY = "#A2E9FF";
const TEAL_SOFT = "#DDF7F3";
const BLUE_SOFT = "#EFF6FF";
const INK = "#101828";
const PAGE_BG = "#F2F4F7";
const SURFACE = "#FFFFFF";
const NAV_ACTIVE = "#F2F4F7";
const OK = "#178C4B";
const WARN = "#D97706";
const VOR = "#B42318";
const BORDER = "#E4E7EC";
const MUTED = "#667085";
const ICON_MUTED = "#98A2B3";

type HubTab = "Home" | "Checks" | "Vehicles" | "Yard" | "More";

function SvgIcon({
  children,
  size = 16,
  color = "currentColor",
}: {
  children: ReactNode;
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
  if (tab === "Checks") {
    return (
      <SvgIcon color={color} size={18}>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1H9V5Z" />
        <path d="m9 14 2 2 4-4" />
      </SvgIcon>
    );
  }
  if (tab === "Vehicles") {
    return (
      <SvgIcon color={color} size={18}>
        <path d="M5 17h14v-5l-1.5-4.5A2 2 0 0 0 15.6 6H8.4a2 2 0 0 0-1.9 1.5L5 12v5Z" />
        <path d="M7 17v2M17 17v2M5 12h14" />
      </SvgIcon>
    );
  }
  if (tab === "Yard") {
    return (
      <SvgIcon color={color} size={18}>
        <path d="M9 20 3 10.5 9 4l6 4.5 6-4.5L15 10.5 9 20Z" />
        <path d="M9 10.5h6" />
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
  children: ReactNode;
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
  const tabs: HubTab[] = ["Home", "Checks", "Vehicles", "Yard", "More"];
  return (
    <div
      style={{
        marginTop: "auto",
        background: SURFACE,
        borderTop: `1px solid ${BORDER}`,
        boxShadow: "0 -4px 20px rgba(16,24,40,0.06)",
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        padding: "6px 4px 12px",
        flexShrink: 0,
      }}
    >
      {tabs.map(label => {
        const isActive = label === active;
        const color = isActive ? INK : MUTED;
        const iconColor = isActive ? INK : ICON_MUTED;
        return (
          <div
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              color,
              background: isActive ? NAV_ACTIVE : "transparent",
              borderRadius: 12,
              padding: "6px 2px",
            }}
          >
            <TabGlyph tab={label} color={iconColor} />
            <div style={{ fontSize: 8, fontWeight: 600 }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

function LightAppHeader({ depot = "BCT Main Depot" }: { depot?: string }) {
  return (
    <div
      style={{
        background: SURFACE,
        borderBottom: `1px solid ${BORDER}`,
        boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px 10px",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 12,
              background: INK,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 9,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            VY
          </div>
          <div style={{ minWidth: 0 }}>
            <Wordmark onDark={false} size="header" />
            <div style={{ fontSize: 9, color: MUTED, fontWeight: 500, marginTop: 2 }}>{depot}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: INK,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 10,
            }}
          >
            ⌖
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: `1px solid ${BORDER}`,
              background: SURFACE,
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 6,
                height: 6,
                borderRadius: 999,
                background: OK,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


function Wordmark({
  onDark = true,
  size = "splash",
  align = "left",
}: {
  onDark?: boolean;
  size?: "splash" | "header" | "quiet";
  align?: "left" | "center";
}) {
  const veyvioSize = size === "splash" ? 26 : size === "header" ? 13 : 11;
  const yardSize = size === "splash" ? 12 : size === "header" ? 8 : 7;
  const veyvioColor = onDark ? "#FFFFFF" : MIDNIGHT;
  const yardColor = onDark ? YARD_SKY : COMMAND_BLUE;

  return (
    <div style={{ textAlign: align }}>
      <div style={{ fontSize: veyvioSize, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, color: veyvioColor }}>
        VEYVIO
      </div>
      <div
        style={{
          marginTop: size === "splash" ? 7 : 3,
          fontSize: yardSize,
          fontWeight: 600,
          letterSpacing: "0.28em",
          color: yardColor,
        }}
      >
        YARD
      </div>
    </div>
  );
}

function SplashStatusRow({ label }: { label: string }) {
  return (
    <div
      style={{
        marginTop: 28,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11,
        color: "rgba(162,233,255,0.9)",
        position: "relative",
      }}
    >
      <span style={{ position: "relative", display: "flex", width: 8, height: 8, flexShrink: 0 }} aria-hidden>
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background: "rgba(162,233,255,0.35)",
          }}
        />
        <span
          style={{
            position: "relative",
            width: 8,
            height: 8,
            borderRadius: 999,
            background: COMMAND_BLUE,
          }}
        />
      </span>
      {label}
    </div>
  );
}

function SplashPhone() {
  return (
    <PhoneFrame label="Splash · Midnight + Command Blue ping" status="midnight">
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: MIDNIGHT,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            background: [
              "radial-gradient(ellipse 90% 55% at 50% 30%, rgba(18,168,157,0.22), transparent 55%)",
              "radial-gradient(ellipse 80% 45% at 50% 100%, rgba(162,233,255,0.10), transparent 45%)",
            ].join(", "),
          }}
          aria-hidden
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 22px",
            position: "relative",
          }}
        >
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              top: "8%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 200,
              height: 140,
              borderRadius: 999,
              background: "rgba(18,168,157,0.2)",
              filter: "blur(32px)",
            }}
            aria-hidden
          />
          <div
            style={{
              position: "relative",
              width: 48,
              height: 2,
              borderRadius: 999,
              background: COMMAND_BLUE,
              marginBottom: 16,
              boxShadow: "0 0 20px rgba(47,107,255,0.45)",
            }}
            aria-hidden
          />
          <div style={{ position: "relative" }}>
            <Wordmark size="splash" align="center" />
          </div>
          <div
            style={{
              marginTop: 24,
              maxWidth: 210,
              fontSize: 14,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.85)",
              textAlign: "center",
              position: "relative",
            }}
          >
            Every vehicle. Ready and accounted for.
          </div>
          <SplashStatusRow label="Checking yard status…" />
        </div>
        <div
          style={{
            flexShrink: 0,
            padding: "0 22px 18px",
            textAlign: "center",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
            position: "relative",
          }}
        >
          Veyvio
        </div>
      </div>
    </PhoneFrame>
  );
}

function HomePhone() {
  return (
    <PhoneFrame label="Home · Depot board dashboard">
      <LightAppHeader />
      <div style={{ flex: 1, overflow: "hidden", padding: "10px 12px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: INK }}>Depot board</div>
          <div style={{ fontSize: 8, fontWeight: 700, color: COMMAND_BLUE }}>Add task</div>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 6, overflow: "hidden" }}>
          <KpiMini label="Available" value="38" />
          <KpiMini label="Pending" value="4" />
          <KpiMini label="VOR" value="2" tone="vor" />
        </div>
        <div style={{ marginTop: 10, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: MUTED, textTransform: "uppercase" }}>
          Needs attention · 3 actions
        </div>
        <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
          <AttentionChip reg="2 VOR" label="Vehicles off road" tone="vor" />
          <AttentionChip reg="3 checks" label="Yard checks due" tone="warn" />
        </div>
        <div style={{ marginTop: 10, border: `1px solid ${BORDER}`, background: SURFACE, borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, textTransform: "uppercase" }}>Depot readiness</div>
          <div style={{ marginTop: 6, height: 36, borderRadius: 4, background: BLUE_SOFT, border: `1px solid ${BORDER}` }} />
        </div>
      </div>
      <HubBottomNav active="Home" />
    </PhoneFrame>
  );
}

function KpiMini({ label, value, tone }: { label: string; value: string; tone?: "vor" }) {
  return (
    <div style={{ minWidth: 72, border: `1px solid ${BORDER}`, background: SURFACE, borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: MUTED, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 16, fontWeight: 800, color: tone === "vor" ? VOR : INK }}>{value}</div>
    </div>
  );
}

function AttentionChip({
  reg,
  label,
  tone,
}: {
  reg: string;
  label: string;
  tone: "warn" | "vor";
}) {
  const color = tone === "vor" ? VOR : WARN;
  return (
    <div
      style={{
        minWidth: 110,
        border: `1px solid ${color}33`,
        background: "#fff",
        borderRadius: 4,
        padding: "8px 10px",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{reg}</div>
      <div style={{ marginTop: 2, fontSize: 9, fontWeight: 700, color }}>{label}</div>
    </div>
  );
}

function ChecksPhone() {
  return (
    <PhoneFrame label="Checks · awaiting queue">
      <LightAppHeader />
      <div style={{ flex: 1, padding: "12px 12px 0", overflow: "hidden" }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Awaiting Check · 2</div>
        <VehicleRow reg="BU25 ABC" bay="P04" action="Start check" />
        <VehicleRow reg="MN74 QRS" bay="W02" action="Start check" />
        <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Recent checks
        </div>
        <div style={{ marginTop: 6, border: `1px solid ${BORDER}`, background: "#fff", borderRadius: 4, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>YX74 KLM</span>
            <span style={{ color: OK, fontWeight: 700 }}>Cleared</span>
          </div>
        </div>
      </div>
      <HubBottomNav active="Checks" />
    </PhoneFrame>
  );
}

function VehicleRow({ reg, bay, action }: { reg: string; bay: string; action: string }) {
  return (
    <div
      style={{
        marginTop: 8,
        border: `1px solid ${BORDER}`,
        background: "#fff",
        borderRadius: 4,
        padding: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{reg}</div>
        <div style={{ fontSize: 10, color: MUTED }}>{bay}</div>
      </div>
      <div
        style={{
          marginTop: 8,
          background: INK,
          color: "#fff",
          textAlign: "center",
          fontSize: 10,
          fontWeight: 800,
          padding: "8px 0",
          borderRadius: 4,
        }}
      >
        {action}
      </div>
    </div>
  );
}

function VehiclesPhone() {
  return (
    <PhoneFrame label="Vehicles · inventory">
      <LightAppHeader />
      <div style={{ flex: 1, padding: "12px 12px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Vehicles · 48</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: YARD_TEAL, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Yard map →
          </div>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
          <FilterPill label="All zones" active />
          <FilterPill label="VOR" />
          <FilterPill label="Check due" />
        </div>
        <VehicleRow reg="BU25 ABC" bay="Parking · P04" action="Open record" />
        <div
          style={{
            marginTop: 8,
            border: `1px solid ${BORDER}`,
            background: "#fff",
            borderRadius: 4,
            padding: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>YX74 KLM</div>
          <div style={{ marginTop: 2, fontSize: 10, color: VOR, fontWeight: 700 }}>VOR · Workshop bay W01</div>
        </div>
      </div>
      <HubBottomNav active="Vehicles" />
    </PhoneFrame>
  );
}

function FilterPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        padding: "5px 8px",
        borderRadius: 99,
        border: `1px solid ${active ? COMMAND_BLUE : BORDER}`,
        background: active ? BLUE_SOFT : "#fff",
        color: active ? MIDNIGHT : MUTED,
      }}
    >
      {label}
    </div>
  );
}

function YardMapPhone() {
  return (
    <PhoneFrame label="Yard · LiveYardMap (BCT spatial)">
      <LightAppHeader />
      <div style={{ flex: 1, padding: "10px 12px 0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <MapToggle label="Map" active />
          <MapToggle label="List" />
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, fontSize: 9, fontWeight: 700 }}>
          <span style={{ color: OK }}>● Ready 18</span>
          <span style={{ color: WARN }}>● Attention 3</span>
          <span style={{ color: VOR }}>● VOR 2</span>
        </div>
        <div
          style={{
            marginTop: 8,
            flex: 1,
            minHeight: 210,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            background: PAGE_BG,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 12, border: `1px dashed ${BORDER}`, borderRadius: 6, background: "#EEF2F6" }} />
          {["A01", "A02", "A03", "B01", "B02", "B03"].map((bay, i) => (
            <div
              key={bay}
              style={{
                position: "absolute",
                left: 18 + (i % 3) * 72,
                top: 28 + Math.floor(i / 3) * 52,
                width: 58,
                height: 34,
                borderRadius: 4,
                border: `2px solid ${i === 1 ? YARD_TEAL : BORDER}`,
                background: i === 4 ? "#FEF3C7" : i === 5 ? "#FEE4E2" : SURFACE,
                fontSize: 8,
                fontWeight: 800,
                display: "grid",
                placeItems: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {bay}
            </div>
          ))}
          <div style={{ position: "absolute", right: 8, top: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {["+", "−", "◎"].map(btn => (
              <div key={btn} style={{ width: 24, height: 24, borderRadius: 6, background: SURFACE, border: `1px solid ${BORDER}`, display: "grid", placeItems: "center", fontSize: 10, boxShadow: "0 1px 2px rgba(16,24,40,0.08)" }}>{btn}</div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 6, fontSize: 9, color: MUTED }}>Tap bay · realtime vehicle locations</div>
      </div>
      <HubBottomNav active="Yard" />
    </PhoneFrame>
  );
}

function MapToggle({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: "center",
        fontSize: 10,
        fontWeight: 700,
        padding: "6px 0",
        borderRadius: 6,
        background: active ? SURFACE : "transparent",
        border: `1px solid ${active ? BORDER : "transparent"}`,
        color: active ? INK : MUTED,
        boxShadow: active ? "0 1px 2px rgba(16,24,40,0.06)" : "none",
      }}
    >
      {label}
    </div>
  );
}

function BayDot({ tone }: { tone: "ok" | "warn" | "vor" }) {
  const bg = tone === "ok" ? OK : tone === "warn" ? WARN : VOR;
  return <span style={{ width: 14, height: 14, borderRadius: 3, background: bg, opacity: 0.85 }} />;
}

function MorePhone() {
  return (
    <PhoneFrame label="More · workflow + operations hub">
      <LightAppHeader />
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "10px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Wordmark onDark={false} size="quiet" />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: COMMAND_BLUE, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Depot
            </div>
            <div style={{ fontSize: 10, fontWeight: 700 }}>BCT Main Depot</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: "10px 12px 0", overflow: "hidden" }}>
        <div style={{ border: `1px solid ${BORDER}`, background: SURFACE, borderRadius: 8, padding: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: INK, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12 }}>JM</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>Jordan Miller</div>
            <div style={{ fontSize: 9, color: MUTED }}>Yard supervisor · BCT</div>
          </div>
        </div>
        <SectionLabel text="Workflow" />
        <MoreRow label="Tasks" />
        <MoreRow label="Driver messages" />
        <MoreRow label="Inspections" />
        <SectionLabel text="Operations" />
        <MoreRow label="Arrivals" />
        <MoreRow label="VOR Board" />
        <MoreRow label="Sync queue" />
      </div>
      <HubBottomNav active="More" />
    </PhoneFrame>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ marginTop: 10, marginBottom: 4, fontSize: 8, fontWeight: 700, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase" }}>
      {text}
    </div>
  );
}

function MoreRow({ label }: { label: string }) {
  return (
    <div
      style={{
        marginTop: 8,
        border: `1px solid ${BORDER}`,
        background: "#fff",
        borderRadius: 4,
        padding: "12px 12px",
        fontSize: 12,
        fontWeight: 700,
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>{label}</span>
      <span style={{ color: MUTED }}>›</span>
    </div>
  );
}

function FocusedVorPhone() {
  return (
    <PhoneFrame label="VOR case · safety decision" status="light">
      <div style={{ background: MIDNIGHT, color: "#fff", flexShrink: 0 }}>
        <div style={{ height: 3, background: VOR, margin: "0" }} />
        <div style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>← VOR board</div>
          <div style={{ marginTop: 4, fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>YX74 KLM</div>
          <div style={{ marginTop: 2, fontSize: 11, color: YARD_SKY }}>VOR-2026-0142</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 12, background: PAGE_BG }}>
        <div style={{ borderLeft: `4px solid ${VOR}`, border: `1px solid ${BORDER}`, background: "#fff", borderRadius: 4, padding: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: VOR, textTransform: "uppercase", letterSpacing: "0.1em" }}>Open · Safety-critical</div>
          <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.4 }}>Rear nearside brake light inoperative. Vehicle cannot enter service.</div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: WARN, fontWeight: 700 }}>Return to service blocked</div>
        <div style={{ marginTop: 12, background: MIDNIGHT, color: "#fff", textAlign: "center", fontSize: 10, fontWeight: 800, padding: "10px 0", borderRadius: 4 }}>
          Advance lifecycle
        </div>
      </div>
    </PhoneFrame>
  );
}

function FocusedDamagePhone() {
  return (
    <PhoneFrame label="Damage capture · evidence" status="light">
      <div style={{ background: MIDNIGHT, color: "#fff", flexShrink: 0 }}>
        <div style={{ height: 3, background: YARD_TEAL, margin: "0" }} />
        <div style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>← Condition</div>
          <div style={{ marginTop: 4, fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>BU25 ABC</div>
          <div style={{ marginTop: 2, fontSize: 11, color: YARD_SKY }}>Record damage report</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 12, background: PAGE_BG }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>Nearside rear panel</div>
        <div style={{ marginTop: 6, height: 90, border: `1px solid ${BORDER}`, borderRadius: 4, background: "#E8EEF2", display: "grid", placeItems: "center", fontSize: 9, color: MUTED }}>
          Body zone diagram
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: MUTED }}>Add photo evidence · 0 attached</div>
        <div style={{ marginTop: 12, background: MIDNIGHT, color: "#fff", textAlign: "center", fontSize: 10, fontWeight: 800, padding: "10px 0", borderRadius: 4 }}>
          Record damage report
        </div>
      </div>
    </PhoneFrame>
  );
}

function FocusedPhone() {
  return (
    <PhoneFrame label="Focused · yard check (Midnight chrome)" status="midnight">
      <div style={{ background: MIDNIGHT, color: "#fff", padding: "10px 12px", flexShrink: 0 }}>
        <div style={{ height: 3, background: YARD_TEAL, margin: "-10px -12px 10px" }} />
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>← BU25 ABC</div>
        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>BU25 ABC</div>
        <div style={{ marginTop: 2, fontSize: 11, color: YARD_SKY }}>Yard check · Section 4 of 29</div>
      </div>
      <div style={{ flex: 1, padding: 12, background: PAGE_BG }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>Lights — rear</div>
        <div style={{ marginTop: 6, fontSize: 11, color: MUTED }}>Confirm both rear lamps illuminate correctly.</div>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <CheckChoice label="Satisfactory" active />
          <CheckChoice label="Defect found" />
          <CheckChoice label="Not applicable" />
        </div>
      </div>
    </PhoneFrame>
  );
}

function CheckChoice({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      style={{
        border: `1px solid ${active ? COMMAND_BLUE : BORDER}`,
        background: active ? BLUE_SOFT : "#fff",
        borderRadius: 4,
        padding: "12px 14px",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
}

type RoutePageSpec = {
  title: string;
  route: string;
  summary: string;
  details: [string, string];
  action?: string;
  tone?: "neutral" | "ok" | "warn" | "vor";
  active?: HubTab;
  surface?: "public" | "app";
};

type RoutePageGroup = {
  heading: string;
  description: string;
  pages: RoutePageSpec[];
};

const MISSING_PAGE_GROUPS: RoutePageGroup[] = [
  {
    heading: "F · Access, security & setup",
    description: "The complete path from first launch to an authorised, depot-scoped offline session.",
    pages: [
      {
        title: "Welcome · 3 steps",
        route: "/welcome/$step",
        summary: "Introduce yard control, safety and accountability before sign-in.",
        details: ["Step 1 of 3", "Control the yard with confidence"],
        action: "Continue",
        surface: "public",
      },
      {
        title: "Sign in",
        route: "/sign-in",
        summary: "Secure access for authorised transport teams.",
        details: ["Work email", "j.miller@northwest-transport.co.uk"],
        action: "Sign in",
        surface: "public",
      },
      {
        title: "Verify identity",
        route: "/mfa",
        summary: "Confirm the user with a six-digit authenticator code.",
        details: ["Authenticator code", "000 000"],
        action: "Verify",
        surface: "public",
      },
      {
        title: "Select company",
        route: "/company-select",
        summary: "Choose the operator being managed for this session.",
        details: ["Northwest Transport", "Yard manager · Active"],
        action: "Use company",
        surface: "public",
      },
      {
        title: "Select depot",
        route: "/depot-select",
        summary: "Scope operational records to the correct yard.",
        details: ["North Bolton (B3)", "42 on site · 2 VOR · 5 checks due"],
        action: "Use depot",
        surface: "public",
      },
      {
        title: "Initial sync",
        route: "/initial-sync",
        summary: "Load the depot record for reliable offline operation.",
        details: ["72% complete", "Vehicles · bays · defects · permissions"],
        surface: "public",
      },
      {
        title: "Biometric unlock",
        route: "/biometric-unlock",
        summary: "Return securely with device biometrics or the app PIN.",
        details: ["Device recognised", "Jordan Miller · North Bolton"],
        action: "Unlock",
        surface: "public",
      },
      {
        title: "Account restricted",
        route: "/account-restricted",
        summary: "Explain why access is blocked and who can restore it.",
        details: ["Access suspended", "Contact your transport administrator"],
        tone: "vor",
        surface: "public",
      },
      {
        title: "Update required",
        route: "/update-required",
        summary: "Prevent operation on an unsupported application version.",
        details: ["Version no longer supported", "Update before continuing"],
        action: "Update Veyvio Yard",
        tone: "warn",
        surface: "public",
      },
    ],
  },
  {
    heading: "G · Depot operations",
    description: "Operational pages reached from Home, Yard and More.",
    pages: [
      {
        title: "Arrivals",
        route: "/arrivals",
        summary: "Record returning vehicles and assign a trustworthy yard position.",
        details: ["OP20 IUY", "Returning from charter · bay required"],
        action: "Record arrival",
        active: "Yard",
        tone: "warn",
      },
      {
        title: "Departure line",
        route: "/departure-line",
        summary: "Show ready and blocked departures before release.",
        details: ["MX72 BVK · R420", "06:15 · Ready for service"],
        action: "Release vehicle",
        active: "Yard",
        tone: "ok",
      },
      {
        title: "Movement log",
        route: "/movements",
        summary: "Keep every bay change attributable and time stamped.",
        details: ["MX72 BVK", "A09 → D01 · J. Miller · 05:12"],
        active: "Yard",
      },
      {
        title: "Shift & handover",
        route: "/shift",
        summary: "Pass unresolved exceptions and depot context to the next shift.",
        details: ["Outgoing handover", "2 VOR · 4 blocked trips · sync clear"],
        action: "Complete handover",
        active: "More",
        tone: "warn",
      },
      {
        title: "Scan",
        route: "/scan",
        summary: "Open a vehicle, defect, task or bay record from its code.",
        details: ["Scanner ready", "Vehicle · defect · task · bay"],
        action: "Open camera scanner",
        active: "Yard",
      },
      {
        title: "Tasks",
        route: "/tasks",
        summary: "Put urgent safety work before routine depot activity.",
        details: ["Investigate brake defect", "WP19 KLD · urgent · due 06:00"],
        action: "Open task",
        active: "More",
        tone: "vor",
      },
      {
        title: "Inspections",
        route: "/inspections",
        summary: "Bring damage review, baselines and repair verification together.",
        details: ["Priority queues", "3 damage review · 1 repair verify"],
        active: "More",
        tone: "warn",
      },
      {
        title: "Defects",
        route: "/defects",
        summary: "Keep open safety defects visible until resolved.",
        details: ["WP19 KLD · Brakes", "Safety-critical · vehicle off road"],
        action: "Open defect",
        active: "More",
        tone: "vor",
      },
      {
        title: "VOR board",
        route: "/vor",
        summary: "Control every vehicle-off-road case through its lifecycle.",
        details: ["2 open cases", "1 confirmed · 1 awaiting recovery"],
        action: "Open VOR case",
        active: "More",
        tone: "vor",
      },
    ],
  },
  {
    heading: "H · Auditable records",
    description: "Completed work and linked safety records remain available as evidence.",
    pages: [
      {
        title: "Check record",
        route: "/checks/$checkId",
        summary: "Review the completed check, outcome and linked defect.",
        details: ["YCHK-0142 · YN22 ZTM", "28 passed · 1 defect · J. Miller"],
        active: "Checks",
        tone: "warn",
      },
      {
        title: "Task detail",
        route: "/tasks/$taskId",
        summary: "Show ownership, due time, linked records and completion evidence.",
        details: ["Investigate brake defect", "WP19 KLD · assigned to J. Miller"],
        action: "Mark task complete",
        active: "More",
        tone: "vor",
      },
      {
        title: "Defect detail",
        route: "/defects/$defectId",
        summary: "Connect evidence, repair work and any VOR case.",
        details: ["Brake pressure warning", "2 photos · VOR case confirmed"],
        action: "Mark defect resolved",
        active: "More",
        tone: "vor",
      },
    ],
  },
  {
    heading: "I · Vehicle record",
    description: "Identity, readiness, equipment, condition evidence and fluid records for one vehicle.",
    pages: [
      {
        title: "Vehicle overview",
        route: "/yard/$vehicleId",
        summary: "One operational record for trip, status, defects and movements.",
        details: ["MX72 BVK · D01", "Ready · R420 at 06:15 · 91% fuel"],
        action: "Move vehicle",
        active: "Vehicles",
        tone: "ok",
      },
      {
        title: "Equipment readiness",
        route: "/yard/$vehicleId/equipment",
        summary: "Confirm required fixed, assigned and controlled equipment.",
        details: ["8 of 9 complete", "Fire extinguisher inspection expired"],
        action: "Scan equipment",
        active: "Vehicles",
        tone: "vor",
      },
      {
        title: "Guided inspection",
        route: "/yard/$vehicleId/condition/inspect",
        summary: "Capture clear photos and observations by body zone.",
        details: ["Photo 3 of 8", "Nearside rear quarter · known damage"],
        action: "Continue inspection",
        active: "Vehicles",
      },
      {
        title: "Compare evidence",
        route: "/yard/$vehicleId/condition/compare",
        summary: "Compare approved earlier evidence with the latest observation.",
        details: ["86% similarity hint", "Suggested existing · supervisor review"],
        active: "Vehicles",
        tone: "warn",
      },
      {
        title: "Damage detail",
        route: "/yard/$vehicleId/condition/damage/$damageId",
        summary: "Preserve observation, repair and verification history.",
        details: ["DMG-000184", "Repair complete · verification required"],
        action: "Start verification",
        active: "Vehicles",
        tone: "warn",
      },
      {
        title: "AdBlue refill",
        route: "/yard/$vehicleId/adblue/refill",
        summary: "Record quantity, mileage, source, warning state and audit details.",
        details: ["MX72 BVK · 18.5 litres", "42,180 mi · depot pump · full fill"],
        action: "Record AdBlue refill",
        active: "Vehicles",
        tone: "ok",
      },
    ],
  },
  {
    heading: "J · More & sync",
    description: "Personal context, security, record delivery and product information.",
    pages: [
      {
        title: "Account",
        route: "/more/account",
        summary: "Show the signed-in user, role, company and depot context.",
        details: ["Jordan Miller", "Yard supervisor · Northwest Transport"],
        active: "More",
      },
      {
        title: "Sync queue",
        route: "/more/sync",
        summary: "Keep offline changes visible until safely uploaded.",
        details: ["2 waiting · 1 failed", "Vehicle marked VOR · retry required"],
        action: "Retry pending",
        active: "More",
        tone: "warn",
      },
      {
        title: "Settings & security",
        route: "/more/settings",
        summary: "Control biometrics, app lock, sync and local storage.",
        details: ["Biometric unlock", "Enabled on this device"],
        active: "More",
      },
      {
        title: "About Veyvio Yard",
        route: "/more/about",
        summary: "State the product promise, version and support identity.",
        details: ["Operational confidence", "Visibility · readiness · accountability"],
        active: "More",
      },
    ],
  },
  {
    heading: "K · Review & analytics",
    description: "Evidence-led review queues and depot condition trends.",
    pages: [
      {
        title: "Damage review",
        route: "/inspections/damage-review",
        summary: "Compare driver and yard evidence before classification.",
        details: ["YN22 ZTM · front wing", "New report · decision required"],
        action: "Record review decision",
        active: "More",
        tone: "warn",
      },
      {
        title: "Repair verification",
        route: "/inspections/repair-verification",
        summary: "Require Yard evidence after workshop completion.",
        details: ["MX72 BVK · rwo2", "Touch-up paint complete · verify"],
        action: "Start verification",
        active: "More",
        tone: "warn",
      },
      {
        title: "Condition analytics",
        route: "/inspections/analytics",
        summary: "Support investigation without making automatic enforcement decisions.",
        details: ["19 vehicles without baseline", "3 reports awaiting review"],
        active: "More",
        tone: "vor",
      },
    ],
  },
  {
    heading: "L · Internal workflow simulator",
    description: "A development-only bridge for testing Driver-to-Yard damage reports.",
    pages: [
      {
        title: "Simulate driver report",
        route: "/simulate/driver-report",
        summary: "Create a realistic driver observation for the Yard review queue.",
        details: ["MX72 BVK · front wing", "Scuff · cosmetic · safe to continue"],
        action: "Record damage report",
        active: "More",
      },
    ],
  },
];


function DesktopWebPreview() {
  return (
    <div style={{ display: "flex", height: 280, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", background: PAGE_BG }}>
      <div style={{ width: 160, background: SURFACE, borderRight: `1px solid ${BORDER}`, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: INK, color: "#fff", fontSize: 8, fontWeight: 900, display: "grid", placeItems: "center" }}>VY</div>
          <Wordmark onDark={false} size="quiet" />
        </div>
        <div style={{ fontSize: 8, color: MUTED, fontWeight: 700, textTransform: "uppercase" }}>Depot</div>
        <div style={{ fontSize: 9, fontWeight: 700 }}>BCT Main Depot</div>
        {["Home", "Checks", "Vehicles", "Yard", "More"].map((item, i) => (
          <div key={item} style={{ fontSize: 10, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? INK : MUTED, padding: "6px 8px", borderRadius: 6, background: i === 0 ? NAV_ACTIVE : "transparent" }}>{item}</div>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 44, borderBottom: `1px solid ${BORDER}`, background: SURFACE, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", fontSize: 9, color: MUTED }}>
          <span>BCT · BCT Main Depot operations</span>
          <span style={{ background: INK, color: "#fff", padding: "4px 8px", borderRadius: 6, fontWeight: 700 }}>Scan record</span>
        </div>
        <div style={{ flex: 1, padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Depot board</div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <KpiMini label="Available" value="38" />
            <KpiMini label="Tasks" value="12" />
            <KpiMini label="VOR" value="2" tone="vor" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RoutePagePhone({ page }: { page: RoutePageSpec }) {
  const publicSurface = page.surface === "public";
  const toneColor =
    page.tone === "ok" ? OK : page.tone === "warn" ? WARN : page.tone === "vor" ? VOR : COMMAND_BLUE;

  return (
    <PhoneFrame label={`${page.title} · ${page.route}`} status={publicSurface ? "light" : "midnight"}>
      {publicSurface ? (
        <div style={{ background: MIDNIGHT, color: "#fff", padding: "10px 12px", borderTop: `3px solid ${COMMAND_BLUE}` }}>
          <Wordmark size="header" />
        </div>
      ) : (
        <LightAppHeader />
      )}
      <div style={{ flex: 1, background: PAGE_BG, padding: 12, overflow: "hidden" }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {page.route}
        </div>
        <div style={{ marginTop: 6, fontSize: 17, fontWeight: 800, lineHeight: 1.2, color: page.tone === "vor" ? VOR : MIDNIGHT }}>
          {page.title}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.45, color: MUTED }}>{page.summary}</div>
        <div style={{ marginTop: 14, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${toneColor}`, borderRadius: 4, background: "#fff", padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: MIDNIGHT }}>{page.details[0]}</div>
          <div style={{ marginTop: 4, fontSize: 9, lineHeight: 1.4, color: MUTED }}>{page.details[1]}</div>
        </div>
        <div style={{ marginTop: 10, border: `1px solid ${BORDER}`, borderRadius: 4, background: "#fff", padding: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Record state
          </div>
          <div style={{ marginTop: 4, fontSize: 10, color: toneColor, fontWeight: 700 }}>
            {page.tone === "vor" ? "Action required" : page.tone === "warn" ? "Needs attention" : page.tone === "ok" ? "Ready" : "Current"}
          </div>
        </div>
        {page.action ? (
          <div style={{ marginTop: 12, borderRadius: 4, background: publicSurface ? COMMAND_BLUE : INK, color: "#fff", padding: "11px 12px", textAlign: "center", fontSize: 10, fontWeight: 800 }}>
            {page.action}
          </div>
        ) : null}
      </div>
      {publicSurface ? null : <HubBottomNav active={page.active ?? "More"} />}
    </PhoneFrame>
  );
}

export default function VeyvioYardBrandPhoneCanvas() {
  return (
    <Stack gap={24} style={{ padding: 24 }}>
      <Stack gap={8}>
        <H1>Veyvio Yard — phone + web brand (live)</H1>
        <Text tone="secondary">
          Synced with shipped Yard UI: light dashboard chrome, Command Blue primary actions, live spatial yard map,
          depot board home, and 44-route inventory. Midnight remains for splash and focused safety flows.
        </Text>
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          <Pill tone="info" size="sm">
            Midnight #0B1526
          </Pill>
          <Pill tone="info" size="sm">
            Command Blue #2F6BFF
          </Pill>
          <Pill tone="info" size="sm">
            Yard Teal #12A89D (auth + map)
          </Pill>
          <Pill tone="neutral" size="sm">
            Hubs: Home · Checks · Vehicles · Yard · More
          </Pill>
        </Row>
      </Stack>

      <Callout tone="info" title="Synced with code (Jul 2026)">
        Matches src/components/yard/shells/AppShell.tsx, BottomNav.tsx, features/yard-map/LiveYardMap.tsx, and
        routes/_app.*. Web adds a 220px desktop sidebar; phone uses white header + bottom nav. Update this canvas when
        chrome or hub IA changes.
      </Callout>

      <Grid columns={3} gap={16}>
        <Stat value="5" label="Primary hubs with bottom nav" tone="info" />
        <Stat value="44" label="Live UI routes represented" tone="success" />
        <Stat value="Light" label="Hub chrome + bottom nav" />
        <Stat value="Blue" label="Primary actions + links" tone="success" />
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
          <CardHeader trailing={<Pill tone="success" size="sm">Hub</Pill>}>Checks</CardHeader>
          <CardBody>
            <ChecksPhone />
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm">Hub</Pill>}>Vehicles</CardHeader>
          <CardBody>
            <VehiclesPhone />
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm">Hub</Pill>}>Yard map</CardHeader>
          <CardBody>
            <YardMapPhone />
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill tone="success" size="sm">Hub</Pill>}>More</CardHeader>
          <CardBody>
            <MorePhone />
          </CardBody>
        </Card>
      </Grid>


      <H2>Web · desktop shell (lg+)</H2>
      <Grid columns={1} gap={16}>
        <Card>
          <CardHeader trailing={<Pill size="sm">220px sidebar</Pill>}>AppShell desktop</CardHeader>
          <CardBody>
            <DesktopWebPreview />
          </CardBody>
        </Card>
      </Grid>

      <H2>E · Focused workflows</H2>
      <Grid columns={3} gap={16}>
        <Card>
          <CardHeader>Yard check</CardHeader>
          <CardBody>
            <FocusedPhone />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>VOR case</CardHeader>
          <CardBody>
            <FocusedVorPhone />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Damage capture</CardHeader>
          <CardBody>
            <FocusedDamagePhone />
          </CardBody>
        </Card>
      </Grid>

      {MISSING_PAGE_GROUPS.map(group => (
        <Stack gap={12}>
          <H2>{group.heading}</H2>
          <Text size="small" tone="secondary">{group.description}</Text>
          <Grid columns={3} gap={16}>
            {group.pages.map(page => (
              <RoutePagePhone page={page} />
            ))}
          </Grid>
        </Stack>
      ))}

      <H2>M · Brand policy</H2>
      <Grid columns={1} gap={16}>
        <Card>
          <CardHeader>Rules across phone surfaces</CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text size="small">1. Hub tabs: Home · Checks · Vehicles · Yard · More (nav-routes.ts)</Text>
              <Text size="small">2. Hub chrome: white header (VY badge + wordmark), ink Scan, sync badge, light bottom nav</Text>
              <Text size="small">3. Primary actions: Command Blue #2F6BFF — aligned with Veyvio Command/Admin</Text>
              <Text size="small">4. Yard Teal #12A89D: auth flows, map bay selection, splash atmosphere accent</Text>
              <Text size="small">5. Home = Depot board (KPIs, needs attention, readiness chart) — not generic welcome</Text>
              <Text size="small">6. Yard map = LiveYardMap SVG (BCT), Map/List toggle, layers, realtime bays</Text>
              <Text size="small">7. More = Workflow + Operations sections (Tasks, VOR, sync, etc.)</Text>
              <Text size="small">8. Focused safety flows keep Midnight chrome (check, VOR, damage)</Text>
              <Divider />
              <Text size="small" tone="secondary">
                Web/desktop: 220px light sidebar mirrors bottom nav. Status always labelled + icon — never colour alone.
                Splash/footer PWA theme stays Midnight #0B1526.
              </Text>
              <Text size="small" tone="secondary">
                Route coverage: all 44 live Yard UI routes are represented above. AdBlue refill is live at
                /yard/$vehicleId/adblue/refill.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>
    </Stack>
  );
}
