import { z } from "zod"

const resourceIds = ["mdn-learn", "web-dev", "react-learn", "cpp-reference", "cses", "cp-algorithms", "kaggle", "ml-crash-course", "sklearn", "github-skills"] as const

export const roadmapRequestSchema = z.object({
  goal: z.string().trim().min(5).max(220),
  domain: z.string().trim().min(2).max(80),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  skills: z.array(z.string().trim().min(1).max(60)).max(12),
  weeklyHours: z.number().int().min(1).max(40),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict()

const roadmapTaskSchema = z.object({
  title: z.string().trim().min(4).max(100),
  instructions: z.string().trim().min(12).max(320),
}).strict()

const roadmapStageSchema = z.object({
  title: z.string().trim().min(4).max(80),
  milestone: z.string().trim().min(8).max(180),
  tasks: z.array(roadmapTaskSchema).length(2),
  resources: z.array(z.enum(resourceIds)).min(1).max(3),
}).strict()

export const roadmapContentSchema = z.object({
  recommendedNextStep: z.string().trim().min(4).max(140),
  stages: z.array(roadmapStageSchema).length(3),
}).strict()

export const sessionSummaryRequestSchema = z.object({
  notes: z.string().trim().min(4).max(12000),
}).strict()

const quotedTextSchema = z.string().trim().min(2).max(500)

export const sessionInsightsSchema = z.object({
  summaryQuotes: z.array(quotedTextSchema).max(3),
  discussionQuotes: z.array(quotedTextSchema).max(6),
  challengeQuotes: z.array(quotedTextSchema).max(5),
  nextStepQuotes: z.array(quotedTextSchema).max(6),
  actionQuotes: z.array(quotedTextSchema).max(5),
}).strict()

export const profileInsightsRequestSchema = z.object({
  domain: z.string().trim().min(2).max(80),
  learningGoal: z.string().trim().max(220),
  interestTags: z.array(z.string().trim().min(1).max(60)).max(12),
  metrics: z.object({
    completedResources: z.number().int().min(0).max(1000),
    totalResources: z.number().int().min(0).max(1000),
    overdueResources: z.number().int().min(0).max(1000),
    points: z.number().int().min(0).max(1_000_000),
    leaderboardRank: z.number().int().min(1).max(1000).nullable(),
    sessionsAttended: z.number().int().min(0).max(1000),
    sessionsMissed: z.number().int().min(0).max(1000),
  }).strict(),
  recommendationOptions: z.array(z.object({ id: z.string().min(1).max(180), title: z.string().trim().min(2).max(120), kind: z.enum(["task", "resource"]) }).strict()).max(12),
}).strict()

export const profileInsightsSchema = z.object({
  summary: z.string().trim().min(20).max(360),
  recommendationIds: z.array(z.string().min(1).max(180)).max(3),
}).strict()

export type RoadmapRequest = z.infer<typeof roadmapRequestSchema>
export type SessionInsightsContent = z.infer<typeof sessionInsightsSchema>
export type ProfileInsightsRequest = z.infer<typeof profileInsightsRequestSchema>
export type ProfileInsightsContent = z.infer<typeof profileInsightsSchema>
