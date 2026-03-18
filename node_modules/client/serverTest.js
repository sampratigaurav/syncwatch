import { io } from 'socket.io-client';

async function runTests() {
  const SERVER_URL = 'http://localhost:3001';
  let passed = 0;
  let failed = 0;

  class TestClient {
    constructor(nickname) {
      this.socket = io(SERVER_URL, { forceNew: true });
      this.nickname = nickname;
      this.events = [];
      this.socket.onAny((ev, ...args) => this.events.push({ event: ev, args }));
    }
    async connect() {
      return new Promise(r => this.socket.on('connect', r));
    }
    disconnect() {
      this.socket.disconnect();
    }
    waitForEvent(eventName, predicate = null, timeoutMs = 5000) {
      return new Promise((resolve, reject) => {
        let timer;
        const handler = (...args) => {
          if (predicate && !predicate(...args)) return;
          clearTimeout(timer);
          this.socket.off(eventName, handler);
          resolve(args);
        };
        this.socket.on(eventName, handler);
        timer = setTimeout(() => {
          this.socket.off(eventName, handler);
          reject(new Error(`Timeout waiting for ${eventName}`));
        }, timeoutMs);
      });
    }
  }

  const client1 = new TestClient('Alice');
  const client2 = new TestClient('Bob');
  const client3 = new TestClient('Charlie');

  try {
    console.log('--- Connecting clients ---');
    await Promise.all([client1.connect(), client2.connect(), client3.connect()]);

    console.log('--- Testing API Endpoints ---');
    const res = await fetch(SERVER_URL + '/api/rooms', { method: 'POST' });
    const { roomId } = await res.json();
    if (typeof roomId !== 'string' || roomId.length !== 6) throw new Error('Invalid roomId');
    
    const existsYes = await fetch(SERVER_URL + `/api/rooms/${roomId}/exists`).then(r => r.json());
    if (!existsYes.exists) throw new Error('Room should exist');

    const existsNo = await fetch(SERVER_URL + `/api/rooms/FAKE12/exists`).then(r => r.json());
    if (existsNo.exists) throw new Error('Fake room should not exist');
    console.log('✅ API endpoints pass');

    console.log('--- Testing Socket Room Logic ---');
    // First connection joins
    client1.socket.emit('join_room', { roomId, nickname: 'Alice' });
    let [roomState1] = await client1.waitForEvent('room_state');
    const me1 = roomState1.participants.find(p => p.id === client1.socket.id);
    if (me1.role !== 'host') throw new Error('First user not host');

    // Second joins
    client2.socket.emit('join_room', { roomId, nickname: 'Bob' });
    let [roomState2] = await client2.waitForEvent('room_state');
    const me2 = roomState2.participants.find(p => p.id === client2.socket.id);
    if (me2.role !== 'viewer') throw new Error('Second user not viewer');

    // Third joins
    client3.socket.emit('join_room', { roomId, nickname: 'Charlie' });
    let [roomState3] = await client3.waitForEvent('room_state');
    const me3 = roomState3.participants.find(p => p.id === client3.socket.id);
    if (me3.role !== 'viewer') throw new Error('Third user not viewer');

    // Disconnect one connection
    const charlieId = client3.socket.id;
    const charlieDisconnectPromise = client1.waitForEvent('participant_update', (p) => p.id === charlieId && p.status === 'disconnected');
    client3.disconnect();
    let [updateDisconnect] = await charlieDisconnectPromise;
    
    console.log('✅ Basic connection, roles and disconnect handled gracefully');

    console.log('--- Testing File Verification ---');
    // Host sends file verified
    client1.socket.emit('file_verified', { hash: 'HASH_A', size: 1000, name: 'movie.mp4' });
    await client1.waitForEvent('file_match');
    
    // Viewer sends same hash
    client2.socket.emit('file_verified', { hash: 'HASH_A', size: 1000, name: 'movie.mp4' });
    await client2.waitForEvent('file_match');

    console.log('✅ File verification match working');

    // Viewer sends different hash
    // reconnect charlie logic
    const client3_b = new TestClient('CharlieB');
    await client3_b.connect();
    client3_b.socket.emit('join_room', { roomId, nickname: 'Charlie' });
    await client3_b.waitForEvent('room_state');
    
    client3_b.socket.emit('file_verified', { hash: 'HASH_B', size: 300, name: 'other.mp4' });
    await client3_b.waitForEvent('file_mismatch');
    console.log('✅ File verification mismatch working');

    console.log('--- Testing Playback Authority ---');
    // Viewer emits
    client2.socket.emit('playback_event', { action: 'play', currentTime: 10, timestamp: Date.now() });
    await new Promise(r => setTimeout(r, 500));
    if (client1.events.some(e => e.event === 'playback_broadcast')) {
       throw new Error('Server broadcast viewer playback event');
    }

    // Host emits
    client1.socket.emit('playback_event', { action: 'play', currentTime: 20, timestamp: Date.now() });
    await client2.waitForEvent('playback_broadcast');
    console.log('✅ Playback authority working');

    console.log('--- Testing Buffering ---');
    client2.socket.emit('buffering_state', { isBuffering: true });
    await client1.waitForEvent('force_pause');

    client2.socket.emit('buffering_state', { isBuffering: false });
    await client1.waitForEvent('resume_allowed');
    console.log('✅ Buffering cascades correctly');

    console.log('--- Testing Latency ---');
    client1.socket.emit('ping', { sentAt: 1234 });
    let [pong] = await client1.waitForEvent('pong');
    if (pong.sentAt !== 1234) throw new Error('Pong mismatch');
    console.log('✅ Latency Ping-Pong passes');

    console.log('\nSUCCESS! All Phase 2 tests passed.');
    process.exit(0);

  } catch (err) {
    console.error('\nFAILED:');
    console.error(err);
    console.log('Client 1 event history:');
    console.log(JSON.stringify(client1.events, null, 2));
    process.exit(1);
  }
}

runTests();
