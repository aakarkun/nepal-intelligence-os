import { describe, expect, test, mock } from "bun:test";
import { sendTelegramMessage } from "../lib/telegram";

describe("sendTelegramMessage", () => {
  test("sends POST to Telegram API with correct url and body", async () => {
    const fetchMock = mock((url: string, init?: RequestInit) => {
      expect(url).toBe("https://api.telegram.org/botfake-token/sendMessage");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({ "Content-Type": "application/json" });
      const body = JSON.parse(init?.body as string);
      expect(body.chat_id).toBe("12345");
      expect(body.text).toBe("Hello");
      expect(body.disable_web_page_preview).toBe(true);
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await sendTelegramMessage("fake-token", "12345", "Hello");

    globalThis.fetch = originalFetch;
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("trims chat_id", async () => {
    const fetchMock = mock((_url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      expect(body.chat_id).toBe("12345");
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;

    await sendTelegramMessage("token", "  12345  ", "Hi");

    globalThis.fetch = originalFetch;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("returns false when response is not ok", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(new Response("Forbidden", { status: 403 }))
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await sendTelegramMessage("bad-token", "123", "Hi");

    globalThis.fetch = originalFetch;
    expect(result).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
