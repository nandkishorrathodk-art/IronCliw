export type InputModality = "text" | "voice" | "gesture";

export interface MultimodalInputEvent {
  modality: InputModality;
  rawPayload: unknown;
  timestamp: number;
}

export class MultimodalInputHandler {
  public handleInput(event: MultimodalInputEvent): string {
    switch (event.modality) {
      case "text":
        return this.processText(event.rawPayload as string);
      case "voice":
        return this.processVoice(event.rawPayload as Buffer);
      case "gesture":
        return this.processGesture(event.rawPayload);
      default:
        throw new Error(`Unsupported modality: ${event.modality as string}`);
    }
  }

  private processText(payload: string): string {
    return payload.trim();
  }

  private processVoice(audioBuffer: Buffer): string {
    console.log("[MultimodalInput] Processing voice buffer (length: %d)...", audioBuffer.length);
    // Requires Whisper or external TTS/STT integration (e.g., Gemini Live API)
    return "Transcribed command placeholder";
  }

  private processGesture(gestureData: unknown): string {
    const data = gestureData as { type?: string };
    console.log("[MultimodalInput] Interpreting gesture: ", data.type);
    // Map mouse/camera gestures to specific macro commands
    if (data.type === "swipe_left") {
      return "switch_workspace_left";
    }
    return "unknown_gesture";
  }
}
