"use client";

import { useEffect, useState } from "react";

// A small handful of warm sub-lines per time-of-day. Picked once on mount so
// it doesn't flicker on re-render.
const SUBS = {
  morning: [
    "Coffee in hand. Let's see what today brings.",
    "Quiet inbox, sharp pencils. Good morning.",
    "Fresh start. The numbers are listening.",
  ],
  afternoon: [
    "Halfway there. Keep the momentum.",
    "Snack time, but also: there's progress to be made.",
    "Steady on. The breach list isn't going to clear itself.",
  ],
  evening: [
    "Wrap-up mode. Mark today as a small win.",
    "One more sweep before you log off.",
    "Last lap. Then go enjoy your evening.",
  ],
  late: [
    "Working late? You earned the long lunch tomorrow.",
    "The dashboard is awake. So apparently are you.",
    "Past 9pm and still here. Heroic, or escalation? Either way — hi.",
  ],
};

type Slot = keyof typeof SUBS;

function slotFor(hour: number): Slot {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "late";
}

const HEADLINES: Record<Slot, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  late: "Working late",
};

export function GreetingHeadline() {
  const [slot, setSlot] = useState<Slot | null>(null);
  useEffect(() => setSlot(slotFor(new Date().getHours())), []);
  if (!slot) {
    return <>Welcome <em>back</em></>;
  }
  return (
    <>
      {HEADLINES[slot]}, <em>team</em>
    </>
  );
}

export function GreetingSub() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const slot = slotFor(new Date().getHours());
    const list = SUBS[slot];
    setText(list[Math.floor(Math.random() * list.length)]!);
  }, []);
  return <>{text ?? "Live across ICAA and ISA."}</>;
}
