import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import axios from "axios"
import Provider from "@/app/provider"

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

/**
 * The provider used to skip user creation entirely when Clerk was not
 * configured. That client-side guard was removed in bbfebe7: the guard now
 * lives in the /api/users route, which returns 404 when there is no
 * authenticated Clerk user, so the client can simply try and let the server
 * decide. These tests cover the behaviour that replaced it.
 */
describe("Provider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads the current user with a GET and renders its children", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { user: { id: "u1" } } })

    render(
      <Provider>
        <div>Content</div>
      </Provider>
    )

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/users")
    })

    // The record already exists, so nothing is created.
    expect(axios.post).not.toHaveBeenCalled()
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("creates the user record when the lookup misses", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("not found"))
    vi.mocked(axios.post).mockResolvedValue({ data: { user: { id: "u1" } } })

    render(
      <Provider>
        <div>Content</div>
      </Provider>
    )

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/users")
    })
  })

  it("does not throw when both the lookup and the create fail", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("offline"))
    vi.mocked(axios.post).mockRejectedValue(new Error("offline"))

    render(
      <Provider>
        <div>Content</div>
      </Provider>
    )

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled()
    })

    expect(screen.getByText("Content")).toBeInTheDocument()
  })
})
