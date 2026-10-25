import { beforeEach, describe, expect, it } from "vitest";
import {
  mergeSceneElements,
  sanitizeElements,
} from "@/lib/collab/merge";
import { createShareToken, verifyShareToken } from "@/lib/collab/token";

function element(overrides: Record<string, unknown> = {}) {
  return {
    id: "element-1",
    type: "rectangle",
    x: 0,
    y: 0,
    width: 120,
    height: 80,
    version: 1,
    versionNonce: 1,
    updated: 1,
    groupIds: [],
    boundElements: [],
    isDeleted: false,
    locked: false,
    link: null,
    frameId: null,
    index: "a0",
    ...overrides,
  };
}

describe("sanitizeElements", () => {
  it("normalizes old elements so selection cannot crash the scene", () => {
    const [sanitized] = sanitizeElements([
      element({
        version: "invalid",
        versionNonce: undefined,
        updated: Number.NaN,
        x: undefined,
        width: undefined,
        backgroundColor: undefined,
        fillStyle: "not-a-fill",
        strokeWidth: undefined,
        opacity: undefined,
        groupIds: undefined,
        boundElements: undefined,
        link: undefined,
        frameId: undefined,
        index: undefined,
      }),
    ]);

    expect(sanitized).toMatchObject({
      id: "element-1",
      version: 0,
      versionNonce: 0,
      updated: 0,
      x: 0,
      width: 0,
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      opacity: 100,
      groupIds: [],
      boundElements: [],
      isDeleted: false,
      locked: false,
      link: null,
      frameId: null,
      index: null,
    });
  });

  it("drops duplicate ids and malformed entries", () => {
    const sanitized = sanitizeElements([
      element(),
      element({ version: 2 }),
      element({ id: "unknown-type", type: "not-a-real-element" }),
      { id: "", type: "rectangle" },
      null,
    ]);

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].version).toBe(1);
  });
});

describe("mergeSceneElements", () => {
  it("keeps the higher element version", () => {
    const local = element({ version: 2, versionNonce: 2 });
    const remote = element({ version: 3, versionNonce: 2 });

    const merged = mergeSceneElements(
      [local] as never,
      [remote] as never
    );

    expect(merged.elements[0].version).toBe(3);
    expect(merged.changed).toHaveLength(1);
  });

  it("uses the lower nonce when versions match", () => {
    const local = element({ version: 2, versionNonce: 1 });
    const remote = element({ version: 2, versionNonce: 5 });

    const merged = mergeSceneElements(
      [local] as never,
      [remote] as never
    );

    expect(merged.elements[0].versionNonce).toBe(1);
    expect(merged.changed).toHaveLength(0);
  });
});

describe("share tokens", () => {
  beforeEach(() => {
    process.env.SHARE_TOKEN_SECRET = "test-share-secret";
  });

  it("round-trips project, name, and permission", () => {
    const token = createShareToken({
      projectId: "qa-board",
      projectName: "Live QA board",
      permission: "view",
    });

    expect(verifyShareToken(token)).toMatchObject({
      projectId: "qa-board",
      projectName: "Live QA board",
      permission: "view",
    });
  });

  it("rejects a tampered signature", () => {
    const token = createShareToken({
      projectId: "qa-board",
      permission: "edit",
    });
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;

    expect(verifyShareToken(tampered)).toBeNull();
  });
});
