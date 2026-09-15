import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseConfigured, firebaseDb } from '../lib/firebase';
import { mergeSave, parseSaveBundle, type SaveBundle } from '../lib/saveData';
import type { Difficulty } from '../lib/levels';

export type CloudStatus = 'unconfigured' | 'signedOut' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error';

export interface CloudUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

interface Options {
  getLocalBundle: () => SaveBundle;
  onApply: (bundle: SaveBundle) => void;
}

function contentFingerprint(bundle: SaveBundle): string {
  return JSON.stringify({ name: bundle.name, meta: bundle.meta, scores: bundle.scores });
}

function toCloudUser(user: User): CloudUser {
  return {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Player',
    email: user.email || '',
    photoURL: user.photoURL,
  };
}

function friendlyError(error: unknown): string {
  const raw = error as { code?: string; message?: string };
  switch (raw.code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in was closed before it finished.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Allow pop-ups for ENGRAM and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not yet authorized in Firebase Authentication.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this Firebase project.';
    case 'failed-precondition':
      return 'Create the Cloud Firestore database and deploy its security rules.';
    case 'permission-denied':
      return 'Firebase denied access. Deploy the included Firestore security rules.';
    case 'unavailable':
      return 'Cloud Sync is temporarily unavailable. Your local progress is safe.';
    default:
      return raw.message?.slice(0, 180) || 'Cloud Sync could not finish. Your local progress is safe.';
  }
}

export function useFirebaseSync({ getLocalBundle, onApply }: Options) {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [status, setStatus] = useState<CloudStatus>(firebaseConfigured ? 'signedOut' : 'unconfigured');
  const [detail, setDetail] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const authUserRef = useRef<User | null>(null);
  const busyRef = useRef(false);
  const queuedRef = useRef(false);
  const fingerprintRef = useRef('');
  const getLocalRef = useRef(getLocalBundle);
  const onApplyRef = useRef(onApply);
  getLocalRef.current = getLocalBundle;
  onApplyRef.current = onApply;

  const syncForUser = useCallback(async (authUser: User, force = false) => {
    if (!firebaseDb || !firebaseConfigured) return false;
    if (!navigator.onLine) {
      setStatus('offline');
      setDetail('Offline. Changes are safe here and will sync when you reconnect.');
      return false;
    }
    const local = getLocalRef.current();
    const localFingerprint = contentFingerprint(local);
    if (!force && localFingerprint === fingerprintRef.current) return true;
    if (busyRef.current) {
      queuedRef.current = true;
      return false;
    }

    busyRef.current = true;
    setStatus('syncing');
    setDetail('Merging this device with your private cloud save…');
    try {
      const saveRef = doc(firebaseDb, 'users', authUser.uid, 'saves', 'main');
      let merged = local;
      await runTransaction(firebaseDb, async (transaction) => {
        const snapshot = await transaction.get(saveRef);
        const remote = snapshot.exists() ? parseSaveBundle(snapshot.data().bundle) : null;
        merged = remote ? mergeSave(local, remote) : { ...local, ts: Date.now() };
        transaction.set(saveRef, {
          schema: 1,
          ownerUid: authUser.uid,
          bundle: merged,
          updatedAt: serverTimestamp(),
        });
      });

      fingerprintRef.current = contentFingerprint(merged);
      onApplyRef.current(merged);
      setStatus('synced');
      setLastSyncedAt(Date.now());
      setDetail('Cloud and this device are in sync.');
      return true;
    } catch (error) {
      setStatus(navigator.onLine ? 'error' : 'offline');
      setDetail(friendlyError(error));
      return false;
    } finally {
      busyRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        const active = authUserRef.current;
        if (active) window.setTimeout(() => void syncForUser(active), 0);
      }
    }
  }, []);

  useEffect(() => {
    if (!firebaseAuth || !firebaseConfigured) return;
    return onAuthStateChanged(firebaseAuth, (next) => {
      authUserRef.current = next;
      setUser(next ? toCloudUser(next) : null);
      if (next) {
        void syncForUser(next, true);
      } else {
        fingerprintRef.current = '';
        setStatus('signedOut');
        setDetail('Sign in to keep one private save across your devices.');
        setLastSyncedAt(null);
      }
    });
  }, [syncForUser]);

  useEffect(() => {
    const online = () => {
      const active = authUserRef.current;
      if (active) void syncForUser(active, true);
    };
    const offline = () => {
      if (authUserRef.current) {
        setStatus('offline');
        setDetail('Offline. Changes are safe here and will sync when you reconnect.');
      }
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [syncForUser]);

  const connect = useCallback(async () => {
    if (!firebaseAuth || !firebaseConfigured) return false;
    setStatus('connecting');
    setDetail('Opening Google sign-in…');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      authUserRef.current = result.user;
      setUser(toCloudUser(result.user));
      return await syncForUser(result.user, true);
    } catch (error) {
      setStatus('error');
      setDetail(friendlyError(error));
      return false;
    }
  }, [syncForUser]);

  const disconnect = useCallback(async () => {
    if (!firebaseAuth) return;
    await firebaseSignOut(firebaseAuth);
  }, []);

  const syncNow = useCallback(
    async (force = false) => {
      const active = authUserRef.current;
      if (!active) return false;
      return syncForUser(active, force);
    },
    [syncForUser]
  );

  /** Push a personal-best onto the public global board (monotone, rule-safe). */
  const submitLeaderboard = useCallback(async (mode: Difficulty, score: number, level: number) => {
    const authUser = authUserRef.current;
    if (!authUser || !firebaseDb || score <= 0) return false;
    try {
      const ref = doc(firebaseDb, 'leaderboards', mode, 'entries', authUser.uid);
      const existing = await getDoc(ref);
      const prevScore = existing.exists() ? (existing.data().score as number) : 0;
      const prevLevel = existing.exists() ? (existing.data().level as number) : 1;
      if (prevScore >= score && prevLevel >= level) return true;
      const name = (authUser.displayName || authUser.email?.split('@')[0] || 'PLAYER').slice(0, 16);
      await setDoc(ref, {
        uid: authUser.uid,
        name,
        score: Math.floor(Math.max(score, prevScore)),
        level: Math.max(level, prevLevel),
        date: Date.now(),
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const deleteCloudAccount = useCallback(async () => {
    const active = authUserRef.current;
    if (!active || !firebaseDb || !firebaseAuth) return false;
    setStatus('syncing');
    setDetail('Verifying your identity before deletion…');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await reauthenticateWithPopup(active, provider);
      setDetail('Deleting your private cloud save and account…');
      await deleteDoc(doc(firebaseDb, 'users', active.uid, 'saves', 'main'));
      await deleteUser(active);
      fingerprintRef.current = '';
      setDetail('Cloud account deleted. Your local progress remains on this device.');
      return true;
    } catch (error) {
      setStatus('error');
      setDetail(friendlyError(error));
      return false;
    }
  }, []);

  return {
    configured: firebaseConfigured,
    user,
    status,
    detail,
    lastSyncedAt,
    connect,
    disconnect,
    syncNow,
    submitLeaderboard,
    deleteCloudAccount,
  };
}

export type FirebaseSync = ReturnType<typeof useFirebaseSync>;