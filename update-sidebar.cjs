const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/components/FriendsSidebar.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The fixes for the accessibility issues based on the SonarCloud output
// The issues are related to missing 'title' or 'aria-label' attributes or missing 'type="button"'

// Issue AZ-HmmRm28PW_-MgOhkH (lines 233-235)
content = content.replace(
  '<button aria-label="Close Friends Sidebar" onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">',
  '<button type="button" aria-label="Close Friends Sidebar" title="Close Friends Sidebar" onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">'
);

// Issue AZ-HmmRm28PW_-MgOhkI (lines 247-254)
content = content.replace(
  /<button\s+aria-label="Send Friend Request"\s+onClick=\{handleSendRequest\}\s+disabled=\{isSubmitting \|\| !addFriendCode\}\s+className="relative px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-teal-600 shadow-lg active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"\s*>/g,
  '<button type="button" title="Send Friend Request" aria-label="Send Friend Request" onClick={handleSendRequest} disabled={isSubmitting || !addFriendCode} className="relative px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-teal-600 shadow-lg active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">'
);

// Issue AZ-HmmRm28PW_-MgOhkJ (lines 258-264)
content = content.replace(
  '<button \n                    onClick={() => setActiveTab(\'friends\')}\n                    className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === \'friends\' ? \'text-white\' : \'text-zinc-500 hover:text-zinc-300\'}`}\n                  >',
  '<button type="button" aria-label="Friends Tab" onClick={() => setActiveTab(\'friends\')} className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === \'friends\' ? \'text-white\' : \'text-zinc-500 hover:text-zinc-300\'}`}>'
);

// Issue AZ-HmmRm28PW_-MgOhkK (lines 265-274)
content = content.replace(
  '<button \n                    onClick={() => setActiveTab(\'requests\')}\n                    className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 ${activeTab === \'requests\' ? \'text-white\' : \'text-zinc-500 hover:text-zinc-300\'}`}\n                  >',
  '<button type="button" aria-label="Requests Tab" onClick={() => setActiveTab(\'requests\')} className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 ${activeTab === \'requests\' ? \'text-white\' : \'text-zinc-500 hover:text-zinc-300\'}`}>'
);


// Issue AZ-HmmRm28PW_-MgOhkL (lines 339-346)
content = content.replace(
  '<button \n                              aria-label="Remove Friend"\n                              onClick={() => handleRemoveFriend(friendUid)} \n                              className="p-2 text-red-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-red-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"\n                              title="Remove Friend"\n                            >',
  '<button type="button" aria-label="Remove Friend" onClick={() => handleRemoveFriend(friendUid)} className="p-2 text-red-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-red-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" title="Remove Friend">'
);

// Issue AZ-HmmRm28PW_-MgOhkM (lines 387-389)
content = content.replace(
  '<button aria-label="Accept Friend Request" onClick={() => handleAcceptRequest(edge.requesterId)} className="p-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400" title="Accept">',
  '<button type="button" aria-label="Accept Friend Request" title="Accept Friend Request" onClick={() => handleAcceptRequest(edge.requesterId)} className="p-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">'
);

// Issue AZ-HmmRm28PW_-MgOhkN (lines 390-392)
content = content.replace(
  '<button aria-label="Decline Friend Request" onClick={() => handleRemoveFriend(edge.requesterId)} className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-red-400 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" title="Decline">',
  '<button type="button" aria-label="Decline Friend Request" title="Decline Friend Request" onClick={() => handleRemoveFriend(edge.requesterId)} className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-red-400 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">'
);

// Issue AZ-HmmRm28PW_-MgOhkO (lines 426-428)
content = content.replace(
  '<button aria-label="Cancel Friend Request" onClick={() => handleRemoveFriend(targetUid)} className="p-1.5 hover:bg-white/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" title="Cancel Request">',
  '<button type="button" aria-label="Cancel Friend Request" title="Cancel Friend Request" onClick={() => handleRemoveFriend(targetUid)} className="p-1.5 hover:bg-white/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">'
);


// Issue AZ-HmmRm28PW_-MgOhkG (lines 193-204)
content = content.replace(
  '<button \n        aria-label="Open Friends Sidebar"\n        onClick={() => setIsOpen(true)}\n        className="fixed bottom-6 right-6 p-4 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all z-40 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"\n      >',
  '<button type="button" aria-label="Open Friends Sidebar" title="Open Friends Sidebar" onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 p-4 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all z-40 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]">'
);


fs.writeFileSync(filePath, content);
console.log('updated');
