<script setup lang="ts">
import Stepper from "./Stepper.vue";

const props = defineProps<{
    status?: string;
}>();

const getCurrentStep = () => {
    console.log("getCurrentStep called with status:", props.status);
    if (!props.status) return 0;
    if (props.status === "WaitingDissemination") return 0;
    if (props.status === "DataProposalCreated") return 1;
    if (props.status === "Sequenced") return 2;
    if (["Success", "Failure", "Timeout"].includes(props.status)) return 3;
    return 0;
};

const getFinalStatus = () => {
    console.log("getFinalStatus called with status:", props.status);
    if (["Success", "Failure", "Timeout"].includes(props.status || "")) {
        return props.status;
    }
    return "Unsettled";
};
</script>

<template>
    <div class="flex flex-col gap-4" style="width: 100%">
        <Stepper :current-step="getCurrentStep()" :final-status="getFinalStatus()" />
    </div>
</template>
