function buildContext(symbol = "BTC", posture = "Neutral", confidence = 50, watchlist = []) {
  const sentiment = posture === "Bullish" ? "positive" : posture === "Bearish" ? "cautious" : "mixed";
  const watchText = Array.isArray(watchlist) && watchlist.length ? watchlist.slice(0, 3).join(", ") : "your watchlist";
  const lower = String(symbol || "BTC").toUpperCase();

  const drivers = posture === "Bullish"
    ? [
        `${lower} is attracting stronger momentum flow across the current session.`,
        `Confidence is sitting at ${confidence}%, which means more of the signal stack is aligned tonight.`,
        `${watchText} are keeping leadership concentrated instead of scattered across the board.`
      ]
    : posture === "Bearish"
    ? [
        `${lower} is losing alignment across the faster signal stack, keeping posture defensive.`,
        `Confidence is only ${confidence}%, so the setup still lacks broad confirmation.`,
        `Rotation across ${watchText} looks less supportive tonight, which weakens follow-through.`
      ]
    : [
        `${lower} is holding a mixed posture while momentum and structure continue to negotiate.`,
        `Confidence is ${confidence}%, which points to partial alignment rather than a decisive push.`,
        `${watchText} still matter, but leadership has not fully separated from the pack.`
      ];

  const news = [
    { title: `${lower} market structure firms as traders look for cleaner confirmation`, source: "Market Context", href: "https://example.com/context-1" },
    { title: lower === "ADA" ? "Cardano chatter turns back toward Midnight and privacy tooling" : `${lower} sentiment firms as ecosystem updates improve near-term attention`, source: "Ecosystem Wire", href: "https://example.com/context-2" },
    { title: `Macro risk appetite remains a key swing factor for ${lower} tonight`, source: "Signal Desk", href: "https://example.com/context-3" },
  ];

  const pulse = [
    { text: `${lower} looks stronger when multi-timeframe alignment starts holding instead of fading.`, source: "Community Pulse" },
    { text: lower === "ADA" ? "Builders are talking more about Cardano depth and Midnight privacy narratives again." : `${lower} is back in rotation talk as traders look for higher-quality setups.`, source: "X summary" },
    { text: posture === "Bullish" ? "The tone is constructive, but traders still want confirmation before pressing size." : posture === "Bearish" ? "The tone is cautious, with traders focusing on risk management first." : "The tone is split, with traders waiting for a cleaner break in either direction.", source: "Desk read" },
  ];

  return { sentiment, drivers, news, pulse };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTC";
  const posture = searchParams.get("posture") || "Neutral";
  const confidence = Number(searchParams.get("confidence") || 50);
  const watchlist = (searchParams.get("watchlist") || "").split(",").filter(Boolean);

  return Response.json({
    ok: true,
    context: buildContext(symbol, posture, confidence, watchlist),
  });
}
