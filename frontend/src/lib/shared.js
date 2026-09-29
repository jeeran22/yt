// ---------------------------------------------------------------------------
// Tiny session-wide shared state: used to hand the last generated image from
// the Image Gen tab to the Image-to-Video tab ("Animate this image").
// ---------------------------------------------------------------------------

let pendingImage = null;

export function setPendingImage(image) {
  pendingImage = image;
}

export function takePendingImage() {
  const image = pendingImage;
  pendingImage = null;
  return image;
}

export function peekPendingImage() {
  return pendingImage;
}