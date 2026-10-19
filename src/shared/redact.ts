export function redactSecrets(message: string, secrets: string[]): string {
  let output = message
  for (const secret of secrets) {
    const trimmed = secret.trim()
    if (trimmed.length < 6) continue
    output = output.split(trimmed).join('••••')
  }
  return output
}
