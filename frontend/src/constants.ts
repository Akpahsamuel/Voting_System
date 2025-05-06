// Package IDs for different networks
export const TESTNET_PACKAGE_ID = "0x1c67bd18519a371c36de2a3b0bdc2f10164146c9649916d7a4eb2bd95825443b";
export const DEVNET_PACKAGE_ID = "0x3c847811d741c98af22f31c2250f9e34d0493a1a149508841a638d2d957b2697";
export const MAINNET_PACKAGE_ID = "0x0"; // Replace with actual package ID when deploying to mainnet

// Admin capability IDs
export const TESTNET_ADMIN_CAP = "";
export const DEVNET_ADMIN_CAP = "";
export const MAINNET_ADMIN_CAP = "0x234";

// Super admin capability IDs
export const TESTNET_SUPER_ADMIN_CAP = "0xa6ab126a28499850cf3529ef21e28fad975aec1f288c9052fd3ad637bdd24726";
export const DEVNET_SUPER_ADMIN_CAP = "0x73a4872a1abbf1670e1d5da08ac21ecac9796ccb53a309b27eecb7fe496e3ab6";
export const MAINNET_SUPER_ADMIN_CAP = "0x234";

// Dashboard IDs - replace with actual IDs after deploying dashboard objects
// IMPORTANT: If your proposals don't show on the dashboard, this ID might be incorrect.
// Check Sui Explorer for the actual dashboard object ID by searching for dashboard::Dashboard
export const TESTNET_DASHBOARD_ID = "0x3dd4936cc9686cf3ed84b6db346d7079d932ff85de23fc6e0d75e2fbb5ef77fa"; // Verify this matches the actual deployed dashboard ID on testnet
export const DEVNET_DASHBOARD_ID = "0xb707928d91045a3a99167bc56e3cd996030cc66d87055df2d1ce16b1f5feb1ac"; // Fixed devnet dashboard ID
export const MAINNET_DASHBOARD_ID = "0x0"; // Replace with actual mainnet dashboard ID when deploying
