import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PresenceBar from "@/components/custom/workspace/PresenceBar";

describe("PresenceBar", () => {
  it("renders participants and handles click", async () => {
    const mockSession: any = {
      connection: "live",
      clientId: "client-1",
      participants: [
        { clientId: "client-1", name: "Ankit Baghel", identityId: "id-1" },
        { clientId: "client-2", name: "Guest 0F9F", identityId: "id-2" },
      ],
    };

    render(<PresenceBar session={mockSession} />);
    const button = screen.getByRole("button", { name: /Show 2 people/i });
    expect(button).toBeDefined();
    fireEvent.click(button);
  });
});
