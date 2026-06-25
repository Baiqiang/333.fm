<script setup lang="ts">

</script>

<template>
  <div>
    <AppHeader />
    <div class="container mx-auto px-2 md:px-4 min-h-[calc(100vh-88px)]">
      <slot />
    </div>
    <AppFooter />
  </div>
</template>
