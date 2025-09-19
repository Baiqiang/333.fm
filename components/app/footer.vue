<template>
  <footer class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 shadow-inner">
    <div class="container mx-auto flex flex-col md:flex-row items-center justify-between px-4">
      <div class="flex items-center gap-4 mb-2 md:mb-0">
        <a
          href="https://api.333.fm/api"
          target="_blank"
          class="transition-colors duration-200 hover:text-yellow-300 flex items-center gap-1"
        >
          <Icon name="mdi:api" class="w-4 h-4 inline-block" />
          API
        </a>
        <span class="hidden md:inline">|</span>
        <a
          href="https://github.com/Baiqiang/333.fm"
          target="_blank"
          class="transition-colors duration-200 hover:text-yellow-300 flex items-center gap-1"
        >
          <Icon name="mdi:github" class="w-4 h-4 inline-block" />
          GitHub
        </a>
      </div>
      <div class="text-xs text-gray-200">
        © {{ new Date().getFullYear() }} 333.fm
      </div>
    </div>
  </footer>
</template>
