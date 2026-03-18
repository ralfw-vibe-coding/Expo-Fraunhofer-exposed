import { MemoryEventStore } from "@ricofritzsche/eventstore";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CreateExpoProcessor, type CreateExpoCommand } from "../slices/create-expo/createExpoProcessor";

async function main(): Promise<void> {
  const [configPathArg, eventsFileArg] = process.argv.slice(2);

  if (!configPathArg) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const repoRoot = process.cwd();
  const configPath = path.resolve(repoRoot, configPathArg);
  const eventsFile = path.resolve(repoRoot, eventsFileArg ?? "events.json");
  const configFileContent = await readFile(configPath, "utf8");
  const command = JSON.parse(configFileContent) as CreateExpoCommand;

  const eventStore = await MemoryEventStore.createFromFile(eventsFile, true, true);
  const processor = new CreateExpoProcessor(eventStore);
  const response = await processor.process(command);

  process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);

  if (!response.status) {
    process.exitCode = 1;
    return;
  }

  const result = await eventStore.query();
  const latestExpoEvent = result.events[result.events.length - 1];

  process.stdout.write("Latest expo version:\n");
  process.stdout.write(`${JSON.stringify(latestExpoEvent, null, 2)}\n`);
  process.stdout.write(`Events stored in ${eventsFile}\n`);
}

function printUsage(): void {
  process.stderr.write(
    "Usage: create-expo.sh <create-expo.json> [events.json]\n",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
