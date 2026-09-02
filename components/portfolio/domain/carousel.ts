export function positiveModulo(value: number, length: number) {
  return ((value % length) + length) % length
}
