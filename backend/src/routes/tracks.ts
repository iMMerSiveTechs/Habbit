import { Hono } from "hono";
import type { AppType } from "../index";
import { db } from "../db";
import {
  submitTrackScoreRequestSchema,
  getTrackScoresResponseSchema,
  getTrackResponseSchema,
  recordPlayRequestSchema,
  recordPlayResponseSchema,
  submitTrackScoreResponseSchema,
} from "../../../shared/contracts";

const app = new Hono<AppType>();

// POST /api/tracks/score - Submit a track rating
app.post("/score", async (c) => {
  const session = c.get("session");
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: session.userId },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const body = await c.req.json();
  const data = submitTrackScoreRequestSchema.parse(body);

  // Find or create track
  let track = data.trackId
    ? await db.track.findUnique({ where: { id: data.trackId } })
    : data.spotifyId
    ? await db.track.findUnique({ where: { spotifyId: data.spotifyId } })
    : null;

  if (!track) {
    track = await db.track.create({
      data: {
        spotifyId: data.spotifyId,
        title: data.title,
        artist: data.artist,
        album: data.album,
        duration: data.duration,
        imageUrl: data.imageUrl,
        previewUrl: data.previewUrl,
      },
    });
  }

  // Convert 0-1 scores to 0-100
  const intScores = {
    lyricism: Math.round(data.scores.lyricism * 100),
    production: Math.round(data.scores.production * 100),
    vocals: Math.round(data.scores.vocals * 100),
    flow: Math.round(data.scores.flow * 100),
    vibe: Math.round(data.scores.vibe * 100),
  };

  // Create or update score
  const score = await db.trackScore.upsert({
    where: {
      profileId_trackId: {
        profileId: profile.id,
        trackId: track.id,
      },
    },
    create: {
      profileId: profile.id,
      trackId: track.id,
      ...intScores,
      comment: data.comment,
      isSpoiler: data.isSpoiler,
    },
    update: {
      ...intScores,
      comment: data.comment,
      isSpoiler: data.isSpoiler,
    },
  });

  // Recalculate aggregate
  const allScores = await db.trackScore.findMany({
    where: { trackId: track.id },
  });

  const aggregate = await db.trackScoreAggregate.upsert({
    where: { trackId: track.id },
    create: {
      trackId: track.id,
      avgLyricism: allScores.reduce((sum, s) => sum + s.lyricism, 0) / allScores.length,
      avgProduction: allScores.reduce((sum, s) => sum + s.production, 0) / allScores.length,
      avgVocals: allScores.reduce((sum, s) => sum + s.vocals, 0) / allScores.length,
      avgFlow: allScores.reduce((sum, s) => sum + s.flow, 0) / allScores.length,
      avgVibe: allScores.reduce((sum, s) => sum + s.vibe, 0) / allScores.length,
      totalReviews: allScores.length,
    },
    update: {
      avgLyricism: allScores.reduce((sum, s) => sum + s.lyricism, 0) / allScores.length,
      avgProduction: allScores.reduce((sum, s) => sum + s.production, 0) / allScores.length,
      avgVocals: allScores.reduce((sum, s) => sum + s.vocals, 0) / allScores.length,
      avgFlow: allScores.reduce((sum, s) => sum + s.flow, 0) / allScores.length,
      avgVibe: allScores.reduce((sum, s) => sum + s.vibe, 0) / allScores.length,
      totalReviews: allScores.length,
    },
  });

  // Update user preferences based on their rating
  await updateUserTasteFromReview(profile.id, intScores, aggregate);

  return c.json({
    success: true,
    score: {
      ...score,
      createdAt: score.createdAt.toISOString(),
      updatedAt: score.updatedAt.toISOString(),
    },
    aggregate: {
      ...aggregate,
      updatedAt: aggregate.updatedAt.toISOString(),
    },
  });
});

// GET /api/tracks/:trackId - Get track details with scores
app.get("/:trackId", async (c) => {
  const session = c.get("session");
  const trackId = c.req.param("trackId");

  const track = await db.track.findUnique({
    where: { id: trackId },
  });

  if (!track) {
    return c.json({ error: "Track not found" }, 404);
  }

  const aggregate = await db.trackScoreAggregate.findUnique({
    where: { trackId: track.id },
  });

  let userScore = null;
  if (session) {
    const profile = await db.profile.findUnique({
      where: { userId: session.userId },
    });

    if (profile) {
      userScore = await db.trackScore.findUnique({
        where: {
          profileId_trackId: {
            profileId: profile.id,
            trackId: track.id,
          },
        },
      });
    }
  }

  return c.json({
    track: {
      ...track,
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString(),
    },
    aggregate: aggregate
      ? {
          ...aggregate,
          updatedAt: aggregate.updatedAt.toISOString(),
        }
      : null,
    userScore: userScore
      ? {
          ...userScore,
          createdAt: userScore.createdAt.toISOString(),
          updatedAt: userScore.updatedAt.toISOString(),
        }
      : null,
  });
});

// GET /api/tracks/:trackId/scores - Get all scores for a track
app.get("/:trackId/scores", async (c) => {
  const session = c.get("session");
  const trackId = c.req.param("trackId");

  const scores = await db.trackScore.findMany({
    where: { trackId },
    orderBy: { createdAt: "desc" },
  });

  const aggregate = await db.trackScoreAggregate.findUnique({
    where: { trackId },
  });

  let userScore = null;
  if (session) {
    const profile = await db.profile.findUnique({
      where: { userId: session.userId },
    });

    if (profile) {
      userScore = await db.trackScore.findUnique({
        where: {
          profileId_trackId: {
            profileId: profile.id,
            trackId,
          },
        },
      });
    }
  }

  return c.json({
    scores: scores.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    aggregate: aggregate
      ? {
          ...aggregate,
          updatedAt: aggregate.updatedAt.toISOString(),
        }
      : null,
    userScore: userScore
      ? {
          ...userScore,
          createdAt: userScore.createdAt.toISOString(),
          updatedAt: userScore.updatedAt.toISOString(),
        }
      : null,
  });
});

// POST /api/tracks/:trackId/play - Record a play
app.post("/:trackId/play", async (c) => {
  const session = c.get("session");
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: session.userId },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const trackId = c.req.param("trackId");

  // Upsert play history
  const playHistory = await db.playHistory.upsert({
    where: {
      profileId_trackId: {
        profileId: profile.id,
        trackId,
      },
    },
    create: {
      profileId: profile.id,
      trackId,
      playCount: 1,
      playedAt: new Date(),
    },
    update: {
      playCount: {
        increment: 1,
      },
      playedAt: new Date(),
    },
  });

  // Check if we should prompt for rating (after 3 plays)
  const shouldPromptRating = playHistory.playCount >= 3 && !playHistory.ratingPrompted;

  if (shouldPromptRating) {
    await db.playHistory.update({
      where: {
        profileId_trackId: {
          profileId: profile.id,
          trackId,
        },
      },
      data: {
        ratingPrompted: true,
      },
    });
  }

  return c.json({
    success: true,
    playCount: playHistory.playCount,
    shouldPromptRating,
  });
});

// Helper function to update user taste profile based on their ratings
async function updateUserTasteFromReview(
  profileId: number,
  userScore: {
    lyricism: number;
    production: number;
    vocals: number;
    flow: number;
    vibe: number;
  },
  trackAggregate: {
    avgLyricism: number;
    avgProduction: number;
    avgVocals: number;
    avgFlow: number;
    avgVibe: number;
  }
) {
  // Get or create user preferences
  let prefs = await db.userPreference.findUnique({
    where: { profileId },
  });

  if (!prefs) {
    prefs = await db.userPreference.create({
      data: { profileId },
    });
  }

  // Calculate total user rating
  const totalRating =
    (userScore.lyricism +
      userScore.production +
      userScore.vocals +
      userScore.flow +
      userScore.vibe) /
    5;

  // If user loved this track (>80), increase weights for its strong attributes
  if (totalRating > 80) {
    const updates: Record<string, number> = {};

    if (trackAggregate.avgLyricism > 80) {
      updates.weightLyricism = Math.min(2.0, prefs.weightLyricism + 0.05);
    }
    if (trackAggregate.avgProduction > 80) {
      updates.weightProduction = Math.min(2.0, prefs.weightProduction + 0.05);
    }
    if (trackAggregate.avgVocals > 80) {
      updates.weightVocals = Math.min(2.0, prefs.weightVocals + 0.05);
    }
    if (trackAggregate.avgFlow > 80) {
      updates.weightFlow = Math.min(2.0, prefs.weightFlow + 0.05);
    }
    if (trackAggregate.avgVibe > 80) {
      updates.weightVibe = Math.min(2.0, prefs.weightVibe + 0.05);
    }

    if (Object.keys(updates).length > 0) {
      await db.userPreference.update({
        where: { profileId },
        data: updates,
      });
    }
  }
}

export default app;
