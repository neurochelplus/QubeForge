import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

export const IRON_AXE: ToolDefinition = {
  id: "iron_axe",
  numericId: 33, // BLOCK.IRON_AXE
  name: "Iron Axe",
  description: "A powerful axe made of iron",
  toolType: ToolType.AXE,
  material: ToolMaterial.IRON,
  durability: 250,
  speedMultiplier: 8.0,
  damage: 5,
  color: "#E0E0E0",
  stackSize: 1,
};
