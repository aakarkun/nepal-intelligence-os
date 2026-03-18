"use client";

import { cn } from "@/lib/utils";
import { Layers, MapPin, AlertTriangle, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export interface LayerVisibility {
  provinces: boolean;
  districts: boolean;
  anomalies: boolean;
}

interface MapControlsProps {
  layers: LayerVisibility;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  selectedProvince?: number | null;
  onSelectProvince?: (id: number | null) => void;
  onResetView?: () => void;
}

const LAYER_CONFIG: {
  key: keyof LayerVisibility;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "provinces", label: "Provinces", icon: Layers },
  { key: "districts", label: "Districts", icon: MapPin },
  { key: "anomalies", label: "Anomalies", icon: AlertTriangle },
];

export function MapControls({
  layers,
  onToggleLayer,
  onZoomIn,
  onZoomOut,
  selectedProvince,
  onSelectProvince,
  onResetView,
}: MapControlsProps) {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 bg-card border border-border rounded-lg p-2 shadow-sm">
      {LAYER_CONFIG.map(({ key, label, icon: Icon }) => {
        const active = layers[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggleLayer(key)}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            )}
            title={`Toggle ${label}`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        );
      })}

      <div className="my-0.5 h-px bg-border" />

      <div className="flex items-center gap-1 mt-1">
        <button
          type="button"
          onClick={onZoomIn}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        {(onSelectProvince || onResetView) && (
          <button
            type="button"
            onClick={() => {
              onSelectProvince?.(null);
              onResetView?.();
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Reset view"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
