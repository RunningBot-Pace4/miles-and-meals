import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Add these to .env.local and Vercel:");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:your-email@example.com");
