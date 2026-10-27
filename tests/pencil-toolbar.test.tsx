import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PencilToolbar, { PENCIL_COLORS, PENCIL_WIDTH_PRESETS } from "@/components/custom/workspace/PencilToolbar";

describe("PencilToolbar", () => {
  it("renders pencil thickness and color presets", () => {
    const handleColor = vi.fn();
    const handleWidth = vi.fn();

    render(
      <PencilToolbar
        color="#151714"
        width={2}
        onColorChange={handleColor}
        onWidthChange={handleWidth}
      />
    );

    expect(screen.getByText("Pencil")).toBeDefined();
    expect(screen.getByText("2px")).toBeDefined();

    // Verify width presets are rendered
    PENCIL_WIDTH_PRESETS.forEach((preset) => {
      expect(screen.getByText(preset.label)).toBeDefined();
    });

    // Click on a width preset
    const boldButton = screen.getByText("Bold");
    fireEvent.click(boldButton);
    expect(handleWidth).toHaveBeenCalledWith(4);

    // Click on a color swatch
    const emeraldSwatch = screen.getByTitle("Emerald");
    fireEvent.click(emeraldSwatch);
    expect(handleColor).toHaveBeenCalledWith("#2aab70");
  });

  it("handles slider input for custom thickness", () => {
    const handleWidth = vi.fn();
    render(
      <PencilToolbar
        color="#151714"
        width={2}
        onColorChange={vi.fn()}
        onWidthChange={handleWidth}
      />
    );

    const slider = screen.getByLabelText("Pencil thickness slider");
    fireEvent.change(slider, { target: { value: "6.5" } });
    expect(handleWidth).toHaveBeenCalledWith(6.5);
  });
});
