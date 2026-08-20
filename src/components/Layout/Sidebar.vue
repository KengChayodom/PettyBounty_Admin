<script setup lang="ts">
import { LayoutDashboard, Users, ShieldAlert, CreditCard, X } from 'lucide-vue-next'
import { useRoute } from 'vue-router'

const emit = defineEmits<{
  (e: 'close-mobile'): void
}>()

const route = useRoute()

const navItems = [
  { name: 'Overview', desc: 'Platform pulse', icon: LayoutDashboard, path: '/' },
  { name: 'Users', desc: 'Accounts & policy', icon: Users, path: '/users' },
  { name: 'Moderation', desc: 'Listings & disputes', icon: ShieldAlert, path: '/moderation' },
  { name: 'Transactions', desc: 'Payouts & analytics', icon: CreditCard, path: '/transactions' },
]
</script>

<template>
  <aside class="flex flex-col h-full bg-[#362621] text-white w-64 flex-shrink-0">
    <div class="p-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold border border-orange-500/30"
        >
          PB
        </div>
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
  </aside>
</template>
