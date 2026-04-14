import { record } from 'rrweb';
import type { eventWithTime } from '@rrweb/types';

type StopFn = () => void;

let stopRecording: StopFn | null = null;

function createRecordOptions() {
  return {
    emit(event: eventWithTime) {
      window.liveViewApi.sendEvent(event);
    },
    checkoutEveryNth: undefined as undefined,
    checkoutEveryNms: 30_000,
    // Throttle high-frequency events to reduce IPC call volume.
    // mousemove at 60 fps would otherwise generate 60 IPC calls/s.
    sampling: {
      mousemove: 50,  // at most one mouse-move event per 50 ms (20/s max)
      scroll: 150,    // at most one scroll event per 150 ms
      input: 'last' as const, // only the final value of an input, not every keystroke
    },
  };
}

export function startRecording(): void {
  if (stopRecording) return; // already recording
  stopRecording = record(createRecordOptions()) ?? null;
}

export function stopLiveRecording(): void {
  if (stopRecording) {
    stopRecording();
    stopRecording = null;
  }
}

export function isRecording(): boolean {
  return stopRecording !== null;
}

/**
 * Force an immediate rrweb checkpoint (stop + restart).
 * rrweb emits a fresh Meta + FullSnapshot on restart, which allows
 * newly connected SSE clients to start playback from "now" with zero
 * replay delay instead of replaying up to 30 s of buffered events.
 */
export function forceCheckout(): void {
  if (!stopRecording) return; // not currently recording
  stopRecording();
  stopRecording = record(createRecordOptions()) ?? null;
}
