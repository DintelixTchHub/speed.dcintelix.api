import test from "node:test";
import assert from "node:assert/strict";

import {
	hashIpAddress,
	normalizeBrowser,
	normalizeNetworkType,
	sanitizeLocation,
	roundCoordinate,
} from "./analytics.js";

test("hashIpAddress creates a stable fingerprint", () => {
	const first = hashIpAddress("203.0.113.10");
	const second = hashIpAddress("203.0.113.10");
	assert.ok(first);
	assert.equal(first, second);
	assert.match(first, /^[a-f0-9]{64}$/);
});

test("sanitizeLocation rounds coordinates and trims empty values", () => {
	const result = sanitizeLocation({
		country: " Rwanda ",
		province: "Kigali",
		district: "Gasabo",
		city: "Kigali",
		latitude: -1.949095,
		longitude: 30.05885,
	});

	assert.equal(result.country, "Rwanda");
	assert.equal(result.province, "Kigali");
	assert.equal(result.city, "Kigali");
	assert.equal(result.latitude, roundCoordinate(-1.949095));
	assert.equal(result.longitude, roundCoordinate(30.05885));
});

test("normalizeBrowser standardizes common browser labels", () => {
	assert.equal(normalizeBrowser("Chrome 127.0.0.0"), "Chrome");
	assert.equal(normalizeBrowser("Safari"), "Safari");
});

test("normalizeNetworkType preserves known types and omits unavailable values", () => {
	assert.equal(normalizeNetworkType("wifi"), "Wi-Fi");
	assert.equal(normalizeNetworkType("3g"), "3G");
	assert.equal(normalizeNetworkType("unknown"), null);
	assert.equal(normalizeNetworkType(null), null);
});