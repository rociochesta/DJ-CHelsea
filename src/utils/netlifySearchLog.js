export async function logSearchEvent(data) {
  try {
    const body = new URLSearchParams({
      "form-name": "karaoke-searches",
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v == null ? "" : String(v)])
      ),
    });

    await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (e) {
    console.warn("Search log failed:", e);
  }
}