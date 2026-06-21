import { Link } from 'react-router-dom';
import { ArrowLeft, FileVideo, ShieldCheck, HelpCircle, Keyboard, Play } from 'lucide-react';

export default function Docs() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-teal-500/30">
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center p-4 backdrop-blur-md bg-zinc-950/50 border-b border-zinc-900/50">
        <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Home</span>
        </Link>
      </div>
      
      <div className="max-w-3xl mx-auto pt-24 pb-20 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-600 mb-8">
          SyncWatch Documentation
        </h1>
        
        <div className="space-y-12">
          {/* Section 1 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-white mb-4 border-b border-zinc-800 pb-2">
              <Play size={24} className="text-teal-500" /> Getting Started
            </h2>
            <div className="space-y-4 text-zinc-400 leading-relaxed">
              <p><strong>1. Create or Join a Room:</strong> One person creates a room (and can optionally lock it with a 4-8 character PIN) and shares the 6-character room code. Others use this code to join.</p>
              <p><strong>2. Select the Same File:</strong> SyncWatch works locally. This means <strong>everyone must have the exact same video file</strong> on their own device. The video is never uploaded.</p>
              <p><strong>3. Watch Together:</strong> Once everyone has selected the file, the host can play, pause, or seek. SyncWatch will automatically keep everyone's player at the exact same moment.</p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-white mb-4 border-b border-zinc-800 pb-2">
              <FileVideo size={24} className="text-teal-500" /> Supported Formats
            </h2>
            <div className="space-y-4 text-zinc-400 leading-relaxed">
              <p>Because SyncWatch relies on your browser's native video player, format support depends on the browser you are using (Chrome, Firefox, Safari, Edge).</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-zinc-200">Recommended Video:</strong> <code>.mp4</code> and <code>.webm</code> are widely supported across all modern browsers.</li>
                <li><strong className="text-zinc-200">Other Video Formats:</strong> <code>.mkv</code> or <code>.avi</code> might only play audio or fail completely, depending on the browser. If possible, convert your files to MP4.</li>
                <li><strong className="text-zinc-200">Subtitles:</strong> You can load local subtitle files like <code>.vtt</code> or <code>.srt</code> directly into the player once you are in the room.</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-white mb-4 border-b border-zinc-800 pb-2">
              <ShieldCheck size={24} className="text-teal-500" /> Privacy & Security
            </h2>
            <div className="space-y-4 text-zinc-400 leading-relaxed">
              <p><strong>Your files never leave your device.</strong> SyncWatch is a "bring your own file" platform. When you select a video, it is read entirely locally by your browser.</p>
              <p>The only data sent to our server is:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>A cryptographic hash of the first few megabytes of your file (to ensure everyone is watching the exact same file).</li>
                <li>Playback events (Play, Pause, and current timestamp).</li>
                <li>Chat messages and emoji reactions.</li>
              </ul>
            </div>
          </section>
          
          {/* Section 4 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-white mb-4 border-b border-zinc-800 pb-2">
              <Keyboard size={24} className="text-teal-500" /> Keyboard Shortcuts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span>Play / Pause</span>
                <kbd className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-sm font-mono border border-zinc-700">Space</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span>Fullscreen</span>
                <kbd className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-sm font-mono border border-zinc-700">F</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span>Seek Forward / Backward</span>
                <kbd className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-sm font-mono border border-zinc-700">Arrows</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                <span>Mute / Unmute</span>
                <kbd className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-sm font-mono border border-zinc-700">M</kbd>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-white mb-4 border-b border-zinc-800 pb-2">
              <HelpCircle size={24} className="text-teal-500" /> Troubleshooting
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-zinc-200">"Why does it say File Mismatch?"</h3>
                <p className="text-zinc-400 mt-1">SyncWatch calculates a hash of your file. If your friend downloaded a 720p version and you have a 1080p version, they won't match. You must share the exact same source file.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-zinc-200">"The video won't auto-play for my friend."</h3>
                <p className="text-zinc-400 mt-1">Modern browsers have strict auto-play policies. If the video doesn't play automatically, your friend simply needs to click anywhere on the page to allow media playback.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-zinc-200">"Why is the video randomly pausing?"</h3>
                <p className="text-zinc-400 mt-1">If someone in the room has a slow hard drive or CPU and their video starts buffering, SyncWatch will automatically pause the video for everyone else to keep you in sync. It will resume once they catch up.</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
