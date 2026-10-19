export function keyHint(secret: string): string {
  if (!secret) return ''
  return `••••${secret.slice(-4)}`
}

export function keyStorageKind(encryptionAvailable: boolean): 'os-keychain' | 'local-file' {
  return encryptionAvailable ? 'os-keychain' : 'local-file'
}

export function sealSecret(
  plain: string,
  encryptionAvailable: boolean,
  encrypt: (value: string) => Buffer,
): string {
  if (!plain) return ''
  if (encryptionAvailable) return `enc:${encrypt(plain).toString('base64')}`
  return `plain:${Buffer.from(plain, 'utf8').toString('base64')}`
}

export function openSecret(stored: string, decrypt: (buffer: Buffer) => string): string {
  if (!stored) return ''
  try {
    if (stored.startsWith('enc:')) return decrypt(Buffer.from(stored.slice(4), 'base64'))
    if (stored.startsWith('plain:')) return Buffer.from(stored.slice(6), 'base64').toString('utf8')
    return ''
  } catch {
    return ''
  }
}
