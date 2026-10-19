import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onIdTokenChanged,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  connectAuthEmulator,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
import firebaseConfig from "../../firebase-applet-config.json";
const emulated = import.meta.env.VITE_USE_EMULATORS === "true";
if (emulated && !["localhost", "127.0.0.1"].includes(location.hostname))
  throw new Error("Emulators can only run on localhost");
const app = initializeApp(
  emulated
    ? {
        ...firebaseConfig,
        projectId: "demo-primepacks",
        authDomain: "demo-primepacks.firebaseapp.com",
      }
    : firebaseConfig,
);
export const db = getFirestore(
  app,
  emulated ? "(default)" : firebaseConfig.firestoreDatabaseId,
);
export const auth = getAuth(app);
export const functions = getFunctions(app, "us-central1");
if (emulated) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
export const subscribeToAuth = (
  callback: Parameters<typeof onIdTokenChanged>[1],
) => onIdTokenChanged(auth, callback);
export async function signInWithEmail(email: string, password: string) {
  return (await signInWithEmailAndPassword(auth, email.trim(), password)).user;
}
export async function signUpWithEmail(
  email: string,
  password: string,
  username?: string,
) {
  const { user } = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  if (username?.trim())
    await updateProfile(user, { displayName: username.trim().slice(0, 100) });
  await sendEmailVerification(user);
  return user;
}
export const logOutUser = () => signOut(auth);
// Anonymous accounts cannot buy packs, receive credits or request fulfillment.
export async function signInAsGuest(): Promise<never> {
  throw new Error("Please create an account to collect cards.");
}
export const verifyEmail = () => {
  if (!auth.currentUser) throw new Error("Sign in first");
  return sendEmailVerification(auth.currentUser);
};
export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email.trim());
export async function callApi<T>(name: string, data: unknown): Promise<T> {
  const response = await httpsCallable<unknown, T>(functions, name)(data);
  return response.data;
}
