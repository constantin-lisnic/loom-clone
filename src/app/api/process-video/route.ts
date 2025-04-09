import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import path from "path";
import fs from "fs";
import os from "os";

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const talkingHeadVideo = data.get("talkingHeadVideo") as File;
    const websiteUrl = data.get("websiteUrl") as string;

    if (!talkingHeadVideo || !websiteUrl) {
      return NextResponse.json(
        { error: "Missing required files or URL" },
        { status: 400 }
      );
    }

    // Create temp directory for processing
    const tempDir = path.join(os.tmpdir(), "video-processing-" + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });

    // Save talking head video to temp file
    const talkingHeadPath = path.join(tempDir, "talking-head.webm");
    const talkingHeadBuffer = Buffer.from(await talkingHeadVideo.arrayBuffer());
    fs.writeFileSync(talkingHeadPath, talkingHeadBuffer);

    // Record website
    const browser = await puppeteer.launch({
      headless: true,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const recorder = new PuppeteerScreenRecorder(page);
    const websiteVideoPath = path.join(tempDir, "website.mp4");

    await page.goto(websiteUrl, { waitUntil: "networkidle0" });
    await recorder.start(websiteVideoPath);

    // Scroll the page
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await recorder.stop();
    await browser.close();

    // Create circular mask for talking head video
    const maskPath = path.join(tempDir, "mask.mp4");
    await new Promise((resolve, reject) => {
      ffmpeg(talkingHeadPath)
        .videoFilters([
          "crop=iw:iw",
          "geq=lum=p(X\\,Y):a=if(gt(pow(pow(X-w/2\\,2)+pow(Y-h/2\\,2)\\,0.5)\\,min(w\\,h)/2)\\,0\\,255)",
        ])
        .output(maskPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Combine videos
    const outputPath = path.join(tempDir, "output.mp4");
    await new Promise((resolve, reject) => {
      ffmpeg(websiteVideoPath)
        .input(maskPath)
        .complexFilter([
          "[1:v]scale=320:-1[overlay]",
          "[0:v][overlay]overlay=main_w-overlay_w-10:main_h-overlay_h-10",
        ])
        .outputOptions(["-c:v libx264", "-preset medium", "-crf 23"])
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Read the output file
    const outputBuffer = fs.readFileSync(outputPath);

    // Clean up temp files
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Return the processed video
    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="processed-video.mp4"',
      },
    });
  } catch (error) {
    console.error("Error processing video:", error);
    return NextResponse.json(
      { error: "Failed to process video" },
      { status: 500 }
    );
  }
}
