const STORE_AVATAR_COLORS = [
  '#d6e600',
  '#ffd166',
  '#ef8f6b',
  '#7dd3fc',
  '#86efac',
  '#c4b5fd',
  '#f9a8d4',
  '#fdba74',
  '#a7f3d0',
  '#bfdbfe',
]

export function getStoreInitial(store) {
  return store?.name?.trim()?.charAt(0)?.toUpperCase() || 'S'
}

export function getStoreAvatarStyle(store) {
  const seed = String(store?.id ?? store?.name ?? 'store')
  const hash = Array.from(seed).reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  )

  return {
    backgroundColor: STORE_AVATAR_COLORS[hash % STORE_AVATAR_COLORS.length],
  }
}
