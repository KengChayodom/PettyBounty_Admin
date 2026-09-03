import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    { path: '/', name: 'overview', component: () => import('@/views/OverviewView.vue') },
    {
      path: '/missing-pets',
      name: 'missing-pets',
      component: () => import('@/views/MissingPetsView.vue'),
    },
    {
      path: '/missing-pets/:id',
      name: 'missing-pets-detail',
      component: () => import('@/views/MissingPetDetailView.vue'),
    },
    {
      path: '/reviews',
      name: 'reviews',
      component: () => import('@/views/ReviewView.vue'),
    },
    { path: '/bounty', name: 'bounty', component: () => import('@/views/BountyView.vue') },
    { path: '/roles', name: 'roles', component: () => import('@/views/RolesView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

/**
 * The guard is a convenience, not the security boundary — `require_admin`
 * re-checks `users.role` on every request. What it does buy is not rendering a
 * console whose every call would 403, and refreshing a token that is about to
 * expire before the screen behind it starts firing requests.
 */
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) await auth.restore()
  else if (auth.session) await auth.ensureFreshToken()

  if (to.meta.public) {
    return auth.isAuthenticated ? { path: '/' } : true
  }
  if (!auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath === '/' ? {} : { next: to.fullPath } }
  }
  return true
})

export default router
