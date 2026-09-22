// Original meme-card content (emoji + text only — no copied images or trademarked
// characters) mapped to the 7 expressions face-api.js can detect.
const MEME_DECK = {
  happy: {
    label: "Happy",
    order: 1,
    emoji: "😆✨",
    tag: "certified W moment",
    captions: [
      "MAIN CHARACTER ENERGY",
      "LET'S GOOOO 🎉",
      "this is the highlight of my week fr",
    ],
  },
  surprised: {
    label: "Surprised",
    order: 2,
    emoji: "😱⚡",
    tag: "plot twist loading...",
    captions: [
      "WAIT- WHAT",
      "nobody: / me finding out it's monday tomorrow",
      "the audacity. the AUDACITY.",
    ],
  },
  sad: {
    label: "Sad",
    order: 3,
    emoji: "😢💔",
    tag: "not the feels",
    captions: [
      "me at 3am remembering that thing from 2016",
      "it's giving... single tear",
      "why is the WiFi buffering my emotions rn",
    ],
  },
  angry: {
    label: "Angry",
    order: 4,
    emoji: "😤🔥",
    tag: "ANGERY",
    captions: [
      "not the vibe check 💢",
      "delete this. delete this NOW.",
      "the group chat when someone leaves on read",
    ],
  },
  disgusted: {
    label: "Disgusted",
    order: 5,
    emoji: "🤢👎",
    tag: "hard nope",
    captions: [
      "ok that's a HARD no from me",
      "the ick just entered the chat",
      "why would you DO that",
    ],
  },
  fearful: {
    label: "Fearful",
    order: 6,
    emoji: "😨🫣",
    tag: "abort mission",
    captions: [
      "me seeing my search history get read aloud",
      "when the teacher says 'pull out a blank sheet of paper'",
      "*sees group project partner typing* oh no",
    ],
  },
  neutral: {
    label: "Neutral",
    order: 7,
    emoji: "😐📎",
    tag: "npc mode: on",
    captions: [
      "poker face activated",
      "internally screaming, externally fine",
      "just here for the free stickers",
    ],
  },
};

const EXPRESSION_ORDER = Object.keys(MEME_DECK).sort(
  (a, b) => MEME_DECK[a].order - MEME_DECK[b].order
);
