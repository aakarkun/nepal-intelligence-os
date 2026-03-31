"use client";

/**
 * Hugeicons via thin wrappers — familiar names (PanelLeft, X, …) for drop-in use; no lucide-react.
 */
import { HugeiconsIcon } from "@hugeicons/react";
import type { HugeiconsIconProps } from "@hugeicons/react";
import {
  Activity01Icon,
  AlarmClockIcon,
  AlertCircleIcon,
  AlertDiamondIcon,
  ArrowDown01Icon,
  ArrowDownRight01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  ArrowUpRight01Icon,
  Award01Icon,
  Building03Icon,
  Calendar03Icon,
  Cancel01Icon,
  ChartIncreaseIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CloudBigRainIcon,
  CommandIcon,
  CopyIcon,
  DashboardSquare01Icon,
  DatabaseIcon,
  Delete02Icon,
  DiscoverCircleIcon,
  Dollar01Icon,
  EyeIcon,
  FavouriteIcon,
  FilterIcon,
  FireIcon,
  GitCompareIcon,
  GlobeIcon,
  GridViewIcon,
  HeadphonesIcon,
  InformationCircleIcon,
  LandmarkIcon,
  Layers01Icon,
  LinkSquare01Icon,
  Loading03Icon,
  LockIcon,
  MapsIcon,
  MapPinIcon,
  Megaphone01Icon,
  Message01Icon,
  Mic01Icon,
  MicOff01Icon,
  MinusSignIcon,
  MoreHorizontalIcon,
  MountainIcon,
  NewsIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PhoneOff01Icon,
  PinIcon,
  PinOffIcon,
  PlusSignIcon,
  RadioIcon,
  RotateLeft01Icon,
  Search01Icon,
  Share01Icon,
  Shield01Icon,
  SparklesIcon,
  StickyNote01Icon,
  TableIcon,
  Tick02Icon,
  UserGroupIcon,
  ViewOffIcon,
  VolumeHighIcon,
  VolumeMute01Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

type IconProps = Omit<HugeiconsIconProps, "icon">;

function wrap(Icon: NonNullable<HugeiconsIconProps["icon"]>) {
  return function IconComponent(props: IconProps) {
    const { className, ...rest } = props ?? ({} as IconProps);
    return (
      <HugeiconsIcon
        icon={Icon}
        className={cn("shrink-0", className)}
        {...rest}
      />
    );
  };
}

export const X = wrap(Cancel01Icon);
export const ChevronDown = wrap(ArrowDown01Icon);
export const ChevronLeft = wrap(ArrowLeft01Icon);
export const ChevronRight = wrap(ArrowRight01Icon);
export const ChevronUp = wrap(ArrowUp01Icon);
export const Search = wrap(Search01Icon);
export const Heart = wrap(FavouriteIcon);
export const Globe = wrap(GlobeIcon);
export const Shield = wrap(Shield01Icon);
export function Loader2(props: IconProps) {
  const { className, ...rest } = props ?? ({} as IconProps);
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      className={cn("shrink-0 animate-spin", className)}
      {...rest}
    />
  );
}
export const Info = wrap(InformationCircleIcon);
export const Database = wrap(DatabaseIcon);
export const AlertTriangle = wrap(AlertDiamondIcon);
export const StickyNote = wrap(StickyNote01Icon);
export const Newspaper = wrap(NewsIcon);
export const Landmark = wrap(LandmarkIcon);
export const TrendingUp = wrap(ChartIncreaseIcon);
export const Mountain = wrap(MountainIcon);
export const MoreHorizontal = wrap(MoreHorizontalIcon);
export const Share2 = wrap(Share01Icon);
export const Pin = wrap(PinIcon);
export const PinOff = wrap(PinOffIcon);
export const ExternalLink = wrap(LinkSquare01Icon);
export const Eye = wrap(EyeIcon);
export const EyeOff = wrap(ViewOffIcon);
export const Copy = wrap(CopyIcon);
export const Check = wrap(Tick02Icon);
export const Plus = wrap(PlusSignIcon);
export const CheckCircle2 = wrap(CheckmarkCircle02Icon);
export const ArrowUpRight = wrap(ArrowUpRight01Icon);
export const ArrowDownRight = wrap(ArrowDownRight01Icon);
export const Minus = wrap(MinusSignIcon);
export const Layers = wrap(Layers01Icon);
export const MapPin = wrap(MapPinIcon);
export const ZoomIn = wrap(ZoomInAreaIcon);
export const ZoomOut = wrap(ZoomOutAreaIcon);
export const RotateCcw = wrap(RotateLeft01Icon);
export const Command = wrap(CommandIcon);
export const DiscoverCircle = wrap(DiscoverCircleIcon);
export const PanelLeft = wrap(PanelLeftIcon);
export const PanelRight = wrap(PanelRightIcon);
export const Sparkles = wrap(SparklesIcon);
export const LayoutGrid = wrap(GridViewIcon);
export const LayoutDashboard = wrap(DashboardSquare01Icon);
export const Map = wrap(MapsIcon);
export const TableProperties = wrap(TableIcon);
export const Building2 = wrap(Building03Icon);
export const Radio = wrap(RadioIcon);
export const Headphones = wrap(HeadphonesIcon);
export const Diff = wrap(GitCompareIcon);
export const Trash2 = wrap(Delete02Icon);
export const MessageCircle = wrap(Message01Icon);
export const Mic = wrap(Mic01Icon);
export const MicOff = wrap(MicOff01Icon);
export const Volume2 = wrap(VolumeHighIcon);
export const VolumeX = wrap(VolumeMute01Icon);
export const PhoneOff = wrap(PhoneOff01Icon);
export const Lock = wrap(LockIcon);
export const Activity = wrap(Activity01Icon);
export const CloudRain = wrap(CloudBigRainIcon);
export const Siren = wrap(AlarmClockIcon);
export const MapPinned = wrap(MapPinIcon);
export const AlertCircle = wrap(AlertCircleIcon);
export const DollarSign = wrap(Dollar01Icon);
export const Clock = wrap(Clock01Icon);
export const Users = wrap(UserGroupIcon);
export const Calendar = wrap(Calendar03Icon);
export const ArrowLeft = wrap(ArrowLeft01Icon);
export const Flame = wrap(FireIcon);
export const Megaphone = wrap(Megaphone01Icon);
export const Trophy = wrap(Award01Icon);
export const ArrowUpDown = wrap(ArrowUpDownIcon);
export const ListFilter = wrap(FilterIcon);
