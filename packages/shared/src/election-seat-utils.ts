import type { PartyResult } from "./schemas";
import {
  HOR_FPTP_SEATS,
  HOR_MAJORITY_THRESHOLD,
  HOR_PR_SEATS,
  HOR_TOTAL_SEATS,
} from "./constants";

/** Canonical HoR seat total for a party (FPTP + PR when present, else won + leading). */
export function partyTotalHorSeats(p: PartyResult): number {
  if (p.fptpSeats !== undefined && p.prSeats !== undefined) {
    return p.fptpSeats + p.prSeats;
  }
  return p.seatsWon + p.seatsLeading;
}

export type HorSeatMapMode = "total" | "fptp" | "pr";

export function partySeatsForHorMode(p: PartyResult, mode: HorSeatMapMode): number {
  if (p.fptpSeats !== undefined && p.prSeats !== undefined) {
    switch (mode) {
      case "total":
        return p.fptpSeats + p.prSeats;
      case "fptp":
        return p.fptpSeats;
      case "pr":
        return p.prSeats;
      default: {
        const _exhaustive: never = mode;
        return _exhaustive;
      }
    }
  }
  switch (mode) {
    case "total":
      return p.seatsWon + p.seatsLeading;
    case "fptp":
      return p.seatsWon + p.seatsLeading;
    case "pr":
      return 0;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function horSeatCapForMode(mode: HorSeatMapMode): number {
  switch (mode) {
    case "total":
      return HOR_TOTAL_SEATS;
    case "fptp":
      return HOR_FPTP_SEATS;
    case "pr":
      return HOR_PR_SEATS;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/** Half + 1 of the chamber for the given slice (FPTP / PR / full HoR). */
export function horMajorityThresholdForMode(mode: HorSeatMapMode): number {
  switch (mode) {
    case "total":
      return HOR_MAJORITY_THRESHOLD;
    case "fptp":
      return Math.floor(HOR_FPTP_SEATS / 2) + 1;
    case "pr":
      return Math.floor(HOR_PR_SEATS / 2) + 1;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
