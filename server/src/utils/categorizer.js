const categoryKeywords = {
  technical: ["bug", "crash", "error", "broken", "api", "login", "slow", "integration", "issue"],
  billing: ["invoice", "refund", "payment", "card", "charge", "pricing", "subscription", "billing"],
  feedback: ["feedback", "feature", "request", "suggest", "idea", "improve", "love", "hate"]
};

export function categorizeConversation(text = "") {
  const normalized = text.toLowerCase();
  for (const [category, words] of Object.entries(categoryKeywords)) {
    if (words.some((word) => normalized.includes(word))) return category;
  }
  return "general";
}
