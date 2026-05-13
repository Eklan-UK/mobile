import { View } from 'react-native';
import tw from '@/lib/tw';
import { useSemanticTheme } from '@/hooks/useSemanticTheme';

/**
 * Skeleton loader for drill cards
 */
export default function DrillCardSkeleton() {
  const { colors: c } = useSemanticTheme();
  const bar = { backgroundColor: c.muted };
  return (
    <View
      style={[
        tw`rounded-2xl p-4 mb-3 border`,
        { backgroundColor: c.card, borderColor: c.border },
      ]}
    >
      {/* Header skeleton */}
      <View style={tw`flex-row items-start justify-between mb-3`}>
        <View style={tw`flex-1`}>
          {/* Title skeleton */}
          <View style={[tw`h-5 rounded w-3/4 mb-2`, bar]} />
          {/* Subtitle skeleton */}
          <View style={[tw`h-4 rounded w-1/2 mb-1`, bar]} />
          {/* Meta skeleton */}
          <View style={[tw`h-3 rounded w-1/3`, bar]} />
        </View>
        {/* Icon skeleton */}
        <View style={[tw`w-8 h-8 rounded-full`, bar]} />
      </View>

      {/* Badge skeleton */}
      <View style={[tw`h-6 rounded-lg w-32`, bar]} />
    </View>
  );
}

/**
 * Multiple skeleton loaders
 */
export function DrillCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <DrillCardSkeleton key={index} />
      ))}
    </>
  );
}
