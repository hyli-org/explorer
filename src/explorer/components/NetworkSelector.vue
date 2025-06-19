<script setup lang="ts">
import { network } from "@/state/network";
</script>

<template>
    <div class="relative inline-block">
        <select
            v-model="network"
            class="appearance-none min-w-[140px] bg-white/80 backdrop-blur-sm border border-white/20 text-secondary px-4 py-2 pr-10 rounded-xl font-medium cursor-pointer hover:bg-secondary/5 transition-colors uppercase text-sm"
        >
            <option value="testnet">Testnet</option>
            <option value="localhost">Localhost</option>
        </select>
        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    </div>
</template>

<style scoped>
select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
}

/* Remove default focus outline and add custom one */
select:focus {
    @apply outline-none ring-2 ring-primary/20;
}

/* Style the options dropdown */
select option {
    @apply bg-white text-secondary py-2;
}

/* Remove default focus styles in Firefox */
select:-moz-focusring {
    color: transparent;
    text-shadow: 0 0 0 #1e2933;
}

/* Remove default arrow in IE */
select::-ms-expand {
    display: none;
}
</style>
