import { cn } from "@/lib/utils";

type PartyNameFields = {
  partyName: string;
  partyShortName: string;
};

/**
 * Full party name from `md` up; abbreviated short name below `md` (narrow viewports).
 */
export function PartyTableNameCell({
  party,
  className,
}: {
  party: PartyNameFields;
  className?: string;
}) {
  return (
    <span className={cn("min-w-0 text-left text-[#ccc]", className)} title={party.partyName}>
      <span className="hidden md:block md:truncate">{party.partyName}</span>
      <span className="truncate md:hidden">{party.partyShortName}</span>
    </span>
  );
}
