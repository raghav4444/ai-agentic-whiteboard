import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import axios from "axios"
import CreateNewBoardDialog from "@/components/custom/dashboard/CreateNewBoardDialog"

const push = vi.fn()

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/components/ui/toast", () => ({
  toast: {
    add: vi.fn(),
  },
}))

describe("CreateNewBoardDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.post).mockRejectedValue(new Error("creation failed"))
  })

  it("does not navigate when workspace creation fails", async () => {
    render(<CreateNewBoardDialog />)

    fireEvent.click(screen.getByRole("button", { name: /create new board/i }))

    fireEvent.change(
      await screen.findByPlaceholderText("e.g. E-Commerce Microservices Architecture"),
      {
        target: { value: "Failed Workspace" },
      }
    )

    fireEvent.click(screen.getByRole("button", { name: /^Create Workspace$/ }))

    await waitFor(() => expect(axios.post).toHaveBeenCalled())

    // The board was never created, so there is nowhere to navigate to.
    expect(push).not.toHaveBeenCalled()
    // The action must be retryable rather than left disabled.
    expect(screen.getByRole("button", { name: /^Create Workspace$/ })).not.toBeDisabled()
  })

  it("does not create a board with an empty name", async () => {
    render(<CreateNewBoardDialog />)

    fireEvent.click(screen.getByRole("button", { name: /create new board/i }))
    await screen.findByPlaceholderText("e.g. E-Commerce Microservices Architecture")

    // The create action stays disabled until a name is entered.
    expect(screen.getByRole("button", { name: /^Create Workspace$/ })).toBeDisabled()
    expect(axios.post).not.toHaveBeenCalled()
  })
})
