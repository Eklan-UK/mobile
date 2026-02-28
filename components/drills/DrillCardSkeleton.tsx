import { View } from 'react-native';
import tw from '@/lib/tw';

/**
 * Skeleton loader for drill cards
 */
export default function DrillCardSkeleton() {
  return (
    <View style={tw`bg-white rounded-2xl p-4 mb-3 border border-gray-200`}>
      {/* Header skeleton */}
      <View style={tw`flex-row items-start justify-between mb-3`}>
        <View style={tw`flex-1`}>
          {/* Title skeleton */}
          <View style={tw`h-5 bg-gray-200 rounded w-3/4 mb-2`} />
          {/* Subtitle skeleton */}
          <View style={tw`h-4 bg-gray-200 rounded w-1/2 mb-1`} />
          {/* Meta skeleton */}
          <View style={tw`h-3 bg-gray-200 rounded w-1/3`} />
        </View>
        {/* Icon skeleton */}
        <View style={tw`w-8 h-8 bg-gray-200 rounded-full`} />
      </View>

      {/* Badge skeleton */}
      <View style={tw`h-6 bg-gray-200 rounded-lg w-32`} />
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
