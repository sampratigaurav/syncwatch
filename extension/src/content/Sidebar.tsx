import React, { useState, useEffect } from 'react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  // Example toast state for the binge-watching delay
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Listen for yt-navigate-start custom events
    const handleNavigateStart = (e: any) => {
      // Show toast instead of immediate redirect
      setToastMessage("Host is navigating...");
      setTimeout(() => setToastMessage(null), 5000);
    };

    window.addEventListener('yt-navigate-start', handleNavigateStart);
    return () => window.removeEventListener('yt-navigate-start', handleNavigateStart);
  }, []);

  return (
    <div className={`absolute top-0 right-0 h-full w-80 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-12 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-3 rounded-l-lg shadow-lg hover:bg-blue-500 transition-colors"
      >
        SW
      </button>

      <div className="w-80 h-full glass-panel flex flex-col p-4 text-white">
        <h2 className="text-xl font-bold mb-4 tracking-tight">SyncWatch</h2>
        
        {toastMessage && (
          <div className="bg-orange-500/80 border border-orange-400 p-3 rounded-lg mb-4 text-sm animate-pulse">
            {toastMessage}
            <button className="ml-2 underline hover:text-white/80">Cancel</button>
          </div>
        )}

        <div className="flex-grow flex flex-col gap-2">
          {/* Chat and Participants will go here */}
          <div className="bg-white/5 rounded p-3 text-sm text-gray-300 flex-grow">
            Chat history...
          </div>
        </div>

        <div className="mt-4">
          <input 
            type="text" 
            placeholder="Type a message..." 
            className="w-full bg-black/50 border border-white/20 rounded-lg p-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
