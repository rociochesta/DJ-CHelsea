// Proxy for https://www.jftna.org/jft/
// Bypasses CORS and parses the daily JFT reading into structured JSON.

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&nbsp;/g, " ");

const stripTags = (s) =>
  decode(s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

export async function handler() {
  try {
    const res = await fetch("https://www.jftna.org/jft/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // ── Date ─────────────────────────────────────────────────────────────────
    const dateMatch = html.match(
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{4})?/
    );
    const date = dateMatch ? dateMatch[0] : "";

    // ── Quote (first em/i block of substance) ─────────────────────────────
    const quoteMatch = html.match(/<(?:em|i)[^>]*>([\s\S]{15,600}?)<\/(?:em|i)>/i);
    const quote = quoteMatch ? stripTags(quoteMatch[1]) : "";

    // ── "Just for Today" closing ──────────────────────────────────────────
    const jftMatch =
      html.match(
        /(?:<b>|<strong>)\s*Just\s+for\s+Today[^<]*<\/(?:b|strong)>\s*([\s\S]{10,500}?)(?:<\/p>|<br|$)/i
      ) || html.match(/Just\s+for\s+Today[:\s]+([\s\S]{10,400}?)(?:<br|<\/p>|<\/td>)/i);
    const justForToday = jftMatch ? stripTags(jftMatch[1]) : "";

    // ── Paragraphs ────────────────────────────────────────────────────────
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs = [];
    let m;
    while ((m = pRegex.exec(html)) !== null) {
      const text = stripTags(m[1]);
      if (text.length > 30 && !/copyright/i.test(text) && !/^Page \d/i.test(text)) {
        paragraphs.push(text);
      }
    }

    // ── Title — first bold/heading after the date ──────────────────────────
    const afterDate = dateMatch ? html.slice(html.indexOf(dateMatch[0])) : html;
    const titleMatch =
      afterDate.match(/<b>([^<]{5,80})<\/b>/i) ||
      afterDate.match(/<strong>([^<]{5,80})<\/strong>/i) ||
      afterDate.match(/<h[2-4][^>]*>([^<]{5,80})<\/h[2-4]>/i);
    const rawTitle = titleMatch ? stripTags(titleMatch[1]).trim() : "";
    const title = /^Page \d/i.test(rawTitle) ? "" : rawTitle;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
      body: JSON.stringify({ date, title, quote, paragraphs, justForToday }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: String(e?.message || e) }),
    };
  }
}
