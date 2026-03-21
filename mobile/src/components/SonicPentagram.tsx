import React, { useState, useRef } from 'react';
import { View, Text, PanResponder, Animated, Dimensions } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText, G } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIZE = Math.min(SCREEN_WIDTH - 80, 400);
const CENTER = { x: SIZE / 2, y: SIZE / 2 };
const RADIUS = SIZE * 0.3;

interface ScoreProfile {
  lyricism: number;
  production: number;
  vocals: number;
  flow: number;
  vibe: number;
}

const AXES = [
  { id: 'lyricism' as keyof ScoreProfile, label: 'LYRICISM', angle: -90 },
  { id: 'production' as keyof ScoreProfile, label: 'PRODUCTION', angle: -18 },
  { id: 'vibe' as keyof ScoreProfile, label: 'VIBE', angle: 54 },
  { id: 'vocals' as keyof ScoreProfile, label: 'VOCALS', angle: 126 },
  { id: 'flow' as keyof ScoreProfile, label: 'FLOW', angle: 198 },
];

interface Props {
  initialScores?: ScoreProfile;
  onChange?: (scores: ScoreProfile) => void;
  readOnly?: boolean;
  showScore?: boolean;
}

export function SonicPentagram({
  initialScores = { lyricism: 0.7, production: 0.8, vibe: 0.5, vocals: 0.6, flow: 0.4 },
  onChange,
  readOnly = false,
  showScore = true
}: Props) {
  const [scores, setScores] = useState<ScoreProfile>(initialScores);
  const [draggedAxis, setDraggedAxis] = useState<keyof ScoreProfile | null>(null);

  const valueToPoint = (value: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: CENTER.x + Math.cos(rad) * (value * RADIUS),
      y: CENTER.y + Math.sin(rad) * (value * RADIUS),
    };
  };

  const pointToValue = (x: number, y: number) => {
    const dx = x - CENTER.x;
    const dy = y - CENTER.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0.1, Math.min(1.0, dist / RADIUS));
  };

  const createPanResponder = (axis: keyof ScoreProfile) => {
    if (readOnly) return null;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setDraggedAxis(axis);
      },
      onPanResponderMove: (_, gestureState) => {
        const x = gestureState.moveX - (SCREEN_WIDTH - SIZE) / 2;
        const y = gestureState.moveY - 100; // Approximate offset
        const newValue = pointToValue(x, y);

        const newScores = { ...scores, [axis]: newValue };
        setScores(newScores);
        onChange?.(newScores);
      },
      onPanResponderRelease: () => {
        setDraggedAxis(null);
      },
    });
  };

  const panResponders = {
    lyricism: createPanResponder('lyricism'),
    production: createPanResponder('production'),
    vocals: createPanResponder('vocals'),
    flow: createPanResponder('flow'),
    vibe: createPanResponder('vibe'),
  };

  const polygonPoints = AXES.map(axis => {
    const p = valueToPoint(scores[axis.id], axis.angle);
    return `${p.x},${p.y}`;
  }).join(' ');

  const totalScore = Math.round(
    (Object.values(scores).reduce((a, b) => a + b, 0) / 5) * 100
  );

  return (
    <View className="items-center justify-center">
      <Svg width={SIZE} height={SIZE}>
        {/* Background Web Rings */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, i) => (
          <Polygon
            key={i}
            points={AXES.map(a => {
              const p = valueToPoint(scale, a.angle);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="transparent"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}

        {/* Axis Lines */}
        {AXES.map(axis => {
          const end = valueToPoint(1.0, axis.angle);
          const labelPos = valueToPoint(1.25, axis.angle);
          return (
            <G key={axis.id}>
              <Line
                x1={CENTER.x}
                y1={CENTER.y}
                x2={end.x}
                y2={end.y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              <SvgText
                x={labelPos.x}
                y={labelPos.y}
                fill="#888"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {axis.label}
              </SvgText>
            </G>
          );
        })}

        {/* User's Rating Polygon */}
        <Polygon
          points={polygonPoints}
          fill="rgba(212, 175, 55, 0.15)"
          stroke="#D4AF37"
          strokeWidth="2"
        />

        {/* Draggable Nodes */}
        {AXES.map(axis => {
          const p = valueToPoint(scores[axis.id], axis.angle);
          const isDragging = draggedAxis === axis.id;
          return (
            <Circle
              key={axis.id}
              cx={p.x}
              cy={p.y}
              r={isDragging ? 8 : 6}
              fill={isDragging ? '#FFF' : '#D4AF37'}
              {...(panResponders[axis.id]?.panHandlers || {})}
            />
          );
        })}
      </Svg>

      {/* Center Score Display */}
      {showScore && (
        <View className="absolute" style={{ top: SIZE / 2 - 20, left: SIZE / 2 - 30 }}>
          <Text className="text-3xl font-bold text-white text-center">{totalScore}</Text>
          <Text className="text-[8px] text-neutral-500 tracking-widest text-center">SCORE</Text>
        </View>
      )}
    </View>
  );
}
