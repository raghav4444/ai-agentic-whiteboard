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
    fireEvent.change(await screen.findByPlaceholderText("Workspace Name"), {
      target: { value: "Failed Workspace" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^Create$/ }))

    await waitFor(() => expect(axios.post).toHaveBeenCalled())

    expect(push).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /^Create$/ })).not.toBeDisabled()
  })
})