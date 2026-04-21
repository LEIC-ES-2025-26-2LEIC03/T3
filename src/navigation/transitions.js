import { Easing } from 'react-native';

export const SPRING_TRANSITION = {
  animation: 'spring',
  config: {
    stiffness: 280,
    damping: 28,
    mass: 0.8,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

export const EASE_TRANSITION = {
  animation: 'timing',
  config: {
    duration: 280,
    easing: Easing.out(Easing.poly(4)),
    useNativeDriver: true,
  },
};

/**
 * Slide-from-right with a subtle depth effect on the outgoing screen.
 * Feels close to iOS but works well on Android too.
 */
export function forSlideFromRight({ current, next, layouts }) {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [layouts.screen.width, 0],
  });

  // Outgoing screen: slight scale-down + fade
  const outgoingOpacity = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.92],
      })
    : 1;

  const outgoingScale = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.96],
      })
    : 1;

  return {
    cardStyle: {
      transform: [{ translateX }],
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.25],
      }),
    },
  };
}

/**
 * Slide-up sheet animation — used for WorkoutLogger and TemplateBuilder.
 * Feels like a modal without using presentationStyle="modal".
 */
export function forSlideUp({ current, layouts }) {
  const translateY = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [layouts.screen.height * 0.12, 0],
  });

  const opacity = current.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 1],
  });

  const scale = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
  });

  return {
    cardStyle: {
      transform: [{ translateY }, { scale }],
      opacity,
    },
  };
}

/**
 * Fade transition — for tab switches and the profile → main transition.
 */
export function forFade({ current }) {
  return {
    cardStyle: {
      opacity: current.progress,
    },
  };
}
