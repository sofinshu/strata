import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0F1117] flex flex-col justify-center items-center">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#5865F2] opacity-10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#5BC0EB] opacity-10 blur-[120px]" />
      
      <div className="container relative z-10 px-4 py-32 mx-auto text-center max-w-5xl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium border rounded-full border-[#333845] bg-[#1A1D27]/80 text-[#8B8FA3] backdrop-blur-sm mb-8">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#57F287] opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#57F287]"></span>
          </span>
          Strata v4 is now live
        </div>

        {/* Hero Headline */}
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#F0F0F3] to-[#8B8FA3]">
          The Ultimate <br className="hidden sm:block" /> Staff Management Engine
        </h1>
        
        <p className="max-w-2xl mx-auto mb-10 text-lg sm:text-xl text-[#8B8FA3] font-medium leading-relaxed">
          Unify your community management with real-time shift tracking, point leaderboards, and powerful moderation automation directly integrated with Discord.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/dashboard"
            className="flex items-center justify-center w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-white transition-all bg-[#5865F2] hover:bg-[#4752C4] shadow-[0_0_20px_rgba(88,101,242,0.4)] rounded-lg"
          >
            Go to Dashboard
          </Link>
          <a
            href="https://discord.com/api/oauth2/authorize"
            className="flex items-center justify-center w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-[#F0F0F3] transition-all bg-[#1A1D27] hover:bg-[#242836] border border-[#333845] rounded-lg"
          >
            Invite to Server
          </a>
        </div>
      </div>

      {/* Feature Grids - Simplified preview */}
      <div className="relative z-10 w-full max-w-6xl px-4 pb-20 mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Live Shift Tracking", text: "Real-time updates, activity logging, and end-of-shift reporting.", border: "border-t-[#5BC0EB]" },
          { title: "Point & Rep System", text: "Gamify staff moderation and identify top performers dynamically.", border: "border-t-[#FEE75C]" },
          { title: "Strata Automation", text: "Automated promotions, rank synchronization, and advanced auto-mod.", border: "border-t-[#F47FFF]" }
        ].map((feat, i) => (
          <div key={i} className={`p-6 bg-[#1A1D27] border border-[#333845] ${feat.border} border-t-2 rounded-xl shadow-lg transition-transform hover:-translate-y-1`}>
            <h3 className="text-[#F0F0F3] font-semibold text-lg mb-2">{feat.title}</h3>
            <p className="text-[#8B8FA3] text-sm leading-relaxed">{feat.text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
