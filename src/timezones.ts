import type { PathLike } from "node:fs";
import * as fs from "node:fs/promises";
import cityTimezones from "city-timezones";

type TZCache = Map<string, string>;

export default class Timezones {
	cache: TZCache;
	extCachePath?: PathLike;

	constructor(extCachePath?: PathLike);
	constructor(extCachePath: PathLike | undefined, cache: Map<unknown, unknown>);

	constructor(extCachePath?: PathLike | undefined, cache?: Map<unknown, unknown>) {
		this.extCachePath = extCachePath;
		if (cache) {
			if (!Timezones.isCacheValid(cache)) {
				throw new Error("Tried to initialize Timezone with bad cache");
			}
			this.cache = new Map([...(cache as TZCache)]);
		} else {
			this.cache = new Map([]);
		}
	}

	async askUserForTimezone(cityName: string): Promise<string> {
		const cached = this.cache.get(cityName);
		if (cached !== undefined) return cached;

		const found = cityTimezones.findFromCityStateProvince(cityName);

		if (found.length === 1 && found[0]?.timezone) {
			return this.remember(cityName, found[0].timezone);
		}

		if (found.length === 0) {
			const tz = await ask(
				`Couldn't find a timezone for "${cityName}", enter one to use (IANA format, e.g. America/New_York): `,
			);
			return this.remember(cityName, tz);
		}

		console.write(`Found multiple timezone options for "${cityName}":\n`);
		found.forEach((c, i) => {
			console.write(
				`  ${i + 1}. ${c.city}${c.province ? `, ${c.province}` : ""} (${c.country}) — ${c.timezone}\n`,
			);
		});
		console.write(`  ${found.length + 1}. Enter my own\n`);

		const raw = await ask(`Enter the number of your choice (1-${found.length + 1}): `);
		const choice = parseInt(raw, 10);

		if (Number.isNaN(choice) || choice < 1 || choice > found.length + 1) {
			console.error("Invalid choice.");
			process.exit(1);
		}

		if (choice === found.length + 1) {
			const tz = await ask("Enter timezone (IANA format, e.g. America/New_York): ");
			return this.remember(cityName, tz);
		}

		const tz = found[choice - 1]?.timezone;
		if (!tz) {
			console.error("Unexpected error: selected entry has no timezone.");
			process.exit(1);
		}
		return this.remember(cityName, tz);
	}

	public remember(cityName: string, timezone: string): string {
		this.cache.set(cityName, timezone);
		return timezone;
	}

	public static isCacheValid(cache: Map<unknown, unknown>): boolean {
		if (!(cache instanceof Map)) {
			return false;
		}
		// cache.forEach((value, key)
		for (const [key, value] of cache) {
			if (typeof value !== "string" || typeof key !== "string") {
				return false;
			}
		}
		return true;
	}

	public async writeCache(): Promise<void> {
		if (!this.extCachePath) {
			throw new Error("Tried to save Timezone cache with no external save path");
		} else {
			try {
				// not sure if we should read before write, could read bad data or could overwrite data
				// probably want to allow user to decide whether to read before to allow option of overwrite
				// await this.readCache();
				await fs.writeFile(this.extCachePath, JSON.stringify([...this.cache]));
			} catch (e) {
				throw new Error(`Error writing cache:\n${e}`);
			}
		}
	}

	public async readCache(): Promise<void> {
		if (!this.extCachePath) {
			throw new Error("Tried to read Timezone cache with no external save path");
		} else {
			try {
				const cacheData = JSON.parse(
					await fs.readFile(this.extCachePath, { encoding: "utf-8" }),
				);
				const tempMap = new Map([...cacheData]);
				if (!Timezones.isCacheValid(tempMap)) {
					throw new Error("Tried to read invalid cache");
				}
				this.cache = new Map([...this.cache, ...(tempMap as TZCache)]);
			} catch (e) {
				throw new Error(`Error reading cache:\n${e}`);
			}
		}
	}
	public async clearCache(): Promise<void> {
		this.cache = new Map([]);
		await this.writeCache();
	}
	public toJSON() {
		return {
			extCachePath: this.extCachePath !== undefined ? String(this.extCachePath) : undefined,
			cache: [...this.cache], // Map → [["city", "tz"], ...]
		};
	}
}

async function ask(question: string): Promise<string> {
	const answer = prompt(question);
	if (answer === null) {
		console.write("\nExiting without making any changes.\n");
		process.exit(0);
	}
	return answer;
}
