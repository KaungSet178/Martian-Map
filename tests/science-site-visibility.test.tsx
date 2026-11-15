import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  scienceSites,
  siteFrameCompatible,
  sitePolicy,
  objectiveSiteSummary,
} from "../lib/science/sites";
import { regions } from "../lib/regions/registry";
import { TargetCatalog, TargetDetails } from "../components/science/catalog";
import { ScienceSites } from "../components/science/sites";

test("objectiveSiteSummary correctly classifies Jezero sample caching objective", () => {
  const summary = objectiveSiteSummary("jezero", "jezero-objective-3", false);
  assert.equal(summary.siteCount, 11);
  assert.equal(summary.siteCountLabel, "11 associated sites");
  assert.equal(summary.sourceCoordinatesVerified, true);
  assert.equal(summary.frameCompatibleCount, 11);
  assert.equal(summary.unresolvedFrameCount, 0);
  assert.equal(summary.unlocatedCount, 0);
  assert.match(summary.sourceLocationLabel, /Source coordinates verified/);
  assert.match(summary.registrationStatus, /Registration unverified/);
  assert.match(summary.detailedSummary, /11 qualified discrete sites tracked with verified source coordinates/);
  assert.match(summary.detailedSummary, /automatic terrain routing is unavailable/);
});

test("objectiveSiteSummary correctly preserves Jezero frame-unresolved objectives", () => {
  for (const objId of ["jezero-objective-1", "jezero-objective-2", "jezero-objective-4"]) {
    const summary = objectiveSiteSummary("jezero", objId, false);
    assert.equal(summary.siteCount, 3);
    assert.equal(summary.siteCountLabel, "3 associated sites");
    assert.equal(summary.sourceCoordinatesVerified, false);
    assert.equal(summary.frameCompatibleCount, 0);
    assert.equal(summary.unresolvedFrameCount, 2);
    assert.equal(summary.unlocatedCount, 1);
    assert.equal(summary.sourceLocationLabel, "Coordinate frame unresolved");
    assert.equal(summary.registrationStatus, "Registration unverified");
    assert.match(summary.detailedSummary, /unresolved latitude frame\/datum/);
  }
});

test("objectiveSiteSummary correctly handles Jezero objective with no associated sites", () => {
  const summary = objectiveSiteSummary("jezero", "jezero-objective-5", false);
  assert.equal(summary.siteCount, 0);
  assert.equal(summary.siteCountLabel, "No associated sites");
  assert.equal(summary.sourceCoordinatesVerified, false);
  assert.equal(summary.sourceLocationLabel, "Location unverified");
  assert.equal(summary.registrationStatus, "Registration unverified");
  assert.match(summary.detailedSummary, /No independently supported discrete site is associated/);
});

test("objectiveSiteSummary correctly preserves Gale unlocated drill investigations", () => {
  const glenSummary = objectiveSiteSummary("gale", "gale-glen-torridon", false);
  assert.equal(glenSummary.siteCount, 2);
  assert.equal(glenSummary.siteCountLabel, "2 associated sites");
  assert.equal(glenSummary.sourceCoordinatesVerified, false);
  assert.equal(glenSummary.unlocatedCount, 2);
  assert.equal(glenSummary.sourceLocationLabel, "Location unverified (unlocated context)");
  assert.equal(glenSummary.registrationStatus, "Registration unverified");
  assert.match(glenSummary.detailedSummary, /verified point coordinates remain unlocated/);

  for (const objId of ["gale-vera-rubin-ridge", "gale-sulfate-units", "gale-gediz-vallis"]) {
    const summary = objectiveSiteSummary("gale", objId, false);
    assert.equal(summary.siteCount, 1);
    assert.equal(summary.siteCountLabel, "1 associated site");
    assert.equal(summary.sourceCoordinatesVerified, false);
    assert.equal(summary.unlocatedCount, 1);
    assert.equal(summary.sourceLocationLabel, "Location unverified (unlocated context)");
  }
});

test("objectiveSiteSummary preserves Oxia geometric-only planning with verified source points", () => {
  for (const objId of ["oxia-objective-1", "oxia-objective-2", "oxia-objective-3", "oxia-objective-4"]) {
    const summary = objectiveSiteSummary("oxia", objId, true);
    assert.equal(summary.siteCount, 1);
    assert.equal(summary.siteCountLabel, "1 associated site");
    assert.equal(summary.sourceCoordinatesVerified, true);
    assert.equal(summary.frameCompatibleCount, 1);
    assert.equal(summary.sourceLocationLabel, "Source coordinates verified");
    assert.equal(summary.registrationStatus, "Geometric planning only");
    assert.equal(summary.registrationBadge, "Geometric only");
  }
});

test("TargetCatalog cards render associated site counts and meaningful location statuses", () => {
  const jezeroHtml = renderToStaticMarkup(
    <TargetCatalog
      region={regions.jezero}
      selected={null}
      stops={[]}
      onInspect={() => {}}
      onToggle={() => {}}
    />,
  );

  // Jezero objective 3 card displays 11 associated sites and verified source coordinates
  assert.ok(jezeroHtml.includes("11 associated sites"), "Jezero catalog displays 11 associated sites");
  assert.ok(jezeroHtml.includes("Source coordinates verified (11 sites)"), "Jezero catalog displays source coordinates verified");
  assert.ok(jezeroHtml.includes("Registration unverified"), "Jezero catalog clearly displays registration unverified");

  // Jezero objective 1 card displays 3 associated sites and frame unresolved
  assert.ok(jezeroHtml.includes("3 associated sites"), "Jezero catalog displays 3 associated sites");
  assert.ok(jezeroHtml.includes("Coordinate frame unresolved"), "Jezero catalog displays coordinate frame unresolved");

  // Jezero objective 5 card displays no associated sites
  assert.ok(jezeroHtml.includes("No associated sites"), "Jezero catalog displays no associated sites");

  // Gale catalog displays unlocated context and unverified location
  const galeHtml = renderToStaticMarkup(
    <TargetCatalog
      region={regions.gale}
      selected={null}
      stops={[]}
      onInspect={() => {}}
      onToggle={() => {}}
    />,
  );
  assert.ok(galeHtml.includes("2 associated sites"), "Gale catalog displays 2 associated sites for Glen Torridon");
  assert.ok(galeHtml.includes("Location unverified (unlocated context)"), "Gale catalog displays unlocated context");
  assert.ok(galeHtml.includes("Registration unverified"), "Gale catalog displays registration unverified");
});

test("TargetDetails renders site count badges, source badges, and registration badges", () => {
  const target3 = regions.jezero.targets.find(t => t.id === "jezero-objective-3")!;
  const html3 = renderToStaticMarkup(
    <TargetDetails
      target={target3}
      region={regions.jezero}
      added={false}
      onToggle={() => {}}
    />,
  );
  assert.ok(html3.includes("Location unverified"), "Preserves broad objective unverified location");
  assert.ok(html3.includes("11 associated sites"), "Includes 11 associated sites badge");
  assert.ok(html3.includes("Source coordinates verified"), "Includes source coordinates verified badge");
  assert.ok(html3.includes("Registration unverified"), "Includes registration unverified badge");

  // Gale Glen Torridon retains Location unverified for browser test compatibility
  const glenTarget = regions.gale.targets.find(t => t.id === "gale-glen-torridon")!;
  const glenHtml = renderToStaticMarkup(
    <TargetDetails
      target={glenTarget}
      region={regions.gale}
      added={false}
      onToggle={() => {}}
    />,
  );
  assert.ok(glenHtml.includes("Location unverified"), "Gale dialog contains Location unverified");
  assert.ok(glenHtml.includes("2 associated sites"), "Gale dialog displays 2 associated sites");
  assert.ok(glenHtml.includes("Unlocated context"), "Gale dialog displays unlocated context badge");
});

test("ScienceSites displays verified source coordinates directly in summary headers", () => {
  const target3 = regions.jezero.targets.find(t => t.id === "jezero-objective-3")!;
  const html = renderToStaticMarkup(
    <ScienceSites
      target={target3}
      region={regions.jezero}
      selections={[]}
    />,
  );

  // Checks coordinates appear directly in the summary
  assert.ok(html.includes("18.45262651"), "Malay latitude displayed in summary");
  assert.ok(html.includes("77.40775601"), "Malay longitude displayed in summary");
  assert.ok(html.includes("18.45369687"), "Landing circle latitude displayed in summary");
  assert.ok(html.includes("77.41359752"), "Landing circle longitude displayed in summary");
  assert.ok(html.includes("science-sites-summary"), "Displays science sites overview section");

  // Gale displays Unlocated in summary
  const glenTarget = regions.gale.targets.find(t => t.id === "gale-glen-torridon")!;
  const glenHtml = renderToStaticMarkup(
    <ScienceSites
      target={glenTarget}
      region={regions.gale}
      selections={[]}
    />,
  );
  assert.ok(glenHtml.includes("Unlocated"), "Gale sites show Unlocated in summary");
  assert.ok(glenHtml.includes("Aberlady drill investigation"), "Aberlady title present");
});

test("coordinate-frame rules maintain separation between source coordinates and registration", () => {
  for (const site of scienceSites) {
    const policy = sitePolicy(site);
    if (site.region === "jezero" && site.source_coordinate_verified && site.coordinates) {
      if (site.coordinate_frame.latitude_type === "planetocentric") {
        assert.equal(siteFrameCompatible(site), true);
        assert.equal(policy.state, "Source-located, registration unverified");
      } else {
        assert.equal(siteFrameCompatible(site), false);
        assert.equal(policy.state, "Unavailable: coordinate frame unresolved");
      }
    }
    // All Gale and Jezero sites remain not terrain eligible
    if (site.region !== "oxia") {
      assert.equal(policy.terrainEligible, false);
      assert.equal(policy.geometricOnly, false);
    } else {
      assert.equal(policy.terrainEligible, false);
      assert.equal(policy.geometricOnly, true);
    }
  }
});
