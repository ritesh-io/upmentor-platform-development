import type { SessionInsightsContent } from "@/lib/upmentor-ai-contracts"

const actionLanguage = /\b(i will|we will|we agreed|next step|follow[- ]?up|action item|before (our|the) next|plan to|should|need to|try to|complete|build|practice|prepare|send|review|write|create|refine)\b/i
const challengeLanguage = /\b(blocked|stuck|challenge|difficult|unclear|issue|struggl|confus|could not|couldn't|cannot|can't)\b/i

function uniqueVerbatimLines(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

export function makeRuleBasedSessionInsights(notes: string): SessionInsightsContent {
  const sentences = uniqueVerbatimLines(notes.split(/\r?\n|(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length >= 3))
  const actions = sentences.filter((sentence) => actionLanguage.test(sentence)).slice(0, 5)
  return {
    summaryQuotes: sentences.slice(0, 3),
    discussionQuotes: sentences.slice(0, 6),
    challengeQuotes: sentences.filter((sentence) => challengeLanguage.test(sentence)).slice(0, 5),
    nextStepQuotes: actions.slice(0, 6),
    actionQuotes: actions,
  }
}

export function keepVerbatimQuotes(notes: string, quotes: string[]) {
  const unique = uniqueVerbatimLines(quotes)
  return unique.filter((quote) => notes.includes(quote))
}

export function verifySessionInsights(notes: string, content: SessionInsightsContent): SessionInsightsContent {
  return {
    summaryQuotes: keepVerbatimQuotes(notes, content.summaryQuotes).slice(0, 3),
    discussionQuotes: keepVerbatimQuotes(notes, content.discussionQuotes).slice(0, 6),
    challengeQuotes: keepVerbatimQuotes(notes, content.challengeQuotes).slice(0, 5),
    nextStepQuotes: keepVerbatimQuotes(notes, content.nextStepQuotes).slice(0, 6),
    actionQuotes: keepVerbatimQuotes(notes, content.actionQuotes).slice(0, 5),
  }
}
