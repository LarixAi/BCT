/**
 * Island carousel cards — uniform CoreSupportFleet summary deck.
 * Every card shares the same fixed height, radius, and 4-zone layout.
 */
import {
  BarChart2, Car, Eye, EyeOff, Gem, MapPin, PawPrint, Sparkles, Zap,
} from "lucide-react";

export const ISLAND_CARD_HEIGHT_PX = 228;

const CARD_SHELL =
  "bg-white rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.14)] border border-gray-100/80 overflow-hidden flex flex-col w-full";

function CardAccent({ color = "blue" }) {
  const tones = {
    blue: "from-blue-500 to-indigo-500",
    green: "from-emerald-500 to-teal-500",
    amber: "from-amber-400 to-orange-500",
    violet: "from-violet-500 to-purple-600",
  };
  return <div className={`h-1 shrink-0 w-full bg-gradient-to-r ${tones[color] || tones.blue}`} />;
}

function HeaderSpacer() {
  return <div className="w-9 h-9 shrink-0" aria-hidden />;
}

function CardHeader({ left, center }) {
  return (
    <div className="grid grid-cols-[40px_1fr_40px] items-center px-4 h-[72px] shrink-0">
      <div className="flex justify-start">{left || <HeaderSpacer />}</div>
      <div className="flex justify-center min-w-0 px-1">{center}</div>
      <HeaderSpacer />
    </div>
  );
}

function EarningsPill({ value, label, hidden, accent = "green" }) {
  const accentClass = accent === "blue" ? "text-blue-400" : "text-emerald-400";
  return (
    <div className="flex flex-col items-center min-w-0">
      <div className="bg-gray-950 rounded-full px-5 py-2 min-w-[104px] flex items-center justify-center">
        <span className={`font-black text-[17px] leading-none tabular-nums ${accentClass}`}>
          {hidden ? "••••" : value}
        </span>
      </div>
      {label && (
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] mt-1.5">
          {label}
        </span>
      )}
    </div>
  );
}

function TitlePill({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center min-w-0 text-center">
      <span className="font-black text-[15px] text-gray-950 leading-tight">{title}</span>
      {subtitle && (
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] mt-1">
          {subtitle}
        </span>
      )}
    </div>
  );
}

function EyeToggle({ hidden, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={hidden ? "Show earnings" : "Hide earnings"}
      className="w-9 h-9 rounded-full bg-gray-950 flex items-center justify-center active:scale-95 transition-transform"
    >
      {hidden ? (
        <EyeOff className="w-4 h-4 text-white" strokeWidth={2.25} />
      ) : (
        <Eye className="w-4 h-4 text-white" strokeWidth={2.25} />
      )}
    </button>
  );
}

function CardBody({ children }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-0 overflow-hidden">
      {children}
    </div>
  );
}

function CardCta({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 shrink-0 w-full text-center text-[11px] font-bold tracking-[0.1em] text-blue-600 active:opacity-70 border-t border-gray-100"
    >
      {label}
    </button>
  );
}

function IslandCard({ accent, headerLeft, headerCenter, body, ctaLabel, onCta }) {
  return (
    <div className={CARD_SHELL} style={{ height: ISLAND_CARD_HEIGHT_PX }}>
      <CardAccent color={accent} />
      <CardHeader left={headerLeft} center={headerCenter} />
      <CardBody>{body}</CardBody>
      <CardCta label={ctaLabel} onClick={onCta} />
    </div>
  );
}

function PointsRow({ children }) {
  return (
    <div className="flex items-center gap-1.5 mt-2 text-gray-500">
      <Gem className="w-4 h-4 text-blue-500 shrink-0" strokeWidth={2.25} />
      <span className="text-sm font-medium text-center">{children}</span>
    </div>
  );
}

/** Slide 1 — today */
export function IslandTodayCard({
  amount, trips, points, hideEarnings, onToggleHide, onOpenEarnings, pulsing, pulseAmount,
}) {
  const display =
    pulsing && pulseAmount != null
      ? `+£${Number(pulseAmount).toFixed(2)}`
      : `£${Number(amount || 0).toFixed(2)}`;

  return (
    <IslandCard
      accent="green"
      headerLeft={<EyeToggle hidden={hideEarnings} onToggle={onToggleHide} />}
      headerCenter={
        <EarningsPill
          value={display}
          label="Today"
          hidden={hideEarnings && !pulsing}
          accent={pulsing ? "blue" : "green"}
        />
      }
      body={
        <>
          <p className="text-center font-black text-gray-950 text-[21px] leading-snug">
            {trips} trip{trips !== 1 ? "s" : ""} completed
          </p>
          <PointsRow>{points} Fleet points</PointsRow>
        </>
      }
      ctaLabel="OPEN EARNINGS"
      onCta={onOpenEarnings}
    />
  );
}

/** Slide 2 — week */
export function IslandWeekCard({ amount, trips, points, hideEarnings, onToggleHide, onOpenEarnings }) {
  return (
    <IslandCard
      accent="blue"
      headerLeft={<EyeToggle hidden={hideEarnings} onToggle={onToggleHide} />}
      headerCenter={
        <EarningsPill
          value={`£${Number(amount || 0).toFixed(2)}`}
          label="This week"
          hidden={hideEarnings}
        />
      }
      body={
        <>
          <p className="text-center font-black text-gray-950 text-[21px] leading-snug">
            {trips} trip{trips !== 1 ? "s" : ""} this week
          </p>
          <p className="text-center text-gray-500 text-sm mt-1">Mon – Sun net earnings</p>
          <PointsRow>{points} points earned</PointsRow>
        </>
      }
      ctaLabel="SEE WEEKLY SUMMARY"
      onCta={onOpenEarnings}
    />
  );
}

/** Slide 3 — rewards */
export function IslandRewardsCard({ points, pointsGoal, goldPct, trips, onOpenEarnings }) {
  return (
    <IslandCard
      accent="amber"
      headerLeft={
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      }
      headerCenter={<TitlePill title="Fleet Rewards" subtitle="Gold status" />}
      body={
        <>
          <div className="w-full flex items-end justify-between mb-2 px-1">
            <span className="font-black text-2xl text-gray-950 tabular-nums">{points}</span>
            <span className="text-gray-400 text-sm font-medium">/ {pointsGoal} pts</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              style={{ width: `${goldPct}%` }}
            />
          </div>
          <p className="text-gray-600 text-sm text-center">
            {goldPct}% to Gold · {trips} trip{trips !== 1 ? "s" : ""} today
          </p>
        </>
      }
      ctaLabel="SEE PROGRESS"
      onCta={onOpenEarnings}
    />
  );
}

/** Slide 4 — demand */
export function IslandDemandCard({ zoneLabel, onOpenHotAreas }) {
  const bars = [42, 68, 55, 82, 48, 74, 61];
  return (
    <IslandCard
      accent="violet"
      headerLeft={
        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-violet-600" />
        </div>
      }
      headerCenter={<TitlePill title="Demand insight" subtitle="Hot zones" />}
      body={
        <>
          <div className="w-full flex items-end justify-between gap-1 h-12 mb-2 px-1">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-violet-500 to-violet-300"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-gray-700 max-w-full">
            <MapPin className="w-4 h-4 text-violet-600 shrink-0" />
            <span className="text-sm font-semibold truncate">{zoneLabel}</span>
          </div>
          <p className="text-gray-500 text-xs mt-1 text-center">Higher fares in the next hour</p>
        </>
      }
      ctaLabel="VIEW HOT AREAS"
      onCta={onOpenHotAreas}
    />
  );
}

/** Slide 5 — promo */
export function IslandPromoCard({ onOpenHotAreas }) {
  return (
    <IslandCard
      accent="amber"
      headerLeft={
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-600" fill="currentColor" />
        </div>
      }
      headerCenter={<TitlePill title="2× Boost" subtitle="Active now" />}
      body={
        <>
          <p className="text-center text-gray-700 text-sm leading-snug px-1">
            Earn double on qualifying trips in your zone.
          </p>
          <div className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-amber-900 text-xs font-semibold">1 promo today</span>
          </div>
        </>
      }
      ctaLabel="SEE PROMOTIONS"
      onCta={onOpenHotAreas}
    />
  );
}

/** Slide 6 — preferences */
export function IslandPrefsCard({ prefs, onTogglePref }) {
  const items = [
    { key: "electric", label: "Electric", icon: Car },
    { key: "pets", label: "Pets", icon: PawPrint },
  ];

  return (
    <IslandCard
      accent="blue"
      headerLeft={
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <Car className="w-4 h-4 text-blue-600" />
        </div>
      }
      headerCenter={<TitlePill title="Trip prefs" subtitle="This device" />}
      body={
        <div className="w-full grid grid-cols-2 gap-2">
          {items.map(({ key, label, icon: Icon }) => {
            const on = prefs[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTogglePref(key)}
                className={`flex flex-col items-center justify-center rounded-xl border py-3 px-2 active:scale-[0.98] transition-all ${
                  on ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${on ? "text-blue-600" : "text-gray-500"}`} />
                <span className={`text-xs font-bold ${on ? "text-blue-700" : "text-gray-700"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      }
      ctaLabel="SAVE PREFERENCES"
      onCta={() => {}}
    />
  );
}
