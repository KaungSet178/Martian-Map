import { regionSchema } from "@/lib/contracts/region";
import { config } from "./config";
import { targets } from "./targets";
import { layers } from "./layers";

export const gale = regionSchema.parse({ ...config, targets, layers });
