export function getStoreDestination(store) {
  if (!store) {
    return '/onboarding'
  }

  if (store.isOnboardingCompleted) {
    return '/dashboard'
  }

  return `/onboarding/${store.id}`
}
