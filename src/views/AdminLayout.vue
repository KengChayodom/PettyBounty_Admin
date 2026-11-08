<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'
import Sidebar from '@/components/Layout/Sidebar.vue'

const isMobileMenuOpen = ref(false)
const route = useRoute()

watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false
  },
)

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isMobileMenuOpen.value) {
    isMobileMenuOpen.value = false
  }
}

watch(isMobileMenuOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-[#FAF9F6]">
    <!-- Mobile Top Header Bar -->
    <header
      class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#362621] text-white z-20 flex items-center justify-between px-4 border-b border-white/10 shadow-sm"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold border border-orange-500/30 text-xs"
        >
          PB
        </div>
        <span class="font-bold text-sm">Petty Bounty</span>
      </div>
      <button
        @click="isMobileMenuOpen = !isMobileMenuOpen"
        type="button"
        class="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        :aria-expanded="isMobileMenuOpen"
        aria-label="Toggle mobile navigation menu"
      >
        <Menu v-if="!isMobileMenuOpen" :size="24" />
        <X v-else :size="24" />
      </button>
    </header>

    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobileMenuOpen"
        @click="isMobileMenuOpen = false"
        class="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
        aria-hidden="true"
      ></div>
    </Transition>

    <aside
      :class="[
        'fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
        isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
      ]"
    >
      <Sidebar @close-mobile="isMobileMenuOpen = false" />
    </aside>

    <main class="flex flex-1 flex-col overflow-hidden min-w-0 pt-16 lg:pt-0">
      <slot />
    </main>
  </div>
</template>
