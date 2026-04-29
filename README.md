# 🚗 PESU Pool

A real-time, privacy-first ride-sharing application built exclusively for PES University students. 

Tired of the daily hassle from the metro to campus? This app helps students quickly find and share autos or cabs from nearby metro stations (Mysore Road, Attiguppe, Nayandahalli) directly to the PESU Front or Back Gates.

## 🤝 Why Open Source? (A Note on Privacy)
We built this app to solve a problem, not to harvest your data. We made this repository public so any student can inspect the code and verify our privacy claims:
* **Zero Passwords Stored:** We do not handle or store your passwords. Login is verified directly through Microsoft Entra ID (the official university Microsoft portal). We only fetch your name and PES email to strictly restrict access to verified PES students.
* **Ephemeral Chats:** Chat history acts like Snapchat. The exact second a ride is marked "Completed" (or automatically expires), the database permanently shreds every single message. No chat history is kept.
* **Strict GPS Geofencing:** Your live location is entirely private. The app calculates your distance to campus locally on your device. Your coordinates are **only** broadcasted to your pool members if you are within a **2km radius** of PES University. If you are at home, your location is completely invisible.

## ✨ Features
* **Live Map Tracking:** Watch your driver or passengers move in real-time on a custom Leaflet map (powered by Pusher WebSockets).
* **Smart Bouncers:** You can only be in one active pool at a time, preventing spam and keeping the dashboard clean for everyone.
* **In-App Messaging:** WhatsApp-style live chat with automated system notifications when people join or leave your pool.
* **Ghost Pool Protection:** Empty pools are automatically cleared after 15 minutes, and forgotten pools are automatically completed to keep the active feed accurate.

## 🛠️ Tech Stack
* **Frontend:** Next.js (App Router), React, Tailwind CSS
* **Backend:** Next.js Server Actions
* **Database:** Prisma ORM 
* **Real-Time:** Pusher (WebSockets)
* **Maps:** React-Leaflet (OpenStreetMap)
* **Authentication:** NextAuth.js with Microsoft Entra ID (Azure AD)
* **Hosting:** Vercel

## 🚀 Run It Locally
Want to test the app or contribute a new feature? 

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/pesu-pool.git](https://github.com/YOUR_USERNAME/pesu-pool.git)
   cd pesu-pool
 as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
