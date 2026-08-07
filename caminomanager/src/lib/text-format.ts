export function toSentenceCase(value: string): string {
  const wordsSeparated = value
    .trim()
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, "$1 $2")
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")

  if (!wordsSeparated) return ""

  const lowerCase = wordsSeparated.toLocaleLowerCase("es")
  const firstCharacter = lowerCase[0]

  return /\p{L}/u.test(firstCharacter)
    ? firstCharacter.toLocaleUpperCase("es") + lowerCase.slice(1)
    : lowerCase
}
