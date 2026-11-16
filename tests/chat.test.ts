import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { emptySessionView, foldEvents } from "eve/events";
import { useEveAgent } from "eve/react";
import Chat from "../app/chat";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("eve/react", () => ({ useEveAgent: vi.fn() }));

function renderSignIn(settled = false) {
  const facts = [
    { type: "interaction.opened", data: { interactionId: "notion-sign-in", subject: { turnId: "turn" }, request: {
      kind: "sign-in", prompt: "Connect your personal Notion account.",
      signIn: { name: "notion", displayName: "Notion", url: "https://consent.example/notion" },
    } } },
    ...(settled ? [{ type: "interaction.settled", data: { interactionId: "notion-sign-in", outcome: "accepted" } }] : []),
    { type: "interaction.opened", data: { interactionId: "approval", subject: { callId: "call" }, request: {
      kind: "approval", prompt: "Approve database creation?", options: [{ id: "approve", label: "Approve" }],
    } } },
  ];
  const view = foldEvents(emptySessionView(), facts.map((fact, line) => ({
    ...fact, meta: { position: { line, index: 0 }, at: "2026-11-16T00:00:00Z", endOfLine: true },
  })));
  vi.mocked(useEveAgent).mockReturnValue({ view, messages: [], status: "ready" } as never);
  return renderToStaticMarkup(createElement(Chat, { demoUrl: "https://example.com" }));
}

describe("Bell's v27 interaction UI", () => {
  it("keeps personal OAuth links and approval controls visible", () => {
    const html = renderSignIn();
    expect(html).toContain('href="https://consent.example/notion"');
    expect(html).toContain("Connect Notion");
    expect(html).toContain("Approve database creation?");
    expect(html).toContain("Approve</button>");
  });
  it("replaces a completed sign-in link with its connection outcome", () => {
    const html = renderSignIn(true);
    expect(html).toContain("Notion connected.");
    expect(html).not.toContain("https://consent.example/notion");
    expect(html).toContain("Approve database creation?");
  });
});
