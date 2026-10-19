export interface AuthSuccess {
  ok: true
  subject: string
}

export interface AuthFailure {
  ok: false
  reason: string
}

export interface Authenticator {
  authenticate: (authorization: string | undefined) => AuthSuccess | AuthFailure
}

export function devTokenAuthenticator(expectedToken: string): Authenticator {
  return {
    authenticate(authorization) {
      const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization ?? '')
      if (!match || match[1] !== expectedToken) return { ok: false, reason: 'unauthorized' }
      return { ok: true, subject: 'dev' }
    },
  }
}

/**
 * Email OTP can implement Authenticator later: requestCode sends a one-time
 * code, verifyCode returns a session token, and authenticate checks that
 * session. Routes should depend only on Authenticator.
 */
export interface EmailOtpChallenge {
  requestCode: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<{ sessionToken: string }>
}
