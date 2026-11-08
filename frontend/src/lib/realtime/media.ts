/** Turns a getUserMedia failure into something a patient can act on. */
export function describeMediaError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera and microphone are blocked. Allow them in your browser settings, then try again.';
    case 'NotFoundError':
      return 'No microphone was found. Connect one and try again.';
    case 'NotReadableError':
      return 'Your camera or microphone is being used by another app. Close it and try again.';
    default:
      return 'Could not start your camera and microphone. Try again.';
  }
}

/** Camera and microphone. A missing camera is not fatal, so we fall back to audio only. */
export async function requestMedia(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Video calls need a secure (https) connection.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    });
  } catch (error) {
    const noCamera =
      error instanceof DOMException &&
      (error.name === 'NotFoundError' || error.name === 'OverconstrainedError');
    if (!noCamera) throw error;
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }
}
