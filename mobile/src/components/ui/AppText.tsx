import React from 'react';
import {
  Text,
  StyleSheet,
  useWindowDimensions,
  TextStyle,
} from 'react-native';
import { colors } from '../../theme';

interface AppTextProps {
  children: React.ReactNode;
  variant?: 'title' | 'subtitle' | 'body' | 'caption' | 'label';
  style?: TextStyle;
  color?: string;
}

export function AppText({ children, variant = 'body', style, color }: AppTextProps) {
  const { width } = useWindowDimensions();
  const isSmall = width < 375;

  const sizeMap = {
    title: isSmall ? 26 : 30,
    subtitle: isSmall ? 18 : 20,
    body: isSmall ? 15 : 16,
    caption: 13,
    label: 14,
  };

  return (
    <Text
      style={[
        styles.base,
        { fontSize: sizeMap[variant], color: color ?? colors.text },
        variant === 'title' && styles.title,
        variant === 'subtitle' && styles.subtitle,
        variant === 'caption' && styles.caption,
        variant === 'label' && styles.label,
        style,
      ]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    lineHeight: 24,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontWeight: '600',
    marginBottom: 6,
  },
  caption: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  label: {
    fontWeight: '500',
    marginBottom: 6,
  },
});
