<script setup lang="ts">
import { useRoute } from 'vue-router'
import AdminLayout from '@/views/AdminLayout.vue'
import ToastHost from '@/components/Common/ToastHost.vue'

const route = useRoute()
</script>

<template>
  <!-- Sign-in stands alone: no sidebar to a console you are not in yet. -->
  <RouterView v-if="route.meta.public" />
  <AdminLayout v-else>
    <RouterView />
  </AdminLayout>
  <ToastHost />
</template>
