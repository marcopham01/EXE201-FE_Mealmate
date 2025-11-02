import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';

const ITEM_HEIGHT = 80; // Chiều cao mỗi item trong picker
const VISIBLE_ITEMS = 5; // Số items hiển thị

export default function ScrollPicker({ min, max, initial, unit, onValueChange }) {
  const flatListRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(initial - min);
  const [isScrolling, setIsScrolling] = useState(false);

  // Tạo mảng các giá trị
  const items = React.useMemo(() => {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [min, max]);

  // Scroll đến giá trị initial khi mount
  useEffect(() => {
    const index = initial - min;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: false });
    }, 100);
  }, []);

  // Xử lý scroll để snap về item gần nhất
  const onScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    
    if (clampedIndex !== selectedIndex && !isScrolling) {
      setSelectedIndex(clampedIndex);
      onValueChange?.(items[clampedIndex]);
    }
  };

  // Snap về item khi scroll kết thúc
  const onMomentumScrollEnd = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    
    setSelectedIndex(clampedIndex);
    setIsScrolling(false);
    onValueChange?.(items[clampedIndex]);
    
    // Snap về đúng vị trí
    flatListRef.current?.scrollToIndex({
      index: clampedIndex,
      animated: true,
    });
  };

  const onScrollBeginDrag = () => {
    setIsScrolling(true);
  };

  // Render mỗi item
  const renderItem = ({ item, index }) => {
    const isSelected = index === selectedIndex;
    const distance = Math.abs(index - selectedIndex);
    
    // Tính style dựa trên khoảng cách từ item được chọn
    let textStyle = styles.fadedText;
    let opacity = 0.3;
    
    if (isSelected) {
      textStyle = styles.selectedText;
      opacity = 1;
    } else if (distance === 1) {
      textStyle = styles.adjacentText;
      opacity = 0.6;
    } else if (distance === 2) {
      opacity = 0.4;
    }

    return (
      <View style={[styles.itemContainer, { opacity }]}>
        <Text style={textStyle}>{item}</Text>
        {isSelected && unit && (
          <Text style={styles.unitText}>{unit}</Text>
        )}
      </View>
    );
  };

  // Render separator để có khoảng cách đều
  const ItemSeparator = () => <View style={{ height: 0 }} />;

  // Render header/footer để có padding
  const ListHeader = () => <View style={{ height: ITEM_HEIGHT * 2 }} />;
  const ListFooter = () => <View style={{ height: ITEM_HEIGHT * 2 }} />;

  return (
    <View style={styles.container}>
      {/* Highlight overlay ở giữa */}
      <View style={styles.highlightOverlay} pointerEvents="none">
        <View style={styles.highlightLine} />
      </View>
      
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item)}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollToIndexFailed={(info) => {
          // Retry sau một chút nếu scroll failed
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 100);
        }}
        getItemLayout={(data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ItemSeparatorComponent={ItemSeparator}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: '100%',
    position: 'relative',
  },
  listContent: {
    paddingVertical: 0,
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  selectedText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#111',
  },
  adjacentText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#9A928D',
  },
  fadedText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#C7C4C1',
  },
  unitText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111',
    marginLeft: 8,
  },
  highlightOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 1,
  },
  highlightLine: {
    width: '80%',
    height: ITEM_HEIGHT,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(241, 207, 130, 0.3)',
    backgroundColor: 'rgba(241, 207, 130, 0.05)',
  },
});

