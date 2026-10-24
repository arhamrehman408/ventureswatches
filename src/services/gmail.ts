import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Order } from '../types';
import { generateOrderConfirmationEmailHtml, sendOrderConfirmationEmail } from './api';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send'
];

let cachedAccessToken: string | null = null;
let currentUser: FirebaseUser | null = null;
let isSigningIn = false;

const googleProvider = new GoogleAuthProvider();
GMAIL_SCOPES.forEach(scope => googleProvider.addScope(scope));
// Set custom parameters to prompt user for account selection
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Listener for auth state
export function initGmailAuth(
  onStateChanged?: (user: FirebaseUser | null, token: string | null) => void
) {
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!user) {
      cachedAccessToken = null;
    }
    if (onStateChanged) {
      onStateChanged(user, cachedAccessToken);
    }
  });
}

export async function connectGmail(): Promise<{ user: FirebaseUser; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Gmail access token from Google.');
    }
    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Gmail connection error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

export function getCachedGmailToken(): string | null {
  return cachedAccessToken;
}

export function getCachedGmailUser(): FirebaseUser | null {
  return currentUser;
}

export async function disconnectGmail(): Promise<void> {
  cachedAccessToken = null;
  currentUser = null;
  await auth.signOut();
}

/**
 * Encodes string to RFC 4648 Base64URL
 */
function base64UrlEncode(str: string): string {
  // Use UTF-8 encoding for Unicode safety
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Creates RFC 2822 compliant email string
 */
function createRawEmailMessage({
  fromName = 'Ventures Watches Concierge',
  fromEmail = 'ventureswatches@gmail.com',
  toEmail,
  toName,
  subject,
  htmlContent
}: {
  fromName?: string;
  fromEmail?: string;
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}): string {
  const recipient = toName ? `"${toName}" <${toEmail}>` : toEmail;
  const sender = `"${fromName}" <${fromEmail}>`;

  const lines = [
    `From: ${sender}`,
    `To: ${recipient}`,
    `Reply-To: ${sender}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    '',
    btoa(unescape(encodeURIComponent(htmlContent)))
  ];

  return lines.join('\r\n');
}

/**
 * Sends order confirmation email directly through Gmail API using ventureswatches@gmail.com
 */
export async function sendOrderConfirmationViaGmail(
  order: Order,
  options?: {
    customNote?: string;
    trackingNumber?: string;
    courier?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // 1. Check if we have an active access token
  if (!cachedAccessToken) {
    // Attempt to prompt for sign-in if not connected
    try {
      const conn = await connectGmail();
      cachedAccessToken = conn.accessToken;
    } catch (authErr: any) {
      return {
        success: false,
        error: 'Gmail account not connected. Please connect your ventureswatches@gmail.com Google account to send.'
      };
    }
  }

  try {
    const htmlBody = generateOrderConfirmationEmailHtml(order, options?.customNote, options?.trackingNumber);
    const rawRfc2822 = createRawEmailMessage({
      fromName: 'Ventures Watches Concierge',
      fromEmail: currentUser?.email || 'ventureswatches@gmail.com',
      toEmail: order.customer.email,
      toName: order.customer.name,
      subject: `Order Confirmation #${order.orderNumber} - Ventures Watches Verified`,
      htmlContent: htmlBody
    });

    const encodedMessage = base64UrlEncode(rawRfc2822);

    // Call Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // If unauthorized, clear cached token
      if (response.status === 401 || response.status === 403) {
        cachedAccessToken = null;
      }
      throw new Error(errorData.error?.message || `Gmail API error ${response.status}: Failed to send message.`);
    }

    const data = await response.json();

    // 2. Also record in Firestore / server database
    await sendOrderConfirmationEmail(order.id, options);

    return {
      success: true,
      messageId: data.id
    };
  } catch (err: any) {
    console.error('Failed to send email via Gmail API:', err);
    return {
      success: false,
      error: err.message || 'An error occurred while sending email through Gmail.'
    };
  }
}
