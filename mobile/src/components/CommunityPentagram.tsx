import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Polygon, G, Line } from 'react-native-svg';

const SIZE = 80;
const CENTER = { x: SIZE / 2, y: SIZE / 2 };
const RADIUS = SIZE * 0.3;

interface ScoreAggregate {
  avgLyricism: number;
  avgProduction: number;
  avgVocals: number;
  avgFlow: number;
  avgVibe: number;
  totalReviews: number;
}

const AXES = [
  { key: 'avgLyricism' as keyof ScoreAggregate, angle: -90 },
  { key: 'avgProduction' as keyof ScoreAggregate, angle: -18 },
  { key: 'avgVibe' as keyof ScoreAggregate, angle: 54 },
  { key: 'avgVocals' as keyof ScoreAggregate, angle: 126 },
  { key: 'avgFlow' as keyof ScoreAggregate, angle: 198 },
];

interface Props {
  aggregate: ScoreAggregate;
  onPress?: () => void;
}

export function CommunityPentagram({ aggregate, onPress }: Props) {
  const valueToPoint = (value: number, angle: number) => {
    const normalized = value / 100; // Convert 0-100 to 0-1
    const rad = (angle * Math.PI) / 180;
    return {
      x: CENTER.x + Math.cos(rad) * (normalized * RADIUS),
      y: CENTER.y + Math.sin(rad) * (normalized * RADIUS),
    };
  };

  const polygonPoints = AXES.map(axis => {
    const p = valueToPoint(aggregate[axis.key] as number, axis.angle);
    return `${p.x},${p.y}`;
  }).join(' ');

  const totalScore = Math.round(
    (aggregate.avgLyricism +
      aggregate.avgProduction +
      aggregate.avgVocals +
      aggregate.avgFlow +
      aggregate.avgVibe) /
      5
  );

  const content = (
    <View className="items-center justify-center bg-black/80 rounded-lg p-2 border border-yellow-500/30">
      <Text className="text-[8px] text-yellow-500 tracking-widest mb-1">COMMUNITY</Text>
      <Svg width={SIZE} height={SIZE}>
        {/* Background Web */}
        {[0.5, 1.0].map((scale, i) => (
          <Polygon
            key={i}
            points={AXES.map(a => {
              const p = valueToPoint(scale * 100, a.angle);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="transparent"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
        ))}

        {/* Axis Lines */}
        {AXES.map((axis, i) => {
          const end = valueToPoint(100, axis.angle);
          return (
            <Line
              key={i}
              x1={CENTER.x}
              y1={CENTER.y}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Community Rating Polygon */}
        <Polygon
          points={polygonPoints}
          fill="rgba(212, 175, 55, 0.2)"
          stroke="#D4AF37"
          strokeWidth="1.5"
        />
      </Svg>

      <View className="mt-1 items-center">
        <Text className="text-white font-bold text-lg">{totalScore}</Text>
        <Text className="text-[8px] text-neutral-500">{aggregate.totalReviews} REVIEWS</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-70">
        {content}
      </Pressable>
    );
  }

  return content;
}
