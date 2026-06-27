import { Router, Request, Response, NextFunction } from 'express';
import { auth, db } from '../firebase/index';
import crypto from 'crypto';

export const userRouter = Router();

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth!.verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

const generateFriendCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like I, 1, O, 0
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

userRouter.post('/initialize', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { displayName, photoURL, email } = req.body;

  try {
    const userRef = db!.collection('users').doc(user.uid);
    const docSnap = await userRef.get();

    if (docSnap.exists) {
      // User already exists
      const data = docSnap.data()!;
      if (data.friendCode) {
        return res.json({ success: true, friendCode: data.friendCode });
      }
      // If legacy user without a friendCode, fall through to generate one
    }

    // New user: Generate a unique friend code
    let friendCode = generateFriendCode();
    let isUnique = false;
    
    // Safety loop to ensure absolute uniqueness across the database
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const collisionCheck = await db!.collection('users').where('friendCode', '==', friendCode).get();
      if (collisionCheck.empty) {
        isUnique = true;
      } else {
        friendCode = generateFriendCode();
        attempts++;
      }
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate a unique friend code. Please try again.' });
    }

    // Initialize the document
    const fallbackName = displayName || `User_${user.uid.slice(0, 4)}`;
    
    await userRef.set({
      displayName: fallbackName,
      avatarUrl: photoURL || null,
      email: email || null,
      friendCode: friendCode,
      createdAt: new Date().getTime(),
      lastSeen: new Date().getTime(),
    }, { merge: true });

    return res.json({ success: true, friendCode });
  } catch (err) {
    console.error('Failed to initialize user:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
