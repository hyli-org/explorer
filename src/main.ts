import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import "@/style.css";
import App from "@/App.vue";
import Home from "@/explorer/Home.vue";
import Transaction from "./explorer/Transaction.vue";
import Block from "./explorer/Block.vue";
import Contract from "./explorer/Contract.vue";
import Blocks from "./explorer/Blocks.vue";
import Transactions from "./explorer/Transactions.vue";
import Proofs from "./explorer/Proofs.vue";
import NetworkStats from "./explorer/NetworkStats.vue";
import Dashboard from "./explorer/Dashboard.vue";
import Address from "./explorer/Address.vue";
import LaneManagerDetail from "./explorer/LaneManagerDetail.vue";

const routes = [
    { path: "/", component: Home, name: "Home" },
    {
        path: "/tx/:tx_hash",
        component: Transaction,
        name: "Transaction",
    },
    {
        path: "/block/:block_hash",
        component: Block,
        name: "Block",
    },
    {
        path: "/blocks",
        component: Blocks,
        name: "Blocks",
    },
    {
        path: "/transactions",
        component: Transactions,
        name: "Transactions",
    },
    {
        path: "/contract/:contract_name",
        component: Contract,
        name: "Contract",
    },
    {
        path: "/proofs",
        component: Proofs,
        name: "Proofs",
    },
    {
        path: "/network-stats",
        component: NetworkStats,
        name: "NetworkStats",
    },
    {
        path: "/dashboard",
        component: Dashboard,
        name: "Dashboard",
    },
    {
        path: "/address/:address",
        component: Address,
        name: "Address",
    },
    {
        path: "/lane-manager/:lane_manager_id",
        component: LaneManagerDetail,
        name: "LaneManagerDetail",
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

createApp(App).use(router).mount("#app");
