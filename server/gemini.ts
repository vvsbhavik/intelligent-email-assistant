import { GoogleGenAI } from "@google/genai";

// Lazy-initialize Gemini AI to handle missing keys gracefully
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export interface SummarizeEmailParams {
  subject: string;
  sender: string;
  body: string;
  threadHistory?: Array<{ sender: string; body: string; date: string }>;
}

export interface SummarizeEmailResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "urgent" | "negative";
  priority: "high" | "medium" | "low";
  priorityReason: string;
  estimatedReadTime: string;
}

export async function summarizeEmail(params: SummarizeEmailParams): Promise<SummarizeEmailResult> {
  const ai = getGeminiClient();

  const prompt = `You are an executive email assistant. Analyze the following email and return a structured JSON analysis.
Email Details:
Sender: ${params.sender}
Subject: ${params.subject}
Body:
${params.body}

${
  params.threadHistory && params.threadHistory.length > 0
    ? `\nThread History:\n${params.threadHistory.map((t) => `${t.sender} (${t.date}): ${t.body}`).join("\n---\n")}`
    : ""
}

Respond ONLY with a valid JSON object matching this schema:
{
  "summary": "2-3 sentence concise executive summary",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "actionItems": ["actionable task 1", "actionable task 2"],
  "sentiment": "positive" | "neutral" | "urgent" | "negative",
  "priority": "high" | "medium" | "low",
  "priorityReason": "short rationale for the priority rating",
  "estimatedReadTime": "e.g. 1 min"
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction:
        "You are an expert executive email intelligence assistant. Extract precise takeaways, eliminate fluff, and pinpoint clear action items. You must ONLY use information contained in the email. Do not invent facts or dates.",
    },
  });

  const text = response.text || "{}";
  try {
    return JSON.parse(text) as SummarizeEmailResult;
  } catch (e) {
    return {
      summary: text.slice(0, 300),
      keyPoints: ["Read email for details"],
      actionItems: [],
      sentiment: "neutral",
      priority: "medium",
      priorityReason: "Automated analysis fallback",
      estimatedReadTime: "1 min",
    };
  }
}

export interface GenerateReplyParams {
  subject: string;
  sender: string;
  body: string;
  tone?: "professional" | "friendly" | "formal" | "concise" | "direct" | "urgent";
  userInstructions?: string;
  userDraft?: string;
  keyPointsToInclude?: string[];
  senderName?: string;
  recipientName?: string;
}

export interface GenerateReplyResult {
  replySubject: string;
  replyBody: string;
  alternativeTones: {
    tone: string;
    preview: string;
  }[];
}

export async function generateReply(params: GenerateReplyParams): Promise<GenerateReplyResult> {
  const ai = getGeminiClient();
  const tone = params.tone || "professional";

  const prompt = `You are a professional email drafting assistant. Draft a reply to the following email.
Incoming Email:
From: ${params.sender}
Subject: ${params.subject}
Content:
${params.body}

Parameters:
- Desired Tone: ${tone} (Options: professional, friendly, formal, concise, direct, urgent)
${params.userInstructions ? `- Additional User Instructions: ${params.userInstructions}` : ""}
${params.keyPointsToInclude && params.keyPointsToInclude.length > 0 ? `- Specific Points to Include: ${params.keyPointsToInclude.join(", ")}` : ""}
${params.userDraft ? `- Existing User Draft to Refine: ${params.userDraft}` : ""}

Provide the output in JSON format matching this schema:
{
  "replySubject": "Re: ${params.subject.replace(/^Re:\s*/i, "")}",
  "replyBody": "The full polished email reply text ready to send. Include polite greeting and professional sign-off.",
  "alternativeTones": [
    { "tone": "concise", "preview": "Short 1-2 sentence quick response version" },
    { "tone": "friendly", "preview": "Warm and approachable version" }
  ]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction:
        "You write high-impact, context-aware email replies with natural phrasing, zero corporate jargon clichés, and perfect etiquette.",
    },
  });

  const text = response.text || "{}";
  try {
    return JSON.parse(text) as GenerateReplyResult;
  } catch (err) {
    return {
      replySubject: `Re: ${params.subject.replace(/^Re:\s*/i, "")}`,
      replyBody: text,
      alternativeTones: [],
    };
  }
}

export interface ExplainEmailResult {
  simplifiedExplanation: string;
  whatTheyWant: string;
  whatYouShouldDo: string;
  potentialRisksOrCatches: string[];
  keyTermsDefined: Array<{ term: string; definition: string }>;
}

export async function explainEmail(subject: string, sender: string, body: string): Promise<ExplainEmailResult> {
  const ai = getGeminiClient();

  const prompt = `Break down and explain this email in simple, plain English (like an ELI5 / trusted advisor).
Sender: ${sender}
Subject: ${subject}
Content:
${body}

Return a valid JSON object matching:
{
  "simplifiedExplanation": "Clear, friendly explanation of what this email is actually saying without legalistic or complex jargon.",
  "whatTheyWant": "Exactly what the sender is requesting or asking for.",
  "whatYouShouldDo": "Clear recommended next action step for the recipient.",
  "potentialRisksOrCatches": ["Any deadline, payment obligation, commitment, or fine print to watch out for"],
  "keyTermsDefined": [
    { "term": "Specific technical/legal/business term", "definition": "Simple 1-sentence definition" }
  ]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You explain complex emails simply. Preserve important facts exactly. Do not change names, dates, amounts, or commitments. Do not invent information."
    },
  });

  try {
    return JSON.parse(response.text || "{}") as ExplainEmailResult;
  } catch (err) {
    return {
      simplifiedExplanation: response.text || "Could not generate explanation.",
      whatTheyWant: "See email body.",
      whatYouShouldDo: "Review the email contents.",
      potentialRisksOrCatches: [],
      keyTermsDefined: [],
    };
  }
}

export interface EnhanceTextParams {
  text: string;
  mode: "fix_grammar" | "professional" | "friendly" | "concise" | "expand" | "assertive";
}

export async function enhanceEmailText(params: EnhanceTextParams): Promise<{ enhancedText: string; improvements: string[] }> {
  const ai = getGeminiClient();

  const modeDescriptions: Record<string, string> = {
    fix_grammar: "Fix all typos, grammar, and punctuation while preserving original style.",
    professional: "Make the email sound polished, articulate, and business-ready.",
    friendly: "Make the tone warmer, more approachable, and personable.",
    concise: "Trim fluff and make every word count. Maximum brevity without losing meaning.",
    expand: "Elaborate with polite context, structured reasoning, and clear details.",
    assertive: "Confident, decisive, and direct without being rude or aggressive.",
  };

  const prompt = `Transform the following email text according to this goal: "${modeDescriptions[params.mode] || params.mode}".
Original Text:
${params.text}

Respond in JSON format:
{
  "enhancedText": "The improved rewrite",
  "improvements": ["Key change 1 made", "Key change 2 made"]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You are an expert copywriter. The rewritten result must strictly preserve the original meaning. Do not invent new facts."
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (err) {
    return {
      enhancedText: response.text || params.text,
      improvements: ["Rewritten with AI assistance"],
    };
  }
}

export async function generateSubjectLines(emailBody: string, currentSubject?: string): Promise<{ subjects: string[] }> {
  const ai = getGeminiClient();

  const prompt = `Generate 5 high-converting, crystal clear email subject line options for this email body:
Current Subject: ${currentSubject || "None"}
Email Body:
${emailBody}

Return JSON:
{
  "subjects": [
    "Option 1 (Direct & Urgent)",
    "Option 2 (Action-Oriented)",
    "Option 3 (Polite & Professional)",
    "Option 4 (Concise / 3-5 words)",
    "Option 5 (Engaging)"
  ]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (err) {
    return { subjects: [currentSubject || "Important Update"] };
  }
}

export async function smartSearchQuery(naturalLanguage: string): Promise<{ gmailQuery: string; explanation: string; filters: Record<string, string> }> {
  const ai = getGeminiClient();

  const prompt = `Convert this natural language email search request into a valid Gmail API search query string.
Examples:
- "emails from Sarah last week with attachments" -> "from:Sarah has:attachment newer_than:7d"
- "unread invoices from Stripe" -> "is:unread from:Stripe invoice"
- "meeting notes from John about Q3 budget" -> "from:John (meeting OR notes) Q3 budget"

Natural Language Request: "${naturalLanguage}"

Return JSON:
{
  "gmailQuery": "The exact valid Gmail search query string",
  "explanation": "Brief explanation of what the query matches",
  "filters": {
    "sender": "sender name or email if specified",
    "hasAttachment": "true/false",
    "isUnread": "true/false",
    "dateRange": "e.g. last 7 days",
    "keywords": "key terms"
  }
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (err) {
    return {
      gmailQuery: naturalLanguage,
      explanation: "Direct keyword search",
      filters: {},
    };
  }
}
