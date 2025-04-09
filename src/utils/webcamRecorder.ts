import RecordRTC, { RecordRTCPromisesHandler } from "recordrtc";

export class WebcamRecorder {
  private recorder: RecordRTCPromisesHandler | null = null;
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: "user",
        },
        audio: true,
      });

      this.recorder = new RecordRTCPromisesHandler(this.stream, {
        type: "video",
        mimeType: "video/webm;codecs=vp9",
        bitsPerSecond: 128000,
        frameRate: 30,
        quality: "high",
        width: 320,
        height: 240,
      });

      await this.recorder.startRecording();
    } catch (error) {
      console.error("Error starting webcam recording:", error);
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    if (!this.recorder || !this.stream) {
      throw new Error("Recording has not been started");
    }

    try {
      await this.recorder.stopRecording();
      const blob = await this.recorder.getBlob();

      // Stop all tracks
      this.stream.getTracks().forEach((track) => track.stop());

      // Clean up
      this.recorder = null;
      this.stream = null;

      return blob;
    } catch (error) {
      console.error("Error stopping webcam recording:", error);
      throw error;
    }
  }

  isRecording(): boolean {
    return this.recorder !== null;
  }
}
