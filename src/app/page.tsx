"use client";

import React, { useState } from "react";

export default function Home() {
  const [talkingHeadVideo, setTalkingHeadVideo] = useState<File | null>(null);
  const [websiteUrls, setWebsiteUrls] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTalkingHeadVideo(file);
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUrl.trim()) {
      setWebsiteUrls([...websiteUrls, currentUrl.trim()]);
      setCurrentUrl("");
    }
  };

  const handleProcess = async (url: string) => {
    try {
      setProcessing(true);
      setError(null);

      const formData = new FormData();
      if (!talkingHeadVideo) {
        throw new Error("Please select a talking head video");
      }
      formData.append("talkingHeadVideo", talkingHeadVideo);
      formData.append("websiteUrl", url);

      const response = await fetch("/api/process-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process video");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `processed-${url.replace(/[^a-z0-9]/gi, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 py-8 text-gray-100">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8 text-blue-400">
          Video Outreach Generator
        </h1>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Video Upload */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">
              1. Upload Talking Head Video
            </h2>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
            />
          </div>

          {/* Website URLs */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">
              2. Add Website URLs
            </h2>
            <form onSubmit={handleAddUrl} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={currentUrl}
                  onChange={(e) => setCurrentUrl(e.target.value)}
                  placeholder="Enter website URL"
                  className="flex-1 p-2 border border-gray-600 rounded bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {websiteUrls.map((url, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded border border-gray-600"
                >
                  <span className="truncate flex-1 text-gray-200">{url}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleProcess(url)}
                      disabled={processing || !talkingHeadVideo}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {processing ? "Processing..." : "Process"}
                    </button>
                    <button
                      onClick={() =>
                        setWebsiteUrls((urls) =>
                          urls.filter((_, i) => i !== index)
                        )
                      }
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
