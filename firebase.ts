// firebase.ts
// Updated to use the Firebase compat SDK directly from npm, instead of relying on window.firebase.
// This works correctly with Vite's bundler in both dev and production builds.

import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/functions";
import "firebase/compat/storage";
import { v4 as uuidv4 } from 'uuid';
import { State } from './state';

// Your web app's Firebase configuration from user prompt
export const firebaseConfig = {
  apiKey: "AIzaSyBSOfOv9zXBZNI_b0ZAUHmbP0cU8h5Xp_c",
  authDomain: "vcanship-onestop-logistics.firebaseapp.com",
  projectId: "vcanship-onestop-logistics",
  storageBucket: "vcanship-onestop-logistics.appspot.com",
  messagingSenderId: "685756131515",
  appId: "1:685756131515:web:55eb447560c628f12da19e"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}


// Export Firebase services (compat APIs)
export const auth = firebase.auth();
export const db = firebase.firestore();
export const functions = firebase.functions();
export const storage = firebase.storage();
export const GoogleAuthProvider = firebase.auth.GoogleAuthProvider;
export const AppleAuthProvider = firebase.auth.OAuthProvider;


// FIX: Implement and export the `logShipment` function to save shipment data to Firestore.
export async function logShipment(shipmentData: {
    service: string;
    tracking_id: string;
    origin: string;
    destination: string;
    cost: number;
    currency: string;
}) {
    try {
        if (!db) {
            console.error("Firestore is not initialized.");
            return;
        }
        await db.collection('shipments').add({
            ...shipmentData,
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            user_email: State.currentUser?.email || 'unknown',
            user_name: State.currentUser?.name || 'unknown'
        });
    } catch (error) {
        console.error("Error logging shipment to Firestore:", error);
        // This is a non-critical background task, so we don't show a UI error.
    }
}