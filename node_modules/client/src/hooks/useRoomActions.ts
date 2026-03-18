import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';

export const useRoomActions = () => {
  const navigate = useNavigate();
  const setRoomId = useRoomStore((s) => s.setRoomId);
  const { setNickname } = useRoomStore();

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createRoom = async (inputName: string) => {
    if (!inputName.trim()) {
      setError('Nickname is required');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
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

  const joinRoom = async (inputName: string, inputRoomId: string) => {
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
      const res = await fetch(`/api/rooms/${code}/exists`);
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

  return { createRoom, joinRoom, error, isLoading };
};
