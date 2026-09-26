import type { Scenario } from "@/lib/types";

/**
 * Built-in conversation scenarios. The scenario system is data-only, so new
 * scenarios can be added (or loaded from a DB/CMS later) without touching
 * conversation logic.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: "random",
    title: "Random Conversation",
    emoji: "🎲",
    description: "Anything goes — a spontaneous chat about whatever emerges.",
    aiRole: "a curious friend with no agenda",
    userRole: "yourself",
    startingPrompt:
      "Hey! I was just thinking — what's something small that made you smile today?",
    hintPrompts: [
      "Ask me about my day",
      "What are your plans for the weekend?",
      "Tell me something interesting you learned",
    ],
    tags: ["casual"],
  },
  {
    id: "daily-life",
    title: "Daily Life",
    emoji: "☀️",
    description: "Talk through your routine, habits, and everyday moments.",
    aiRole: "a friendly neighbour catching up over coffee",
    userRole: "yourself",
    startingPrompt: "Morning! How's your day going so far?",
    hintPrompts: [
      "What do you usually do after work?",
      "Tell me about your morning routine",
      "What did you have for lunch?",
    ],
    tags: ["casual", "routine"],
  },
  {
    id: "introductions",
    title: "Meeting New People",
    emoji: "👋",
    description: "First impressions — introductions, small talk, and rapport.",
    aiRole: "someone you just met at a community event",
    userRole: "yourself",
    startingPrompt:
      "Hi there! I don't think we've met — I'm Sam. What's your name?",
    hintPrompts: [
      "Where are you from?",
      "What do you do for work?",
      "How did you hear about this event?",
    ],
    tags: ["social"],
  },
  {
    id: "friends",
    title: "Friends & Hangouts",
    emoji: "🎉",
    description: "Making plans, sharing stories, joking around like old friends.",
    aiRole: "your close friend Alex",
    userRole: "yourself",
    startingPrompt:
      "Dude, long time! We should hang out soon. What are you up to this weekend?",
    hintPrompts: [
      "Want to grab food this weekend?",
      "You won't believe what happened yesterday",
      "Remember that trip we took?",
    ],
    tags: ["casual", "social"],
  },
  {
    id: "restaurant",
    title: "Restaurant",
    emoji: "🍽️",
    description: "Ordering food, asking about the menu, and paying the bill.",
    aiRole: "a waiter at a cozy local restaurant",
    userRole: "a customer",
    startingPrompt:
      "Welcome! Table for one? Here's the menu — can I get you something to drink while you look it over?",
    hintPrompts: [
      "What do you recommend?",
      "Can I see the dessert menu?",
      "I'm allergic to peanuts",
    ],
    tags: ["travel", "everyday"],
  },
  {
    id: "coffee-shop",
    title: "Coffee Shop",
    emoji: "☕",
    description: "Ordering drinks, chatting with the barista, small talk at the counter.",
    aiRole: "a cheerful barista at a busy coffee shop",
    userRole: "a customer",
    startingPrompt: "Hi! Welcome in — the usual, or something new today?",
    hintPrompts: [
      "Can I get a large oat latte?",
      "What's good with pastries here?",
      "Do you have a quieter spot to work?",
    ],
    tags: ["everyday"],
  },
  {
    id: "shopping",
    title: "Shopping",
    emoji: "🛍️",
    description: "Finding sizes, asking for help, comparing prices, returns.",
    aiRole: "a helpful shop assistant",
    userRole: "a shopper",
    startingPrompt:
      "Hi! Let me know if you need help finding anything — are you looking for something in particular?",
    hintPrompts: [
      "Do you have this in a medium?",
      "Is there a discount if I take two?",
      "Can I return this if it doesn't fit?",
    ],
    tags: ["everyday"],
  },
  {
    id: "travel",
    title: "Travel",
    emoji: "✈️",
    description: "Trains, taxis, directions, and travel-day small talk.",
    aiRole: "a friendly traveller you met on the train",
    userRole: "yourself",
    startingPrompt:
      "Is this seat taken? Mind if I ask — are you heading into the city too?",
    hintPrompts: [
      "Where are you travelling from?",
      "What's the best thing to see there?",
      "How long will the trip take?",
    ],
    tags: ["travel"],
  },
  {
    id: "airport",
    title: "Airport",
    emoji: "🛫",
    description: "Check-in, security, boarding gates, and delayed flights.",
    aiRole: "an airline check-in agent",
    userRole: "a passenger",
    startingPrompt:
      "Good morning! Passport and booking reference, please. Are you checking any bags today?",
    hintPrompts: [
      "Can I get a window seat?",
      "Which gate is my flight?",
      "My flight was delayed yesterday",
    ],
    tags: ["travel"],
  },
  {
    id: "hotel",
    title: "Hotel",
    emoji: "🏨",
    description: "Check-in, room requests, complaints, and asking about the area.",
    aiRole: "a hotel front-desk clerk",
    userRole: "a guest",
    startingPrompt:
      "Welcome to the Harborview Hotel! Checking in? May I have your name, please?",
    hintPrompts: [
      "Is breakfast included?",
      "The air conditioning isn't working",
      "Can I get a late checkout?",
    ],
    tags: ["travel"],
  },
  {
    id: "job-interview",
    title: "Job Interview",
    emoji: "💼",
    description: "Practising answers to common and tricky interview questions.",
    aiRole: "a calm, professional hiring manager",
    userRole: "a job candidate",
    startingPrompt:
      "Thanks for coming in today! To start — could you tell me a little about yourself?",
    hintPrompts: [
      "Why do you want this role?",
      "Tell me about a challenge you overcame",
      "Where do you see yourself in five years?",
    ],
    tags: ["career", "formal"],
  },
  {
    id: "developer-interview",
    title: "Developer Interview",
    emoji: "💻",
    description: "Technical conversation — systems, trade-offs, and past projects.",
    aiRole: "a senior engineer conducting a technical chat",
    userRole: "a developer candidate",
    startingPrompt:
      "Hey, thanks for joining! Let's start with your background — what have you been building lately?",
    hintPrompts: [
      "Tell me about a hard bug you fixed",
      "How would you design a URL shortener?",
      "What's your experience with databases?",
    ],
    tags: ["career", "tech"],
  },
  {
    id: "workplace",
    title: "Workplace",
    emoji: "🏢",
    description: "Colleague chats — updates, deadlines, feedback, office small talk.",
    aiRole: "your project lead checking in",
    userRole: "a team member",
    startingPrompt:
      "Hey, got a minute? I wanted to check how the project is going.",
    hintPrompts: [
      "The deadline might slip",
      "I finished the task early",
      "Can we reschedule the meeting?",
    ],
    tags: ["career", "formal"],
  },
  {
    id: "meeting-people",
    title: "Networking Event",
    emoji: "🤝",
    description: "Working a room — professional small talk and follow-ups.",
    aiRole: "a friendly professional at a networking event",
    userRole: "yourself",
    startingPrompt:
      "Hi! Are you enjoying the event? I'm Jordan — I work in logistics. What brings you here?",
    hintPrompts: [
      "What line of work are you in?",
      "How did you get started in your field?",
      "Do you come to these often?",
    ],
    tags: ["social", "career"],
  },
  {
    id: "dating",
    title: "First Date",
    emoji: "🌹",
    description: "Easy, playful social conversation — getting to know someone.",
    aiRole: "your match on a relaxed first date",
    userRole: "yourself",
    startingPrompt:
      "Hey, it's really nice to finally meet you in person! How was getting here?",
    hintPrompts: [
      "What do you do for fun?",
      "You mentioned you like cooking?",
      "What's your favourite place you've visited?",
    ],
    tags: ["social"],
  },
  {
    id: "doctor",
    title: "At the Doctor",
    emoji: "🩺",
    description: "Describing symptoms, understanding advice, asking questions.",
    aiRole: "a caring doctor",
    userRole: "a patient",
    startingPrompt:
      "Hello! So, what brings you in today? How have you been feeling?",
    hintPrompts: [
      "I've had a headache for three days",
      "What are the side effects?",
      "How often should I take this?",
    ],
    tags: ["everyday"],
  },
];

export const SCENARIO_BY_ID: ReadonlyMap<string, Scenario> = new Map(
  SCENARIOS.map((s) => [s.id, s]),
);

export function getScenario(id: string): Scenario {
  return SCENARIO_BY_ID.get(id) ?? SCENARIOS[0]!;
}

/** Topic for "custom" mode — the AI treats this as the conversation focus. */
export const CUSTOM_SCENARIO_ID = "custom";

export function customScenario(topic: string): Scenario {
  return {
    id: CUSTOM_SCENARIO_ID,
    title: topic,
    emoji: "💬",
    description: `Chat about: ${topic}`,
    aiRole: "an enthusiastic conversation partner who knows a lot about the topic",
    userRole: "yourself",
    startingPrompt: `I heard you wanted to talk about ${topic} — sounds fun! Where should we start?`,
    hintPrompts: [`Why do you like ${topic}?`, `Tell me more about ${topic}`],
    tags: ["custom"],
  };
}

export function resolveScenario(id: string, customTopic: string | null): Scenario {
  if (id === CUSTOM_SCENARIO_ID && customTopic?.trim()) {
    return customScenario(customTopic.trim());
  }
  return getScenario(id);
}

/** Random scenario for "random conversation" quick-starts. */
export function pickRandomScenario(excludeId?: string): Scenario {
  const pool = SCENARIOS.filter((s) => s.id !== excludeId && s.id !== "random");
  return pool[Math.floor(Math.random() * pool.length)] ?? SCENARIOS[0]!;
}
