import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import axios from "axios"
import Provider from "@/app/provider"

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}))

describe("Provider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    delete process.env.CLERK_SECRET_KEY
  })

  it("does not create a user when Clerk is not configured", async () => {
    render(
      <Provider>
        <div>Content</div>
      </Provider>
    )

    await waitFor(() => {
      expect(axios.post).not.toHaveBeenCalled()
    })

    expect(screen.getByText("Content")).toBeInTheDocument()
  })
})
