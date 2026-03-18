import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { Video } from 'lucide-react';
import { SERVER_URL } from '../lib/config';

export default function Home() {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const setRoomId = useRoomStore((s) => s.setRoomId);
  const { nickname, setNickname } = useRoomStore();

  const [inputRoomId, setInputRoomId] = useState(urlRoomId || '');
  const [inputName, setInputName] = useState(nickname);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!inputName.trim()) {
      setError('Nickname is required');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      setRoomId(data.roomId);
      setNickname(inputName);
      navigate(`/room/${data.roomId}/waiting`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!inputName.trim()) {
      setError('Nickname is required');
      return;
    }
    if (!inputRoomId.trim()) {
      setError('Room ID is required');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const code = inputRoomId.trim().toUpperCase();
      const res = await fetch(`${SERVER_URL}/api/rooms/${code}/exists`);
      if (!res.ok) throw new Error('Failed to check room');
      const data = await res.json();
      if (!data.exists) {
        setError('Room not found');
        return;
      }
      setRoomId(code);
      setNickname(inputName);
      navigate(`/room/${code}/waiting`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error joining room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-center mb-8 text-teal-500">
          <Video className="w-12 h-12 mr-3" />
          <h1 className="text-3xl font-bold text-white tracking-tight">SyncWatch</h1>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Your Nickname</label>
            <input 
              type="text"
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              placeholder="Movie Buff"
              maxLength={20}
            />
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <button 
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg px-4 py-3 transition-colors disabled:opacity-50"
            >
              Start a New Room
            </button>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-500 text-sm">or</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          <div className="flex space-x-2">
            <input 
              type="text"
              value={inputRoomId}
              onChange={e => setInputRoomId(e.target.value.toUpperCase())}
              className="flex-grow bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 placeholder-zinc-600 font-mono tracking-widest uppercase"
              placeholder="ROOM CODE"
              maxLength={6}
            />
            <button 
              onClick={handleJoinRoom}
              disabled={isLoading}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg px-6 py-3 transition-colors disabled:opacity-50 border border-zinc-700"
            >
              Join
            </button>
          </div>

          {error && (
            <div className="text-red-400 text-sm mt-4 text-center bg-red-950/30 py-2 rounded border border-red-900/50">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
