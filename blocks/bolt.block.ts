import { defineBlock } from "lineadraw";

export default defineBlock({
  id: "@lineadraw/bolt",
  name: "Bolt",
  description: "Draws a bolt with a hexagonal head and a cylindrical body.",
  version: "1.0.0",
  authors: ["Linea Team"],
  tags: ["structural", "steel", "fastener", "building"],
  draw: () => {
    return [];
  },
});
