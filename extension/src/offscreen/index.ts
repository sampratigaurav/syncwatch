// Offscreen document for WebRTC and WebSocket connections
// This isolates the microphone permissions and socket connections from the content script

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  switch (message.type) {
    case 'INIT_WEBRTC':
      // Setup WebRTC and WebSocket
      console.log('Offscreen document initializing WebRTC/WebSocket');
      sendResponse({ success: true });
      break;
    default:
      console.warn(`Unexpected message type received in offscreen document: ${message.type}`);
  }
  return true; // Keep the message channel open for asynchronous responses
});
