import puppeteer from "puppeteer";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";
import path from "path";
import os from "os";

export class WebsiteRecorder {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private recorder: PuppeteerScreenRecorder | null = null;

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: "new",
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });
    this.page = await this.browser.newPage();
  }

  async recordWebsite(url: string, duration: number = 30000): Promise<string> {
    if (!this.browser || !this.page) {
      throw new Error("Browser not initialized");
    }

    try {
      // Navigate to the website
      await this.page.goto(url, { waitUntil: "networkidle0" });

      // Create temporary file path
      const tempDir = os.tmpdir();
      const outputPath = path.join(
        tempDir,
        `website-recording-${Date.now()}.mp4`
      );

      // Initialize recorder
      this.recorder = new PuppeteerScreenRecorder(this.page, {
        fps: 30,
        ffmpeg_Path: "ffmpeg",
        videoFrame: {
          width: 1920,
          height: 1080,
        },
        aspectRatio: "16:9",
      });

      // Start recording
      await this.recorder.start(outputPath);

      // Perform smooth scrolling
      await this.page.evaluate(async (scrollDuration) => {
        const totalHeight = document.body.scrollHeight;
        const scrollStep = totalHeight / (scrollDuration / 100); // Scroll every 100ms

        return new Promise<void>((resolve) => {
          let currentPosition = 0;
          const scrollInterval = setInterval(() => {
            window.scrollTo(0, currentPosition);
            currentPosition += scrollStep;

            if (currentPosition >= totalHeight) {
              clearInterval(scrollInterval);
              resolve();
            }
          }, 100);
        });
      }, duration);

      // Stop recording
      await this.recorder.stop();

      return outputPath;
    } catch (error) {
      console.error("Error recording website:", error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.recorder = null;
    }
  }
}
