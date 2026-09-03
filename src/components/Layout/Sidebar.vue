<script setup lang="ts">
import { BadgeDollarSign, KeyRound, LayoutDashboard, LogOut, PawPrint, ShieldAlert, X } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{
  (e: 'close-mobile'): void
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// One entry per duty an administrator actually has. Account suspension,
// ban, and deletion are deliberately absent: an upheld flag deducts score
// instead (2026-08-20), the owner decides sighting matches (2026-08-21),
// and role management (SRS-94–98, 2026-09-02) is scoped to granting and
// revoking console access — not listing or searching accounts.
const navItems = [
  { name: 'Overview', desc: 'Platform pulse', icon: LayoutDashboard, path: '/' },
  { name: 'Missing pets', desc: 'Reports & timelines', icon: PawPrint, path: '/missing-pets' },
  { name: 'Reviews', desc: 'Flagged sightings', icon: ShieldAlert, path: '/reviews' },
  // { name: 'Bounty', desc: 'Settle payouts', icon: BadgeDollarSign, path: '/bounty' },
  { name: 'Roles', desc: 'Console access', icon: KeyRound, path: '/roles' },
]

async function signOut() {
  emit('close-mobile')
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <aside class="flex flex-col h-full bg-[#362621] text-white w-64 flex-shrink-0">
    <div class="p-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img src="@/assets/logo.png" alt="Petty Bounty Logo" class="h-8 w-8 object-contain">
        <div>
          <h2 class="text-sm font-bold tracking-wide">Petty Bounty</h2>
          <p class="text-[10px] text-gray-400 uppercase tracking-widest">Admin console</p>
        </div>
      </div>

      <!-- ปุ่มปิด Mobile Sidebar ปลอดภัยไม่หลุดขอบจอ -->
      <button
        @click="emit('close-mobile')"
        type="button"
        class="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Close sidebar navigation"
      >
        <X :size="20" />
      </button>
    </div>

    <nav class="flex-1 px-4 space-y-2 mt-2">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        @click="emit('close-mobile')"
        class="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 cursor-pointer text-gray-400 hover:bg-[#4A3731]/50 hover:text-white"
        active-class="bg-[#4A3731] text-white border border-white/10 !text-white"
      >
        <component
          :is="item.icon"
          :size="20"
          :class="route.path === item.path ? 'text-orange-400' : ''"
        />
        <div>
          <p class="text-sm font-medium">{{ item.name }}</p>
          <p class="text-[10px] opacity-70">{{ item.desc }}</p>
        </div>
      </router-link>
    </nav>

    <div class="border-t border-white/10 p-4">
      <div class="mb-3 min-w-0 px-1">
        <p class="truncate text-sm font-medium">
          {{ auth.profile?.display_name ?? 'Administrator' }}
        </p>
        <p class="text-[10px] tracking-widest text-gray-400 uppercase">Administrator</p>
      </div>
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-gray-400 transition-colors hover:bg-[#4A3731]/50 hover:text-white"
        @click="signOut"
      >
        <LogOut :size="18" />
        Sign out
      </button>
    </div>
  </aside>
</template>
