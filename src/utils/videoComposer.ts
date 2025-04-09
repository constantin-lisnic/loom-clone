import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

export class VideoComposer {
  private ffmpeg = createFFmpeg({ log: true });
  private initialized = false;

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.ffmpeg.load();
      this.initialized = true;
    }
  }

  async combineVideos(
    websiteVideoPath: string,
    webcamVideoPath: string,
    outputFileName: string
  ): Promise<Uint8Array> {
    if (!this.initialized) {
      throw new Error("FFmpeg not initialized");
    }

    try {
      // Load the input files
      this.ffmpeg.FS(
        "writeFile",
        "website.mp4",
        await fetchFile(websiteVideoPath)
      );
      this.ffmpeg.FS(
        "writeFile",
        "webcam.webm",
        await fetchFile(webcamVideoPath)
      );

      // Execute FFmpeg command to overlay webcam video on website recording
      await this.ffmpeg.run(
        "-i",
        "website.mp4",
        "-i",
        "webcam.webm",
        "-filter_complex",
        "[1:v]scale=320:240[overlay];[0:v][overlay]overlay=main_w-overlay_w-10:main_h-overlay_h-10",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-strict",
        "experimental",
        outputFileName
      );

      // Read the output file
      const data = this.ffmpeg.FS("readFile", outputFileName);

      // Clean up
      this.ffmpeg.FS("unlink", "website.mp4");
      this.ffmpeg.FS("unlink", "webcam.webm");
      this.ffmpeg.FS("unlink", outputFileName);

      return data;
    } catch (error) {
      console.error("Error combining videos:", error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Optional: Implement any cleanup if needed
  }
}
