import { useEffect } from 'react';
import { useRoomStore } from '../store/roomStore';
import { getAuth, onIdTokenChanged } from 'firebase/auth';
import { getDatabase, ref, onDisconnect, onValue, set, serverTimestamp } from 'firebase/database';
import { socket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

export const AuthSync = () => {
  const setAuthToken = useRoomStore((state) => state.setAuthToken);
  const setFirebaseUid = useRoomStore((state) => state.setFirebaseUid);
  const setIsAuthLoading = useRoomStore((state) => state.setIsAuthLoading);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;


    const initializeFirebase = async () => {
      try {
        // Dynamically import to prevent Firebase core engine from bloating the anonymous bundle
        const { app } = await import('../firebase');
        const { SERVER_URL } = await import('../lib/config');
        const auth = getAuth(app);
        const rtdb = getDatabase(app);

        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        const db = getFirestore(app);

        // Listen to token changes (including silent refreshes every hour)
        unsubscribeAuth = onIdTokenChanged(auth, async (user) => {
          if (user) {
            const token = await user.getIdToken();
            setAuthToken(token);
            setFirebaseUid(user.uid);
            
            // Dynamically mutate socket auth for auto-reconnects
            socket.auth = { token };
            
            // Emit a dedicated rotation event in case we are actively connected
            if (socket.connected) {
              socket.emit('rotate_auth_token', { token });
            }
            
            // Handle Firestore identity initialization and syncing via Backend
            const googleName = user.displayName || `User_${user.uid.slice(0, 4)}`;
            const googlePhoto = user.photoURL || null;

            try {
              console.log("Sending init request to:", `${SERVER_URL}/api/users/initialize`);
              const res = await fetch(`${SERVER_URL}/api/users/initialize`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  displayName: googleName,
                  photoURL: googlePhoto,
                  email: user.email
                })
              });

              console.log("Init request response status:", res.status);
              if (!res.ok) throw new Error(`Failed to initialize user: ${res.statusText}`);
              const data = await res.json();
              console.log("Init request data:", data);
              
              useRoomStore.getState().setFriendCode(data.friendCode);

              // Fetch latest doc to populate zustand
              const userRef = doc(db, 'users', user.uid);
              const docSnap = await getDoc(userRef);
              if (docSnap.exists()) {
                const docData = docSnap.data();
                useRoomStore.getState().setNickname(docData.displayName || googleName);
                useRoomStore.getState().setAvatarUrl(docData.avatarUrl || googlePhoto);
              }
            } catch (err: any) {
              console.error("Failed to sync user profile", err);
              toast.error("Failed to connect to SyncWatch backend. Please check your backend deployment.", { id: 'backend-init-error' });
            }

            // RTDB Presence tracking
            const userStatusRef = ref(rtdb, `/status/${user.uid}`);
            const connectedRef = ref(rtdb, '.info/connected');

            onValue(connectedRef, (snapshot) => {
              if (snapshot.val() === false) {
                return;
              }

              // When I disconnect, update the last_changed time and set state to offline
              onDisconnect(userStatusRef).set({
                state: 'offline',
                last_changed: serverTimestamp(),
              }).then(() => {
                // Now that the onDisconnect hook is attached, set myself online
                set(userStatusRef, {
                  state: 'online',
                  last_changed: serverTimestamp(),
                });
              });
            });
          } else {
            setAuthToken(null);
            setFirebaseUid(null);
            socket.auth = {}; // Clear token
          }
          setIsAuthLoading(false);
        });
      } catch (error) {
        console.error("Firebase initialization failed:", error);
        setIsAuthLoading(false);
      }
    };

    initializeFirebase();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [setAuthToken, setFirebaseUid, setIsAuthLoading]);

  return null; // This is a logic-only bridge component
};
