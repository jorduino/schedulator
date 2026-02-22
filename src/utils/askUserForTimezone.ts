import cityTimezones from "city-timezones";

const cities: Map<string, string> = new Map();

async function ask(question: string): Promise<string> {
	const answer = prompt(question);
	if (answer === null) {
		console.log("\nExiting without making any changes.");
		process.exit(0);
	}
	return answer;
}

export default async function askUserForTimezone(cityName: string): Promise<string | undefined> {
	if (cities.has(cityName)) return cities.get(cityName);

	const found = cityTimezones.findFromCityStateProvince(cityName);

	if (found.length === 1 && found[0]?.timezone) {
		const output = found[0].timezone;
		cities.set(cityName, output);
		return output;
	}

	if (found.length === 0) {
		const output = await ask(
			`Couldn't find a timezone for "${cityName}", enter one to use (IANA format, e.g. America/New_York): `,
		);
		cities.set(cityName, output);
		return output;
	}

	console.log(`Found multiple timezone options for "${cityName}":`);
	found.forEach((c, i) => {
		console.log(
			`  ${i + 1}. ${c.city}${c.province ? `, ${c.province}` : ""} (${c.country}) — ${c.timezone}`,
		);
	});
	console.log(`  ${found.length + 1}. Enter my own`);

	const raw = await ask(`Enter the number of your choice (1-${found.length + 1}): `);
	const choice = parseInt(raw, 10);

	if (Number.isNaN(choice) || choice < 1 || choice > found.length + 1) {
		console.error("Invalid choice.");
		process.exit(1);
	}

	if (choice === found.length + 1) {
		const output = await ask("Enter timezone (IANA format, e.g. America/New_York): ");
		cities.set(cityName, output);
		return output;
	}

	const output = found[choice - 1]?.timezone;
	if (output) {
		cities.set(cityName, output);
		return output;
	}
}
