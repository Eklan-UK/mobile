import React, { useRef, useState, useEffect } from 'react';
import { View, FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import tw from '@/lib/tw';
import CallToActionCard from './CallToAction';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Show peek of next/previous cards - reduce card width and add spacing
const PEEK_WIDTH = 24; // Width of visible edge from next/previous cards on each side
const HORIZONTAL_PADDING = 24; // Padding from screen edges (6 * 4 = 24px)
const CARD_WIDTH = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - (PEEK_WIDTH * 2); // Account for padding and peek
const CARD_SPACING = 16;
const AUTO_SCROLL_INTERVAL = 3000; // 3 seconds

interface CallToActionItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBackgroundColor?: string;
  backgroundColor?: string;
  gradientColors?: string[]; // Array of colors for gradient [from, to]
  gradientAngle?: number; // Gradient angle in degrees
  titleColor?: string;
  subtitleColor?: string;
  onPress?: () => void;
  route?: string;
}

interface CallToActionCarouselProps {
  items: CallToActionItem[];
  onItemPress?: (item: CallToActionItem) => void;
}

export default function CallToActionCarousel({
  items,
  onItemPress,
}: CallToActionCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (CARD_WIDTH + CARD_SPACING));
    setActiveIndex(index);
  };

  const handleItemPress = (item: CallToActionItem) => {
    if (item.onPress) {
      item.onPress();
    } else if (onItemPress) {
      onItemPress(item);
    }
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (items.length <= 1) return;

    const scrollToNext = () => {
      if (isScrollingRef.current) return;
      
      const nextIndex = (activeIndex + 1) % items.length;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setActiveIndex(nextIndex);
    };

    // Clear existing timer
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }

    // Set up auto-scroll
    autoScrollTimerRef.current = setInterval(scrollToNext, AUTO_SCROLL_INTERVAL);

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [activeIndex, items.length]);

  const handleScrollBeginDrag = () => {
    isScrollingRef.current = true;
    // Pause auto-scroll while user is scrolling
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }
  };

  const handleScrollEndDrag = () => {
    isScrollingRef.current = false;
    // Resume auto-scroll after user finishes scrolling
    const scrollToNext = () => {
      if (isScrollingRef.current) return;
      const nextIndex = (activeIndex + 1) % items.length;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setActiveIndex(nextIndex);
    };
    autoScrollTimerRef.current = setInterval(scrollToNext, AUTO_SCROLL_INTERVAL);
  };

  return (
    <View style={tw`mb-6`}>
      <FlatList
        ref={flatListRef}
        data={items}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PADDING + PEEK_WIDTH }}
        style={{ marginHorizontal: -(HORIZONTAL_PADDING + PEEK_WIDTH) }}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleScrollEndDrag}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH + CARD_SPACING,
          offset: (CARD_WIDTH + CARD_SPACING) * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          // Handle scroll to index failure
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
        renderItem={({ item }) => (
          <View
            style={[
              tw`mr-4`,
              { width: CARD_WIDTH },
            ]}
          >
            <CallToActionCard
              title={item.title}
              subtitle={item.subtitle}
              icon={item.icon}
              iconBackgroundColor={item.iconBackgroundColor}
              backgroundColor={item.backgroundColor}
              gradientColors={item.gradientColors}
              gradientAngle={item.gradientAngle}
              titleColor={item.titleColor}
              subtitleColor={item.subtitleColor}
              onPress={() => handleItemPress(item)}
            />
          </View>
        )}
      />
    </View>
  );
}

