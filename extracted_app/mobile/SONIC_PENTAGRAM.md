# Sonic Pentagram - Implementation Guide

## Overview

The **Sonic Pentagram** is a multi-dimensional music critique system that allows users to rate tracks across 5 key dimensions: Lyricism, Production, Vocals, Flow, and Vibe. This creates high-fidelity taste data that powers personalized music discovery.

## Architecture

### Database Schema

```typescript
// Track - Stores track metadata
model Track {
  id           String
  spotifyId    String? @unique
  title        String
  artist       String
  album        String?
  duration     Int?
  imageUrl     String?
  previewUrl   String?
  scores       TrackScore[]
  aggregate    TrackScoreAggregate?
  playHistory  PlayHistory[]
}

// TrackScore - Individual user ratings
model TrackScore {
  id         String
  lyricism   Int      // 0-100
  production Int      // 0-100
  vocals     Int      // 0-100
  flow       Int      // 0-100
  vibe       Int      // 0-100
  comment    String?
  isSpoiler  Boolean
  profileId  Int
  trackId    String
}

// TrackScoreAggregate - Community averages
model TrackScoreAggregate {
  trackId        String @id
  avgLyricism    Float
  avgProduction  Float
  avgVocals      Float
  avgFlow        Float
  avgVibe        Float
  totalReviews   Int
}

// UserPreference - Taste profile weights
model UserPreference {
  profileId            Int @unique
  weightLyricism       Float @default(1.0)  // 0.0 - 2.0
  weightProduction     Float @default(1.0)
  weightVocals         Float @default(1.0)
  weightFlow           Float @default(1.0)
  weightVibe           Float @default(1.0)
  discoverySensitivity Float @default(0.5)
}

// PlayHistory - Track play tracking
model PlayHistory {
  profileId      Int
  trackId        String
  playedAt       DateTime
  playCount      Int
  ratingPrompted Boolean @default(false)
}
```

### API Endpoints

#### POST /api/tracks/score
Submit a track rating.

```typescript
Request:
{
  trackId?: string,        // Optional - will create if not exists
  spotifyId?: string,      // Optional - for Spotify integration
  title: string,
  artist: string,
  album?: string,
  duration?: number,
  imageUrl?: string,
  previewUrl?: string,
  scores: {
    lyricism: number,      // 0-1 (will be converted to 0-100)
    production: number,
    vocals: number,
    flow: number,
    vibe: number
  },
  comment?: string,
  isSpoiler?: boolean
}

Response:
{
  success: boolean,
  score: TrackScore,
  aggregate: TrackScoreAggregate
}
```

#### GET /api/tracks/:trackId
Get track details with community and user scores.

```typescript
Response:
{
  track: Track,
  aggregate: TrackScoreAggregate | null,
  userScore: TrackScore | null
}
```

#### GET /api/tracks/:trackId/scores
Get all scores for a track.

```typescript
Response:
{
  scores: TrackScore[],
  aggregate: TrackScoreAggregate | null,
  userScore: TrackScore | null
}
```

#### POST /api/tracks/:trackId/play
Record a track play and check if rating prompt should appear.

```typescript
Response:
{
  success: boolean,
  playCount: number,
  shouldPromptRating: boolean  // true after 3rd play
}
```

#### GET /api/preferences
Get user's taste preferences.

```typescript
Response:
{
  weightLyricism: number,
  weightProduction: number,
  weightVocals: number,
  weightFlow: number,
  weightVibe: number,
  discoverySensitivity: number
}
```

#### PATCH /api/preferences
Update user's taste preferences.

## Frontend Components

### SonicPentagram
Interactive radar chart for rating tracks.

```tsx
import { SonicPentagram } from '@/components/SonicPentagram';

<SonicPentagram
  initialScores={{
    lyricism: 0.7,
    production: 0.8,
    vocals: 0.6,
    flow: 0.5,
    vibe: 0.9
  }}
  onChange={(scores) => console.log(scores)}
  readOnly={false}
  showScore={true}
/>
```

### TrackRatingModal
Full-screen modal for submitting track ratings.

```tsx
import { TrackRatingModal } from '@/components/TrackRatingModal';

<TrackRatingModal
  visible={showModal}
  onClose={() => setShowModal(false)}
  onSubmit={(scores, comment) => {
    // Submit to API
    api.post('/tracks/score', {
      title: track.title,
      artist: track.artist,
      scores,
      comment
    });
  }}
  track={{
    title: "King Kunta",
    artist: "Kendrick Lamar",
    imageUrl: "https://..."
  }}
/>
```

### CommunityPentagram
Compact pentagram overlay showing community ratings.

```tsx
import { CommunityPentagram } from '@/components/CommunityPentagram';

<CommunityPentagram
  aggregate={{
    avgLyricism: 85,
    avgProduction: 92,
    avgVocals: 78,
    avgFlow: 88,
    avgVibe: 80,
    totalReviews: 247
  }}
  onPress={() => showFullScores()}
/>
```

## Taste Learning Algorithm

The system automatically learns user preferences based on their ratings:

```typescript
// When a user rates a track highly (>80/100)
if (totalRating > 80) {
  // Check which dimensions the track is strong in (community avg > 80)
  if (trackAggregate.avgLyricism > 80) {
    userPrefs.weightLyricism += 0.05  // Increase weight (max 2.0)
  }
  // Repeat for all dimensions
}
```

This creates a user taste profile that can be used for:
- Personalized recommendations
- Discovery filters
- Compatibility scoring

## Usage Flow

1. **User plays a track** → POST /api/tracks/:trackId/play
2. **After 3 plays** → `shouldPromptRating: true`
3. **Show TrackRatingModal** → User drags pentagram nodes
4. **Submit rating** → POST /api/tracks/score
5. **Update aggregates** → Recalculate community averages
6. **Update user preferences** → Learn from their taste
7. **Show CommunityPentagram** → Display on track cards

## Future Enhancements

- **Discovery Filter**: Search tracks by dimension scores (e.g., "Lyricism > 80")
- **Taste Compatibility**: Show compatibility % with other users
- **Top Critics**: Leaderboard for most insightful reviewers
- **Pentagram Comparison**: Compare your rating vs community
- **Spoiler Warnings**: Hide comments marked as spoilers
