"use client";

import { useState, useEffect, useRef } from "react";
import { DiscoverRailPanel } from "@/components/discover/discover-rail-panel";

const KATHMANDU_LAT = 27.7172;
const KATHMANDU_LON = 85.3240;
const CACHE_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

const WMO_CODES: Record<number, { emoji: string; label: string }> = {
  0: { emoji: "☀️", label: "Clear sky" },
  1: { emoji: "🌤️", label: "Mainly clear" },
  2: { emoji: "🌤️", label: "Partly cloudy" },
  3: { emoji: "🌤️", label: "Overcast" },
  45: { emoji: "🌫️", label: "Foggy" },
  48: { emoji: "🌫️", label: "Foggy" },
  51: { emoji: "🌦️", label: "Drizzle" },
  53: { emoji: "🌦️", label: "Drizzle" },
  55: { emoji: "🌦️", label: "Drizzle" },
  61: { emoji: "🌧️", label: "Rain" },
  63: { emoji: "🌧️", label: "Rain" },
  65: { emoji: "🌧️", label: "Rain" },
  71: { emoji: "🌨️", label: "Snow" },
  73: { emoji: "🌨️", label: "Snow" },
  75: { emoji: "🌨️", label: "Snow" },
  80: { emoji: "🌧️", label: "Rain showers" },
  81: { emoji: "🌧️", label: "Rain showers" },
  82: { emoji: "🌧️", label: "Rain showers" },
  95: { emoji: "⛈️", label: "Thunderstorm" },
};

function getWeatherInfo(code: number) {
  return WMO_CODES[code] ?? { emoji: "🌡️", label: "Unknown" };
}

interface OpenMeteoCurrent {
  temperature_2m: number;
  weathercode: number;
  windspeed_10m: number;
}

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weathercode: number[];
}

interface OpenMeteoResponse {
  current?: OpenMeteoCurrent;
  daily?: OpenMeteoDaily;
}

export function SidebarWeather() {
  const [data, setData] = useState<OpenMeteoResponse | null>(null);
  const [hidden, setHidden] = useState(false);
  const cacheRef = useRef<{ ts: number; data: OpenMeteoResponse } | null>(null);

  useEffect(() => {
    const cached = cacheRef.current;
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setData(cached.data);
      return;
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(KATHMANDU_LAT));
    url.searchParams.set("longitude", String(KATHMANDU_LON));
    url.searchParams.set("current", "temperature_2m,weathercode,windspeed_10m");
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weathercode");
    url.searchParams.set("timezone", "Asia/Kathmandu");
    url.searchParams.set("forecast_days", "5");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch(url.toString(), { signal: controller.signal })
      .then((res) => res.json() as Promise<OpenMeteoResponse>)
      .then((json) => {
        clearTimeout(timeoutId);
        if (json.current && json.daily) {
          cacheRef.current = { ts: Date.now(), data: json };
          setData(json);
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        setHidden(true);
      });
  }, []);

  if (hidden) return null;

  if (!data?.current || !data?.daily) {
    return (
      <DiscoverRailPanel title="Weather" leadingDotClass="bg-sky-500">
        <>
          <p className="mb-1.5 font-sans text-[12px] uppercase tracking-wider text-[#666]">
            Kathmandu
          </p>
          <div className="flex items-center gap-2">
            <div className="h-9 w-20 rounded bg-white/[0.06]" />
            <div className="h-4 w-28 rounded bg-white/[0.06]" />
          </div>
          <div className="mt-1 h-3 w-full rounded bg-white/[0.06]" />
          <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 pt-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="flex min-w-[3rem] h-[58px] flex-col items-center justify-between text-center"
              >
                <div className="h-3 w-10 rounded bg-white/[0.06]" />
                <div className="h-4 w-6 rounded bg-white/[0.06]" />
                <div className="h-3 w-20 rounded bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </>
      </DiscoverRailPanel>
    );
  }

  const cur = data.current;
  const daily = data.daily;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = getWeatherInfo(cur.weathercode);
  const high = daily.temperature_2m_max[0];
  const low = daily.temperature_2m_min[0];

  return (
    <DiscoverRailPanel title="Weather" leadingDotClass="bg-sky-500">
      <>
        <p className="mb-1.5 font-sans text-[12px] uppercase tracking-wider text-[#666]">Kathmandu</p>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold tabular-nums text-[#e5e5e5]">
            {Math.round(cur.temperature_2m)}°
          </span>
          <span className="text-sm text-[#a1a1aa]">
            {today.emoji} {today.label}
          </span>
        </div>
        <p className="mt-1 font-sans text-[11px] text-[#555]">
          Wind {cur.windspeed_10m} km/h · H: {Math.round(high)}° L: {Math.round(low)}°
        </p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 pt-2">
          {daily.time.slice(0, 5).map((dateStr, i) => {
            const d = new Date(dateStr);
            const dayName = dayNames[d.getDay()];
            const code = daily.weathercode[i] ?? 0;
            const info = getWeatherInfo(code);
            const max = daily.temperature_2m_max[i];
            const min = daily.temperature_2m_min[i];
            return (
              <div
                key={dateStr}
                className="flex min-w-[3rem] flex-col items-center gap-0.5 text-center"
              >
                <span className="font-sans text-[11px] uppercase tracking-wide text-[#666]">{dayName}</span>
                <span className="text-sm">{info.emoji}</span>
                <span className="font-sans text-[11px] tabular-nums text-[#a1a1aa]">
                  {Math.round(max)}° / {Math.round(min)}°
                </span>
              </div>
            );
          })}
        </div>
      </>
    </DiscoverRailPanel>
  );
}
