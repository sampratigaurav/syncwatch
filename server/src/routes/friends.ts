import { Router, Request, Response, NextFunction } from 'express';
import { auth, db } from '../firebase/index';
import { FieldValue } from 'firebase-admin/firestore';

export const friendRouter = Router();

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

const getEdgeId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

friendRouter.post('/request', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { friendCode } = req.body;

  if (!friendCode || typeof friendCode !== 'string') {
    return res.status(400).json({ error: 'Friend code is required' });
  }

  try {
    // Look up target by friendCode
    const targetQuery = await db!.collection('users').where('friendCode', '==', friendCode).get();
    
    if (targetQuery.empty) {
      return res.status(404).json({ error: 'No user found with that Friend Code.' });
    }

    const targetDoc = targetQuery.docs[0];
    const targetUid = targetDoc.id;

    if (targetUid === user.uid) {
      return res.status(400).json({ error: 'You cannot add yourself as a friend.' });
    }

    const edgeId = getEdgeId(user.uid, targetUid);
    const edgeRef = db!.collection('friendships').doc(edgeId);
    
    const edgeSnap = await edgeRef.get();
    
    if (edgeSnap.exists) {
      const edgeData = edgeSnap.data()!;
      if (edgeData.status === 'accepted') {
        return res.status(400).json({ error: 'You are already friends.' });
      }
      if (edgeData.status === 'pending') {
        if (edgeData.requesterId === user.uid) {
          return res.status(400).json({ error: 'Friend request already sent.' });
        } else {
          // They already sent US a request, so accept it!
          await edgeRef.update({
            status: 'accepted',
            updatedAt: FieldValue.serverTimestamp()
          });
          return res.json({ success: true, message: 'Friend request accepted!' });
        }
      }
    }

    // Get our own profile to denormalize
    const myDoc = await db!.collection('users').doc(user.uid).get();
    const myData = myDoc.data()!;
    const targetData = targetDoc.data();

    // Create the pending edge document
    await edgeRef.set({
      participants: [user.uid, targetUid],
      status: 'pending',
      requesterId: user.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      profiles: {
        [user.uid]: {
          displayName: myData.displayName || 'Unknown',
          avatarUrl: myData.avatarUrl || null,
          friendCode: myData.friendCode
        },
        [targetUid]: {
          displayName: targetData.displayName || 'Unknown',
          avatarUrl: targetData.avatarUrl || null,
          friendCode: targetData.friendCode
        }
      }
    });

    return res.json({ success: true, message: 'Friend request sent!' });

  } catch (err) {
    console.error('Failed to send friend request:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

friendRouter.post('/accept', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { targetUid } = req.body;

  if (!targetUid) return res.status(400).json({ error: 'Target UID is required' });

  try {
    const edgeId = getEdgeId(user.uid, targetUid);
    const edgeRef = db!.collection('friendships').doc(edgeId);
    
    const edgeSnap = await edgeRef.get();
    
    if (!edgeSnap.exists) {
      return res.status(404).json({ error: 'Friend request not found.' });
    }

    const edgeData = edgeSnap.data()!;
    
    if (edgeData.status === 'accepted') {
      return res.status(400).json({ error: 'Already friends.' });
    }
    
    if (edgeData.requesterId === user.uid) {
      return res.status(400).json({ error: 'You cannot accept your own request.' });
    }

    // Get freshest profiles just in case
    const myDoc = await db!.collection('users').doc(user.uid).get();
    const targetDoc = await db!.collection('users').doc(targetUid).get();

    await edgeRef.update({
      status: 'accepted',
      updatedAt: FieldValue.serverTimestamp(),
      [`profiles.${user.uid}`]: {
        displayName: myDoc.data()?.displayName || 'Unknown',
        avatarUrl: myDoc.data()?.avatarUrl || null,
        friendCode: myDoc.data()?.friendCode
      },
      [`profiles.${targetUid}`]: {
        displayName: targetDoc.data()?.displayName || 'Unknown',
        avatarUrl: targetDoc.data()?.avatarUrl || null,
        friendCode: targetDoc.data()?.friendCode
      }
    });

    return res.json({ success: true, message: 'Friend request accepted!' });

  } catch (err) {
    console.error('Failed to accept friend request:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

friendRouter.delete('/:targetUid', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const targetUid = req.params.targetUid as string;

  try {
    const edgeId = getEdgeId(user.uid, targetUid);
    await db!.collection('friendships').doc(edgeId).delete();
    
    return res.json({ success: true, message: 'Friend removed/declined.' });
  } catch (err) {
    console.error('Failed to remove friend:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
