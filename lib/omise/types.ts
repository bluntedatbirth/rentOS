// Omise.js client-side type declarations.
// Omise.js is loaded via CDN (<script src="https://cdn.omise.co/omise.js">).
// It sets window.Omise — this file makes TypeScript aware of that global.
// The server-side Omise SDK is in lib/omise/client.ts (uses OMISE_SECRET_KEY).
// Client code uses window.Omise with NEXT_PUBLIC_OMISE_PUBLIC_KEY.

declare global {
  interface Window {
    Omise: {
      setPublicKey: (key: string) => void;
      createToken: (
        type: 'card',
        cardData: {
          name: string;
          number: string;
          expiration_month: string;
          expiration_year: string;
          security_code: string;
        },
        callback: (statusCode: number, response: { id?: string; message?: string }) => void
      ) => void;
    };
  }
}

export {};
