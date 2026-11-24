import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { LatLng, formatDistance, routeToSvgPoints } from '../lib/geo';
import { useTheme } from '../theme';

/** Draws the walked route as an SVG polyline (no map SDK / API key needed). */
export function RouteView({ route, distanceM, height = 220 }: { route: LatLng[]; distanceM: number; height?: number }) {
  const t = useTheme();
  const [width, setWidth] = useState(300);
  const pts = useMemo(() => routeToSvgPoints(route, width, height), [route, width, height]);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.max(e.nativeEvent.layout.width, 50));
  const first = pts[0];
  const last = pts[pts.length - 1];
  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        route.length > 1
          ? `Route drawn from start to finish, ${formatDistance(distanceM)} long`
          : 'No route recorded for this walk'
      }
      style={{ height, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}
    >
      {pts.length > 1 && (
        <Svg width={width} height={height}>
          <Polyline
            points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="none"
            stroke={t.primary}
            strokeWidth={4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Circle cx={first.x} cy={first.y} r={7} fill={t.primary} stroke={t.surface} strokeWidth={2} />
          <Circle cx={last.x} cy={last.y} r={7} fill={t.danger} stroke={t.surface} strokeWidth={2} />
        </Svg>
      )}
    </View>
  );
}
