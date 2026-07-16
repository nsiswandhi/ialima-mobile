// Right-edge slide-in drawer (fixed width fraction of the screen), used where
// a filter panel has too much content for the small anchored FilterPopover.
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors } from './theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  widthPercent?: number; // 0-100, defaults to 70
  children: React.ReactNode;
};

const SCREEN_W = Dimensions.get('window').width;

export default function RightDrawer({ visible, onClose, widthPercent = 70, children }: Props) {
  const panelWidth = (SCREEN_W * widthPercent) / 100;
  const translateX = useRef(new Animated.Value(panelWidth)).current;

  useEffect(() => {
    if (visible) {
      translateX.setValue(panelWidth);
      Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible, panelWidth]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.panel, { width: panelWidth, transform: [{ translateX }] }]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  panel: { backgroundColor: colors.card, height: '100%' },
});
