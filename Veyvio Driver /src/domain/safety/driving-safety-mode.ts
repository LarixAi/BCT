const DRIVING_SPEED_THRESHOLD_KMH = 10;

export function shouldEnableDrivingSafetyMode(speedKmh: number | null | undefined): boolean {
  if (speedKmh == null) return false;
  return speedKmh >= DRIVING_SPEED_THRESHOLD_KMH;
}

export function getDrivingSafetyRestrictions(): string[] {
  return [
    "Typing is restricted while the vehicle is moving",
    "Only navigation, next stop, and emergency actions are available",
    "Passenger-sensitive details are minimised",
  ];
}
