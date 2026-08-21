import { afterEach } from "vitest"
import { installMemoryIndexedDbForTests, resetMemoryIndexedDbForTests } from "@/lib/driver-durable-kv"

installMemoryIndexedDbForTests()

afterEach(() => {
  resetMemoryIndexedDbForTests()
})
