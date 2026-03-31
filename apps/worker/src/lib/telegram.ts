/**
 * Send a message via Telegram Bot API.
 * Requires TELEGRAM_BOT_TOKEN to be set; no-op if missing.
 */

const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<boolean> {
  const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId.trim(),
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn("[telegram] sendMessage failed:", res.status, err);
    return false;
  }
  return true;
}
