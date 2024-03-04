export function applyMarginToAbsolutePosition(
  position: { x: number; y: number; width: number; height: number },
  margin: number
) {
  return {
    top: position.y - margin,
    left: position.x - margin,
    width: position.width + margin * 2,
    height: position.height + margin * 2,
  };
}

export function applyMarginWithinWindowBounds(
  position: { x: number; y: number; width: number; height: number },
  margin: number
) {
  const newPosition = applyMarginToAbsolutePosition(position, margin);
  newPosition.top = Math.max(0, newPosition.top);
  newPosition.left = Math.max(0, newPosition.left);
  newPosition.width = Math.min(
    newPosition.width,
    document.documentElement.scrollWidth
  );
  newPosition.height = Math.min(
    newPosition.height,
    document.documentElement.scrollHeight
  );
  return newPosition;
}
