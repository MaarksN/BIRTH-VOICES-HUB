import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, getDoc, writeBatch } from 'firebase/firestore';

// Configuration for local firestore emulator or safe sandbox
const firebaseConfig = {
  projectId: "birth-voices-hub",
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export { firestore, collection, getDocs, setDoc, doc, getDoc, writeBatch };
