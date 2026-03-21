import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { MapPin } from "lucide-react-native";

type RouteMapCardProps = {
  userName: string | null;
  goal: { bigWhy: string; identity: string | null; purpose: string } | null;
  habits: any[];
  integrity: number;
  todayCompletedCount: number;
  todayTotalCount: number;
  onPress?: () => void;
};

export function RouteMapCard({
  userName,
  goal,
  habits,
  integrity,
  todayCompletedCount,
  todayTotalCount,
  onPress,
}: RouteMapCardProps) {
  const integrityColor = integrity >= 80 ? "#00FFB3" : integrity >= 50 ? "#00D4FF" : "#FF00E5";

  const destinationText = goal?.identity
    ? goal.identity
    : goal?.purpose
    ? goal.purpose
    : "Define your Future Self →";

  const bigWhyText = goal?.bigWhy
    ? goal.bigWhy.length > 60
      ? goal.bigWhy.slice(0, 60) + "…"
      : goal.bigWhy
    : null;

  const habitBadges = habits.slice(0, 3);

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <GlassCard>
        <LinearGradient
          colors={["rgba(0,212,255,0.05)", "rgba(139,92,246,0.05)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 20 }}
        >
          {/* Top-right map icon */}
          <View style={{ position: "absolute", top: 16, right: 16, opacity: 0.4 }}>
            <MapPin size={20} color="#00D4FF" />
          </View>

          {/* Route layout */}
          <View style={{ flexDirection: "row" }}>
            {/* Left rail — dots and connecting line */}
            <View style={{ width: 20, alignItems: "center", marginRight: 14 }}>
              {/* NOW dot */}
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#00D4FF",
                  marginTop: 4,
                  zIndex: 1,
                  shadowColor: "#00D4FF",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              />
              {/* Dashed connector line */}
              <View
                style={{
                  flex: 1,
                  width: 1,
                  marginVertical: 4,
                  // Simulated dashed line with opacity
                  backgroundColor: "rgba(255,255,255,0.15)",
                }}
              />
              {/* DESTINATION dot (hollow) */}
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  borderWidth: 2,
                  borderColor: "#8B5CF6",
                  backgroundColor: "transparent",
                  marginBottom: 2,
                  zIndex: 1,
                }}
              />
            </View>

            {/* Right content */}
            <View style={{ flex: 1 }}>
              {/* Row 1 — NOW */}
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    color: "rgba(0,212,255,0.6)",
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 2,
                    marginBottom: 4,
                  }}
                >
                  YOU ARE HERE
                </Text>
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
                  Building consistency{" "}
                  <Text style={{ color: integrityColor, fontWeight: "700" }}>{integrity}%</Text>
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>
                  {todayCompletedCount} of {todayTotalCount} habits on track today
                </Text>
              </View>

              {/* Row 2 — ROUTE (habit badges) */}
              <View style={{ marginBottom: 16 }}>
                {habitBadges.length > 0 ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {habitBadges.map((habit: any, i: number) => (
                      <View
                        key={habit.id ?? i}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.08)",
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                        }}
                      >
                        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                          {habit.title}
                          {habit.streak ? (
                            <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
                              {" "}
                              {habit.streak}d
                            </Text>
                          ) : null}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                    Start your first habit →
                  </Text>
                )}
              </View>

              {/* Row 3 — DESTINATION */}
              <View>
                <Text
                  style={{
                    color: "rgba(139,92,246,0.6)",
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 2,
                    marginBottom: 4,
                  }}
                >
                  DESTINATION
                </Text>
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
                  {destinationText}
                </Text>
                {bigWhyText ? (
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>
                    {bigWhyText}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </LinearGradient>
      </GlassCard>
    </Pressable>
  );
}
