import { NextRequest } from "next/server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { TrendResult } from "@/lib/types";

const insightSchema = z.object({
  summary: z.string().describe("2-3 sentence analysis of why this is trending"),
  opportunities: z
    .array(z.string())
    .describe("3 specific business/content opportunities"),
  targetAudience: z
    .string()
    .describe("Who should pay attention to this trend"),
  riskLevel: z.enum(["low", "medium", "high"]).describe("Risk of acting on this trend"),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Return a mock insight when no API key
    return Response.json({
      summary:
        "This topic is generating significant discussion across multiple platforms. The cross-platform interest suggests genuine momentum rather than a temporary spike.",
      opportunities: [
        "Create educational content targeting early adopters",
        "Build tools or resources for this growing community",
        "Position as a thought leader while the space is still emerging",
      ],
      targetAudience:
        "Content creators, indie developers, and small business owners looking for emerging opportunities.",
      riskLevel: "medium",
    });
  }

  try {
    const trend: TrendResult = await req.json();

    const anthropic = createAnthropic({ apiKey });

    const sourceSummary = trend.sources
      .map(
        (s) =>
          `${s.label}: score ${s.score}/100, ${s.dataPoints.length} data points${
            s.sampleItems?.length
              ? `, top posts: ${s.sampleItems
                  .slice(0, 3)
                  .map((i) => `"${i.title}" (${i.score} pts)`)
                  .join(", ")}`
              : ""
          }`
      )
      .join("\n");

    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20241022"),
      schema: insightSchema,
      prompt: `You are a trend analyst for indie makers and small businesses. Analyze this trending topic and provide actionable insights.

Topic: "${trend.keyword}"
Composite Score: ${trend.compositeScore}/100
Momentum: ${trend.momentum}
Sources:
${sourceSummary}

Provide a concise, actionable analysis. Focus on practical opportunities for indie makers, content creators, and small e-commerce sellers. Be specific, not generic.`,
      maxTokens: 500,
    });

    return Response.json(object);
  } catch (err) {
    console.error("Insight generation error:", err);
    return Response.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
