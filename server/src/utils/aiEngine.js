const categoryKeywords = {
  technical: ["bug", "crash", "error", "broken", "api", "login", "slow", "integration", "webhook", "down"],
  billing: ["invoice", "refund", "payment", "card", "charge", "pricing", "subscription", "billing", "renewal"],
  feedback: ["feedback", "feature", "request", "suggest", "idea", "improve", "love", "hate", "wishlist"]
};

const urgentKeywords = ["urgent", "asap", "down", "blocked", "security", "breach", "production", "outage", "angry", "refund"];

export function classifyTicket(text = "") {
  const normalized = text.toLowerCase();
  const category = Object.entries(categoryKeywords).find(([, words]) => words.some((word) => normalized.includes(word)))?.[0] || "general";
  const urgencyScore = urgentKeywords.reduce((score, word) => score + Number(normalized.includes(word)), 0);
  const priority = urgencyScore >= 2 ? "urgent" : urgencyScore === 1 ? "high" : category === "feedback" ? "low" : "normal";
  const sentiment = ["angry", "hate", "terrible", "broken", "failed"].some((word) => normalized.includes(word)) ? "negative" : "neutral";

  return {
    category,
    priority,
    urgencyScore,
    sentiment,
    reason: `${category} classification from local keyword analysis`
  };
}

export function suggestReplies({ category = "general", priority = "normal", subject = "" } = {}) {
  const first = priority === "urgent"
    ? "I understand this is urgent. I am checking the highest-impact cause first and will keep you updated here."
    : "Thanks for the context. I am reviewing this now and will share the next step shortly.";
  const categoryReply = {
    technical: "Could you share the exact error message, affected environment, and the last time this worked?",
    billing: "I can help with that. I will verify the billing record and confirm the safest next step.",
    feedback: "Thank you for the thoughtful feedback. I will capture this with the product context for review.",
    general: "I have the details. I will route this to the right workflow and follow up with a clear answer."
  }[category] || "I will look into this and follow up with a clear answer.";

  return [first, categoryReply, `For "${subject || "this ticket"}", I will summarize findings before changing the ticket status.`];
}
