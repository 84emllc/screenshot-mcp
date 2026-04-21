// Copyright (c) 2026 84EM LLC (https://84em.io). MIT License.

import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
		testTimeout: 20000,
	},
});
