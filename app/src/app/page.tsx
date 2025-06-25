"use client";

import { useState, useRef } from "react";
import { getDocument } from "pdfjs-dist";

export default function Home() {
  const [resumeText, setResumeText] = useState("");
  const [preferences, setPreferences] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      alert("Please select a PDF file");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      let text = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        text += textContent.items.map((item: any) => item.str).join(" ") + "\n";
      }
      
      setResumeText(text);
    } catch (error) {
      console.error("Error parsing PDF:", error);
      alert("Error reading PDF file");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form Data:", {
      resume: resumeText,
      preferences: preferences,
    });
  };

  const preferencesPlaceholder = `Example: Looking for remote software engineering roles, preferably full-stack or frontend positions. Open to $80k-120k salary range. Interested in startups or mid-size companies with good work-life balance. No interest in finance or insurance industries.`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Job Search Setup
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Resume Section */}
            <div className="relative">
              <label htmlFor="resume" className="block text-lg font-medium text-gray-700 mb-3">
                Resume
              </label>
              <textarea
                id="resume"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Paste your resume here or upload a PDF file..."
              />
              
              {/* Floating Upload Button */}
              {!resumeText.trim() && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 ease-in-out opacity-80 hover:opacity-100 shadow-lg"
                >
                  Upload PDF
                </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Preferences Section */}
            <div>
              <label htmlFor="preferences" className="block text-lg font-medium text-gray-700 mb-3">
                Job Preferences
              </label>
              <textarea
                id="preferences"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={preferencesPlaceholder}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 text-lg"
              >
                Start Job Search
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}