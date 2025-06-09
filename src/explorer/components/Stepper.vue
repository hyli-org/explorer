<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
    currentStep: number;
    finalStatus?: string;
}>();

const steps = computed(() => ["Waiting Dissemination", "Data Proposal Created", "Sequenced", props.finalStatus]);

const getStepClass = computed(() => (index: number) => {
    if (index <= props.currentStep) return "completed";
    return "disabled";
});
</script>

<template>
    <div class="steps-container w-full flex justify-between items-center">
        <div v-for="(step, index) in steps" :key="step" class="step flex flex-col items-center relative" :class="getStepClass(index)">
            <div
                class="bullet flex justify-center items-center"
                :class="
                    (() => {
                        if (!props.finalStatus) return 'pending';
                        if (index == currentStep && props.finalStatus === 'Success') return 'success';
                        if (index == currentStep && props.finalStatus === 'Failure') return 'failed';
                        return 'default';
                    })()
                "
            >
                <span class="checkmark">✓</span>
            </div>
            <div class="title text-center">
                {{ step }}
            </div>
            <div v-if="index < steps.length - 1" class="line" :class="{ disabled: index === currentStep }"></div>
        </div>
    </div>
</template>

<style scoped>
.steps-container {
    padding: 1rem 0;
    width: 100%;
    max-width: 100%;
}

.step {
    flex: 1;
    position: relative;
    min-width: 0; /* Prevents flex items from overflowing */
}

.bullet {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background-color: #26318d;
    color: white;
    font-weight: bold;
}

.title {
    font-size: 0.875rem;
    margin-top: 0.3rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    padding: 0 0.5rem;
}

.line {
    position: absolute;
    top: 25%;
    left: 50%;
    width: 100%;
    height: 2px;
    background-color: #666;
    z-index: -1;
}

.checkmark {
    color: white;
    font-size: 1.2rem;
    line-height: 1;
}

.step.disabled {
    .bullet,
    .line {
        background-color: #e0e0e0;
    }
    .title {
        color: #999;
    }
}

.step.current {
    .bullet {
        background-color: #666;
    }
}

.step.completed {
    .bullet {
        background-color: #00d992;
    }
    .bullet.failed {
        background-color: #ff4d4f;
    }
}
</style>
