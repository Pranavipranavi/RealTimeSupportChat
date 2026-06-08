export function summarizeConversation(messages = []) {
  const useful = messages
    .map((message) => message.content)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!useful) return "No text messages yet.";
  const sentences = useful.match(/[^.!?]+[.!?]*/g) || [useful];
  const opening = sentences.slice(0, 2).join(" ").slice(0, 260);
  const keywords = [...new Set(useful.toLowerCase().match(/[a-z]{5,}/g) || [])].slice(0, 6);
  return `${opening}${useful.length > 260 ? "..." : ""}${keywords.length ? ` Key topics: ${keywords.join(", ")}.` : ""}`;
}
