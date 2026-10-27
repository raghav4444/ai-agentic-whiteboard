"use client";

import React from "react";
import { Minus, Palette, Pencil, X } from "@/lib/icons";

export const PENCIL_COLORS = [
  { name: "Ink Black", value: "#151714" },
  { name: "Graphite", value: "#6c726d" },
  { name: "Emerald", value: "#2aab70" },
  { name: "Blueprint Blue", value: "#1971c2" },
  { name: "Crimson", value: "#e03131" },
  { name: "Amber", value: "#f59f00" },
  { name: "Violet", value: "#9c36b5" },
  { name: "Chalk White", value: "#ffffff" },
];

export const PENCIL_WIDTH_PRESETS = [
  { label: "Fine", width: 1 },
  { label: "Medium", width: 2 },
  { label: "Bold", width: 4 },
  { label: "Heavy", width: 8 },
];

type Props = {
  color: string;
  width: number;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onClose?: () => void;
};

export default function PencilToolbar({
  color,
  width,
  onColorChange,
  onWidthChange,
  onClose,
}: Props) {
  return (
    <div
      data-glass-reactive
      onPointerDown={(e) => e.stopPropagation()}
      className="
        workspace-pencil-palette absolute left-[68px] top-1/2 z-50
        flex w-[210px] -translate-y-1/2 flex-col gap-3 rounded-2xl
        border border-white/14 bg-[rgba(20,24,21,0.94)] p-3.5 text-[#f7f4eb]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_54px_-16px_rgba(0,0,0,0.65)]
        backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-150
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-white/10 text-emerald-400">
            <Pencil size={13} />
          </div>
          <span className="text-[12px] font-semibold text-white/90">Pencil</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex size-5 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
            aria-label="Close pencil settings"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Live Stroke Preview */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
        <span className="mono-label text-[10px] text-white/40">Preview</span>
        <div className="flex h-6 flex-1 items-center justify-center px-3">
          <span
            className="w-full rounded-full transition-all duration-150"
            style={{
              height: `${Math.max(1, Math.min(width, 14))}px`,
              backgroundColor: color,
              boxShadow: color === "#ffffff" ? "0 0 6px rgba(255,255,255,0.4)" : "none",
            }}
          />
        </div>
        <span className="mono-label tabular-nums text-[10px] text-white/50">
          {width}px
        </span>
      </div>

      {/* Thickness Adjuster */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="mono-label text-[10px] text-white/45">Thickness</span>
          <span className="mono-label text-[9.5px] text-white/35">1 – 14px</span>
        </div>

        {/* Preset Pills */}
        <div className="grid grid-cols-4 gap-1">
          {PENCIL_WIDTH_PRESETS.map((preset) => {
            const isSelected = Math.abs(width - preset.width) < 0.25;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onWidthChange(preset.width)}
                className={`flex h-7 cursor-pointer flex-col items-center justify-center rounded-lg border text-[10px] font-medium transition-[background-color,border-color,transform] active:scale-95 ${
                  isSelected
                    ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300 font-semibold shadow-xs"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Smooth Slider */}
        <div className="mt-1 flex items-center gap-2">
          <Minus size={12} className="text-white/30" />
          <input
            type="range"
            min="1"
            max="14"
            step="0.5"
            value={width}
            onChange={(e) => onWidthChange(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-emerald-400"
            aria-label="Pencil thickness slider"
          />
          <Minus size={16} strokeWidth={3} className="text-white/60" />
        </div>
      </div>

      {/* Color Selector */}
      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2">
        <div className="flex items-center justify-between">
          <span className="mono-label text-[10px] text-white/45">Color</span>
          <label className="relative flex cursor-pointer items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300">
            <Palette size={11} />
            <span>Custom</span>
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label="Custom pencil color"
            />
          </label>
        </div>

        {/* Swatches Grid */}
        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
          {PENCIL_COLORS.map((item) => {
            const isSelected = color.toLowerCase() === item.value.toLowerCase();
            return (
              <button
                key={item.value}
                type="button"
                title={item.name}
                onClick={() => onColorChange(item.value)}
                className={`relative flex size-8 cursor-pointer items-center justify-center rounded-xl border transition-[border-color,transform] active:scale-90 ${
                  isSelected
                    ? "border-emerald-400 ring-2 ring-emerald-400/40"
                    : "border-white/15 hover:border-white/35"
                }`}
                style={{ backgroundColor: item.value }}
              >
                {isSelected && (
                  <span
                    className={`size-1.5 rounded-full ${
                      item.value === "#ffffff" ? "bg-black" : "bg-white"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
