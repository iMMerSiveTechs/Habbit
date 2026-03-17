import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type FutureSelfCardProps = {
  userName: string;
  category: string;
  identity: string;
  bigWhy: string;
  integrity: number;
  habitCount: number;
  longestStreak: number;
};

const getCategoryEmoji = (cat: string): string => {
  if (cat.includes("Health")) return "🏃";
  if (cat.includes("Mind")) return "🧘";
  if (cat.includes("Career")) return "💼";
  if (cat.includes("Money")) return "💰";
  if (cat.includes("Relation")) return "❤️";
  return "🌱";
};

export function FutureSelfCard({
  userName,
  category,
  identity,
  bigWhy,
  integrity,
  habitCount,
  longestStreak,
}: FutureSelfCardProps) {
  const emoji = getCategoryEmoji(category);
  const safeBigWhy = bigWhy ?? "";
  const bigWhyTruncated = safeBigWhy.length > 80 ? safeBigWhy.slice(0, 80) + "…" : safeBigWhy;

  return (
    <View
      style={{
        aspectRatio: 3 / 5,
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={["#0D1929", "#1a0a3e", "#050813"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, padding: 24 }}
      >
        {/* Radial glow — top-left purple blob */}
        <View
          style={{
            position: "absolute",
            top: -60,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: "#8B5CF6",
            opacity: 0.18,
          }}
        />

        {/* Wordmark */}
        <Text
          style={{
            color: "rgba(255,255,255,0.28)",
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 3,
            marginBottom: 20,
          }}
        >
          HABIT
        </Text>

        {/* Category emoji */}
        <Text style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</Text>

        {/* Future Self label */}
        <Text
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 11,
            letterSpacing: 2.5,
            fontWeight: "600",
            marginBottom: 4,
          }}
        >
          FUTURE SELF
        </Text>

        {/* User name */}
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 26,
            fontWeight: "900",
            letterSpacing: -0.5,
          }}
        >
          {userName}
        </Text>

        {/* Identity statement */}
        <Text
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 15,
            fontStyle: "italic",
            marginTop: 10,
            lineHeight: 22,
          }}
        >
          {identity}
        </Text>

        {/* Divider */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.1)",
            marginTop: 20,
            marginBottom: 20,
          }}
        />

        {/* Stats row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {/* Integrity */}
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text
              style={{
                color: "#00D4FF",
                fontSize: 22,
                fontWeight: "900",
              }}
            >
              {integrity}%
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 1.5,
                marginTop: 2,
              }}
            >
              INTEGRITY
            </Text>
          </View>

          {/* Divider */}
          <View
            style={{
              width: 1,
              backgroundColor: "rgba(255,255,255,0.1)",
              marginHorizontal: 8,
            }}
          />

          {/* Habits */}
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text
              style={{
                color: "#00D4FF",
                fontSize: 22,
                fontWeight: "900",
              }}
            >
              {habitCount}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 1.5,
                marginTop: 2,
              }}
            >
              HABITS
            </Text>
          </View>

          {/* Divider */}
          <View
            style={{
              width: 1,
              backgroundColor: "rgba(255,255,255,0.1)",
              marginHorizontal: 8,
            }}
          />

          {/* Streak */}
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text
              style={{
                color: "#00D4FF",
                fontSize: 22,
                fontWeight: "900",
              }}
            >
              {longestStreak}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 1.5,
                marginTop: 2,
              }}
            >
              DAY STREAK
            </Text>
          </View>
        </View>

        {/* Big Why quote */}
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 11,
            fontStyle: "italic",
            marginTop: 20,
            lineHeight: 16,
          }}
          numberOfLines={2}
        >
          &quot;{bigWhyTruncated}&quot;
        </Text>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Bottom wordmark */}
        <Text
          style={{
            color: "rgba(255,255,255,0.18)",
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 1,
            marginTop: 16,
          }}
        >
          habit.app
        </Text>
      </LinearGradient>
    </View>
  );
}
