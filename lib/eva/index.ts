/**
 * Marswalk Unified EVA Resource Planning System.
 *
 * Core public API providing route-based life-support resource estimation
 * (Oxygen, Battery, Cooling Water, EVA Duration) across Gale Crater, Jezero Crater,
 * and Oxia Planum under verified NASA reference engineering models.
 *
 * @module lib/eva
 */

export * from "./types";
export * from "./sources";
export * from "./profiles";
export * from "./timeline";
export * from "./oxygen";
export * from "./battery";
export * from "./cooling";
export * from "./estimate";
export * from "./validation";
export * from "./adapters";
