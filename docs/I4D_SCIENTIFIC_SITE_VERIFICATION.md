# I4D scientific site verification

15 November 2026, Asia/Rangoon. Foundation: I4B `870f282c0b9349b1d36c058970d2220cc4ea5a5e`.

**Verified site research completed; automatic objective-linked terrain routing unavailable pending registration or source evidence.** No site has an independently demonstrated source-to-routing-grid tie and uncertainty budget.

## Review boundary

The exact historical Gale `10f6f795f0a73f01ff151e86e033263359ae94a0` and Jezero `c39b7a32a28efee2dc9a8c7bc8f969b7b0d946d4` reports were read from their branch objects. They are research references. No historical polygon, corridor, centroid or unsupported 5 m registration claim was imported. The user subsequently requested removal of Gale sample Scenario objectives; the three stable IDs are now retired from the active catalog and preserved on reopen. The F3 landing-circle correction remains authoritative. Report hashes are in [reference-reports.json](evidence/i4d/reference-reports.json).

## Evidence and coordinate interpretation

- The [PDS depot location product](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv), its PDS4 label v1.0, and the depot User Guide v1.0 (30 September 2024, section 5.9, printed/PDF p.13) describe rover locations during tube drops. Ten records are accepted with that meaning. Tube endpoints, collection outcrops, and a depot centroid are not inferred. The release notes identify release 1 as 15 October 2024, despite the older archive landing-page date.
- The [PLACES SIS v1.0](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rover_places/document/Mars2020_Rover_PLACES_PDS_SIS.pdf), dated 22 February 2022, sections 4.4 and 5.1.3, printed/PDF pp.29,34-35, documents planetocentric latitude and east-positive longitude. Its projection uses standard parallel 18.4663 degrees. The application consumes geographic coordinates directly and uses its own native grid projection; projected PLACES eastings are never substituted into the zero-standard-parallel routing grid.
- The [Mars 2020 Initial Reports Volume 2 Release 2](https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf) contains Swift Run coordinates at PDF p.14 / report 11-1 and Hazeltop coordinates at PDF p.58 / report 14-1. The numeric fields and outcrop associations are retained, but the exact reference point and latitude convention are unresolved. These records cannot create markers or waypoints. Swift Run has inconsistent running-header/body designations (495-11 versus 490-11); the registry quotes the body field and does not silently reconcile it. Hogwallow Flats is broader context, with no inferred center.
- The committed [LPSC 2618 primary PDF](evidence/f3/three-forks-2618.pdf) was independently read again. Its Results text identifies the published 18.45369687 N, 77.41359752 E as the proposed landing circle. The full published digits are retained in the new site registry; F3 legacy rounded evidence is untouched. The 60 m radius is a design dimension. Neither value is a depot center or positional uncertainty.
- Gale candidates are named drill investigations supported by NASA/JPL or primary mission literature. The inspected overview/photo/campaign sources establish scientific context, without independently reproduced point coordinates for this integration. No camera/rover position, map center, regional rectangle or sampled pixel is substituted. This review does not claim those locations are unknowable; PDS target/frame reconciliation remains necessary.
- Oxia uses the three unchanged F3/I4B NASA Trek interpreted mineral points, including the original two-decimal precision. The nearby hydrous compilation remains supporting context in the untouched objective catalog; independent observations are not asserted. Unknown source version, datum and positional accuracy remain explicit.

## Candidate decisions

There are 22 source-qualified registry entries: five unlocated Gale investigations, fourteen Jezero records (ten located rover depot events, two published but frame-unresolved sample-report locations, one unlocated context, one proposed landing circle), and three preserved Oxia mineral observations. Six entries are unlocated. No record is registered to the routing grids. Actual tube endpoints remain unresolved candidates and are not integrated as tube-coordinate records.

## Gale

### Aberlady drill investigation

- Identity / region / objectives: `gale-aberlady` / gale / `gale-glen-torridon`.
- Source: [Bennett et al., Glen Torridon campaign overview](https://ntrs.nasa.gov/citations/20230001618); version/date: 2022. Feature: unknown; locator: not independently established.
- Original geographic evidence: Documented named sampling investigation. Reviewed context does not reproduce an independently checked point coordinate; rover camera positions and regional map centers are not substituted.
- Original coordinates / precision: null - no defensible point reproduced. No added digits or accuracy inferred.
- Frame/body/datum: latitude convention unresolved; east-positive 0?360 degrees; Mars; datum unknown.
- Transformation: none for an unlocated entry.
- Source verification: context/source inspected; coordinate reproduction unavailable; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: not evaluated: location/frame unresolved. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending location evidence.

### Glen Etive drill investigation

- Identity / region / objectives: `gale-glen-etive` / gale / `gale-glen-torridon`.
- Source: [NASA/JPL Curiosity at Glen Etive](https://science.nasa.gov/photojournal/curiosity-at-glen-etive/); version/date: 2019-10-11 acquisition, sol 2553. Feature: unknown; locator: not independently established.
- Original geographic evidence: Documented named sampling investigation. Reviewed context does not reproduce an independently checked point coordinate; rover camera positions and regional map centers are not substituted.
- Original coordinates / precision: null - no defensible point reproduced. No added digits or accuracy inferred.
- Frame/body/datum: latitude convention unresolved; east-positive 0?360 degrees; Mars; datum unknown.
- Transformation: none for an unlocated entry.
- Source verification: context/source inspected; coordinate reproduction unavailable; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: not evaluated: location/frame unresolved. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending location evidence.

### Highfield drill investigation

- Identity / region / objectives: `gale-highfield` / gale / `gale-vera-rubin-ridge`.
- Source: [NASA/JPL Highfield drill hole](https://science.nasa.gov/photojournal/highfield-drill-hole/); version/date: unknown. Feature: unknown; locator: not independently established.
- Original geographic evidence: Documented named sampling investigation. Reviewed context does not reproduce an independently checked point coordinate; rover camera positions and regional map centers are not substituted.
- Original coordinates / precision: null - no defensible point reproduced. No added digits or accuracy inferred.
- Frame/body/datum: latitude convention unresolved; east-positive 0?360 degrees; Mars; datum unknown.
- Transformation: none for an unlocated entry.
- Source verification: context/source inspected; coordinate reproduction unavailable; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: not evaluated: location/frame unresolved. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending location evidence.

### Canaima drill investigation

- Identity / region / objectives: `gale-canaima` / gale / `gale-sulfate-units`.
- Source: [CheMin decade review](https://www.mdpi.com/2075-163X/14/6/568); version/date: 2024. Feature: unknown; locator: not independently established.
- Original geographic evidence: Documented named sampling investigation. Reviewed context does not reproduce an independently checked point coordinate; rover camera positions and regional map centers are not substituted.
- Original coordinates / precision: null - no defensible point reproduced. No added digits or accuracy inferred.
- Frame/body/datum: latitude convention unresolved; east-positive 0?360 degrees; Mars; datum unknown.
- Transformation: none for an unlocated entry.
- Source verification: context/source inspected; coordinate reproduction unavailable; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: not evaluated: location/frame unresolved. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending location evidence.

### Mammoth Lakes drill investigation

- Identity / region / objectives: `gale-mammoth-lakes` / gale / `gale-gediz-vallis`.
- Source: [NASA/JPL Mammoth Lakes campaign update](https://science.nasa.gov/blog/sols-4234-4235-and-thats-nearly-a-wrap-on-mammoth-lakes/); version/date: unknown. Feature: unknown; locator: not independently established.
- Original geographic evidence: Documented named sampling investigation. Reviewed context does not reproduce an independently checked point coordinate; rover camera positions and regional map centers are not substituted.
- Original coordinates / precision: null - no defensible point reproduced. No added digits or accuracy inferred.
- Frame/body/datum: latitude convention unresolved; east-positive 0?360 degrees; Mars; datum unknown.
- Transformation: none for an unlocated entry.
- Source verification: context/source inspected; coordinate reproduction unavailable; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: not evaluated: location/frame unresolved. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending location evidence.

## Jezero

### Malay tube-drop rover position

- Identity / region / objectives: `jezero-depot-rover-malay` / jezero / `jezero-objective-3`.
- Source: [PDS Three Forks sample_tube_locations](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv); version/date: 1.0; release 2024-10-15. Feature: M2020-00337-08; locator: Sample Designation M2020-00337-08; columns Rover Latitude/Rover Longitude.
- Original geographic evidence: Perseverance rover position during Malay tube drop on sol 653, site 32, drive 148. This is not the tube endpoint, collection outcrop or depot center.
- Original coordinates / precision: 18.45262651 N, 77.40775601 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; Mars PLACES cartographic reference; R=3396190 m, standard parallel 18.4663 degrees; MOLA/Airy-0 origin.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown (numeric transcription is independently reproduced; upstream localization processing is not independently audited).
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: valid native Jezero 25 m cell [433, 100]; computational slope restriction passes. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending source-to-grid registration and uncertainty evidence.

### Mageik tube-drop rover position

- Identity / region / objectives: `jezero-depot-rover-mageik` / jezero / `jezero-objective-3`.
- Source: [PDS Three Forks sample_tube_locations](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv); version/date: 1.0; release 2024-10-15. Feature: M2020-00579-17; locator: Sample Designation M2020-00579-17; columns Rover Latitude/Rover Longitude.
- Original geographic evidence: Perseverance rover position during Mageik tube drop on sol 655, site 32, drive 250. This is not the tube endpoint, collection outcrop or depot center.
- Original coordinates / precision: 18.4525234 N, 77.40784692 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; Mars PLACES cartographic reference; R=3396190 m, standard parallel 18.4663 degrees; MOLA/Airy-0 origin.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown (numeric transcription is independently reproduced; upstream localization processing is not independently audited).
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: valid native Jezero 25 m cell [433, 100]; computational slope restriction passes. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending source-to-grid registration and uncertainty evidence.

### Crosswind Lake tube-drop rover position

- Identity / region / objectives: `jezero-depot-rover-crosswind-lake` / jezero / `jezero-objective-3`.
- Source: [PDS Three Forks sample_tube_locations](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv); version/date: 1.0; release 2024-10-15. Feature: M2020-00639-21; locator: Sample Designation M2020-00639-21; columns Rover Latitude/Rover Longitude.
- Original geographic evidence: Perseverance rover position during Crosswind Lake tube drop on sol 661, site 32, drive 378. This is not the tube endpoint, collection outcrop or depot center.
- Original coordinates / precision: 18.45267034 N, 77.408056 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; Mars PLACES cartographic reference; R=3396190 m, standard parallel 18.4663 degrees; MOLA/Airy-0 origin.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown (numeric transcription is independently reproduced; upstream localization processing is not independently audited).
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: valid native Jezero 25 m cell [433, 100]; computational slope restriction passes. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending source-to-grid registration and uncertainty evidence.

### Roubion tube-drop rover position

- Identity / region / objectives: `jezero-depot-rover-roubion` / jezero / `jezero-objective-3`.
- Source: [PDS Three Forks sample_tube_locations](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv); version/date: 1.0; release 2024-10-15. Feature: M2020-00164-02; locator: Sample Designation M2020-00164-02; columns Rover Latitude/Rover Longitude.
- Original geographic evidence: Perseverance rover position during Roubion tube drop on sol 666, site 32, drive 482. This is not the tube endpoint, collection outcrop or depot center.
- Original coordinates / precision: 18.45276569 N, 77.40807823 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; Mars PLACES cartographic reference; R=3396190 m, standard parallel 18.4663 degrees; MOLA/Airy-0 origin.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown (numeric transcription is independently reproduced; upstream localization processing is not independently audited).
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: valid native Jezero 25 m cell [433, 100]; computational slope restriction passes. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending source-to-grid registration and uncertainty evidence.

### Coulettes tube-drop rover position

- Identity / region / objectives: `jezero-depot-rover-coulettes` / jezero / `jezero-objective-3`.
- Source: [PDS Three Forks sample_tube_locations](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv); version/date: 1.0; release 2024-10-15. Feature: M2020-00271-06; locator: Sample Designation M2020-00271-06; columns Rover Latitude/Rover Longitude.
- Original geographic evidence: Perseverance rover position during Coulettes tube drop on sol 668, site 32, drive 580. This is not the tube endpoint, collection outcrop or depot center.
- Original coordinates / precision: 18.45272365 N, 77.4082 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; Mars PLACES cartographic reference; R=3396190 m, standard parallel 18.4663 degrees; MOLA/Airy-0 origin.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown (numeric transcription is independently reproduced; upstream localization processing is not independently audited).
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: valid native Jezero 25 m cell [434, 100]; computational slope restriction passes. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending source-to-grid registration and uncertainty evidence.

### Montdenier tube-drop rover position

- Identity / region / objectives: `jezero-depot-rover-montdenier` / jezero / `jezero-objective-3`.
- Source: [PDS Three Forks sample_tube_locations](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv); version/date: 1.0; release 2024-10-15. Feature: M2020-00190-03; locator: Sample Designation M2020-00190-03; columns Rover Latitude/Rover Longitude.
- Original geographic evidence: Perseverance rover position during Montdenier tube drop on sol 672, site 32, drive 672. This is not the tube endpoint, collection outcrop or depot center.
- Original coordinates / precision: 18.45281322 N, 77.40824352 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; Mars PLACES cartographic reference; R=3396190 m, standard parallel 18.4663 degrees; MOLA/Airy-0 origin.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown (numeric transcription is independently reproduced; upstream localization processing is not independently audited).
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: valid native Jezero 25 m cell [434, 100]; computational slope restriction passes. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending source-to-grid registration and uncertainty evidence.

### Bearwallow tube-drop rover position

- Identity / region / objectives: `jezero-depot-rover-bearwallow` / jezero / `jezero-objective-3`.
- Source: [PDS Three Forks sample_tube_locations](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv); version/date: 1.0; release 2024-10-15. Feature: M2020-00516-15; locator: Sample Designation M2020-00516-15; columns Rover Latitude/Rover Longitude.
- Original geographic evidence: Perseverance rover position during Bearwallow tube drop on sol 675, site 32, drive 774. This is not the tube endpoint, collection outcrop or depot center.
- Original coordinates / precision: 18.45272753 N, 77.40833585 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; Mars PLACES cartographic reference; R=3396190 m, standard parallel 18.4663 degrees; MOLA/Airy-0 origin.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown (numeric transcription is independently reproduced; upstream localization processing is not independently audited).
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: valid native Jezero 25 m cell [434, 100]; computational slope restriction passes. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending source-to-grid registration and uncertainty evidence.

### Skyland tube-drop rover position

- Identity / region / objectives: `jezero-depot-rover-skyland` / jezero / `jezero-objective-3`.
- Source: [PDS Three Forks sample_tube_locations](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv); version/date: 1.0; release 2024-10-15. Feature: M2020-00495-12; locator: Sample Designation M2020-00495-12; columns Rover Latitude/Rover Longitude.
- Original geographic evidence: Perseverance rover position during Skyland tube drop on sol 680, site 32, drive 896. This is not the tube endpoint, collection outcrop or depot center.
- Original coordinates / precision: 18.45300487 N, 77.4085047 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; Mars PLACES cartographic reference; R=3396190 m, standard parallel 18.4663 degrees; MOLA/Airy-0 origin.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown (numeric transcription is independently reproduced; upstream localization processing is not independently audited).
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: valid native Jezero 25 m cell [434, 99]; computational slope restriction passes. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending source-to-grid registration and uncertainty evidence.

### Atsah tube-drop rover position

- Identity / region / objectives: `jezero-depot-rover-atsah` / jezero / `jezero-objective-3`.
- Source: [PDS Three Forks sample_tube_locations](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv); version/date: 1.0; release 2024-10-15. Feature: M2020-00374-10; locator: Sample Designation M2020-00374-10; columns Rover Latitude/Rover Longitude.
- Original geographic evidence: Perseverance rover position during Atsah tube drop on sol 682, site 32, drive 1038. This is not the tube endpoint, collection outcrop or depot center.
- Original coordinates / precision: 18.45306554 N, 77.40860064 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; Mars PLACES cartographic reference; R=3396190 m, standard parallel 18.4663 degrees; MOLA/Airy-0 origin.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown (numeric transcription is independently reproduced; upstream localization processing is not independently audited).
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: valid native Jezero 25 m cell [435, 99]; computational slope restriction passes. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending source-to-grid registration and uncertainty evidence.

### Amalik Witness tube-drop rover position

- Identity / region / objectives: `jezero-depot-rover-amalik-witness` / jezero / `jezero-objective-3`.
- Source: [PDS Three Forks sample_tube_locations](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv); version/date: 1.0; release 2024-10-15. Feature: M2020-00586-18; locator: Sample Designation M2020-00586-18; columns Rover Latitude/Rover Longitude.
- Original geographic evidence: Perseverance rover position during Amalik Witness tube drop on sol 690, site 32, drive 1184. This is not the tube endpoint, collection outcrop or depot center.
- Original coordinates / precision: 18.45337179 N, 77.40844668 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; Mars PLACES cartographic reference; R=3396190 m, standard parallel 18.4663 degrees; MOLA/Airy-0 origin.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown (numeric transcription is independently reproduced; upstream localization processing is not independently audited).
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: valid native Jezero 25 m cell [434, 98]; computational slope restriction passes. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending source-to-grid registration and uncertainty evidence.

### Skinner Ridge / Swift Run investigation

- Identity / region / objectives: `jezero-skinner-ridge` / jezero / `jezero-objective-1`, `jezero-objective-2`, `jezero-objective-4`.
- Source: [Mars 2020 Initial Reports, Volume 2, Release 2](https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf#page=14); version/date: 2023-02-15 volume; individual report 2022-08-29. Feature: M2020-490-11; locator: PDF p.14; report 11-1.
- Original geographic evidence: Published sample-report investigation location; exact reference point and latitude convention are not independently reconciled. Do not interpret as a surveyed drill-hole endpoint.
- Original coordinates / precision: 18.458931 N, 77.40617078 E. No added digits or accuracy inferred.
- Frame/body/datum: latitude convention unresolved; east-positive 0?360 degrees; Mars; datum unknown.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: not evaluated: location/frame unresolved. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending frame/reference-point reconciliation and registration.

### Wildcat Ridge / Hazeltop investigation

- Identity / region / objectives: `jezero-wildcat-ridge` / jezero / `jezero-objective-1`, `jezero-objective-2`, `jezero-objective-4`.
- Source: [Mars 2020 Initial Reports, Volume 2, Release 2](https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf#page=58); version/date: 2023-02-15 volume; individual report 2022-09-21. Feature: M2020-509-14; locator: PDF p.58; report 14-1.
- Original geographic evidence: Published sample-report investigation location; exact reference point and latitude convention are not independently reconciled. Do not interpret as a surveyed drill-hole endpoint.
- Original coordinates / precision: 18.45863707 N, 77.40588851 E. No added digits or accuracy inferred.
- Frame/body/datum: latitude convention unresolved; east-positive 0?360 degrees; Mars; datum unknown.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: not evaluated: location/frame unresolved. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending frame/reference-point reconciliation and registration.

### Hogwallow Flats context

- Identity / region / objectives: `jezero-hogwallow-flats` / jezero / `jezero-objective-1`, `jezero-objective-2`, `jezero-objective-4`.
- Source: [Hazeltop Initial Report](https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf#page=59); version/date: 2022-09-21. Feature: unknown; locator: PDF p.59; report 14-2.
- Original geographic evidence: Named stratigraphic context in the Hazeltop report; no single point is inferred for the broader exposure.
- Original coordinates / precision: null - no defensible point reproduced. No added digits or accuracy inferred.
- Frame/body/datum: latitude convention unresolved; east-positive 0?360 degrees; Mars; datum unknown.
- Transformation: none for an unlocated entry.
- Source verification: context/source inspected; coordinate reproduction unavailable; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: not evaluated: location/frame unresolved. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending location evidence.

### Three Forks proposed landing-circle center (not the tube depot)

- Identity / region / objectives: `jezero-three-forks-landing-circle` / jezero / `jezero-objective-3`.
- Source: [Williams et al., LPSC 2023 abstract 2618](https://www.hou.usra.edu/meetings/lpsc2023/pdf/2618.pdf); version/date: 2023. Feature: landing-circle center; locator: Proposed landing site; F3 primary-source correction retained.
- Original geographic evidence: Proposed 60 m radius landing-circle design center. The design radius is not positional uncertainty.
- Original coordinates / precision: 18.45369687 N, 77.41359752 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; Controlled HiRISE mapping / MOLA vertical reference; independent DEM tie unverified.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: valid native Jezero 25 m cell [447, 97]; computational slope restriction passes. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: integrated as qualified science context; automatic terrain waypoint rejected pending source-to-grid registration and uncertainty evidence.

## Oxia

### Clay-rich bedrock detection

- Identity / region / objectives: `oxia-mineral-1` / oxia / `oxia-objective-1`.
- Source: [NASA Trek Aqueous Mineral Distribution compilation](https://trek.nasa.gov/mars/trekarcgis/rest/services/Aquieous_Mineral_Distribution_Options_clon0/MapServer/0); version/date: unknown. Feature: unknown; locator: F3 preserved source query and original catalog.
- Original geographic evidence: Original interpreted NASA Trek orbital mineral detection; rounded location is not a surveyed outcrop.
- Original coordinates / precision: 18.22 N, 335.83 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; datum unknown.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: unavailable: Oxia has no routing DEM. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: preserved interpreted geometric stop only; terrain routing unavailable.

### Hydrated silica detection

- Identity / region / objectives: `oxia-mineral-2` / oxia / `oxia-objective-2`.
- Source: [NASA Trek Aqueous Mineral Distribution compilation](https://trek.nasa.gov/mars/trekarcgis/rest/services/Aquieous_Mineral_Distribution_Options_clon0/MapServer/0); version/date: unknown. Feature: unknown; locator: F3 preserved source query and original catalog.
- Original geographic evidence: Original interpreted NASA Trek orbital mineral detection; rounded location is not a surveyed outcrop.
- Original coordinates / precision: 17.84 N, 336.33 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; datum unknown.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: unavailable: Oxia has no routing DEM. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: preserved interpreted geometric stop only; terrain routing unavailable.

### Second clay detection

- Identity / region / objectives: `oxia-mineral-3` / oxia / `oxia-objective-3`.
- Source: [NASA Trek Aqueous Mineral Distribution compilation](https://trek.nasa.gov/mars/trekarcgis/rest/services/Aquieous_Mineral_Distribution_Options_clon0/MapServer/0); version/date: unknown. Feature: unknown; locator: F3 preserved source query and original catalog.
- Original geographic evidence: Original interpreted NASA Trek orbital mineral detection; rounded location is not a surveyed outcrop.
- Original coordinates / precision: 18.22 N, 336.11 E. No added digits or accuracy inferred.
- Frame/body/datum: planetocentric; east-positive 0?360 degrees; Mars; datum unknown.
- Transformation: numeric geographic values retained; longitude display wraps only when needed; no latitude conversion or datum shift asserted.
- Source verification: context/source inspected; coordinate reproduction verified as published numeric fields; processing verification unknown.
- Independent registration: unverified. Quantified positional uncertainty: null. Operational safety: unverified.
- DEM coverage: unavailable: Oxia has no routing DEM. Actual route snapping and path metrics: null; no site-linked numerical path is claimed.
- Eligibility / decision: preserved interpreted geometric stop only; terrain routing unavailable.

## Independent checks and remaining work

[site-routing-acceptance.json](evidence/i4d/site-routing-acceptance.json) records every site, published coordinates, source fields, verification flags, native coverage, computational cell restriction, eligibility and null route results. `python scripts/verify-i4d-sites.py` reproduces all ten CSV coordinates and checks the committed Jezero grid without importing either routing engine. Its cell-center displacement is clearly distinguished from requested-to-snapped route displacement. None grants scientific access.

The 44 new TypeScript cases cover source reproduction, coordinate transforms, frame handling, missing evidence, numeric bounds, objective associations, changed/retired identities, duplicate selection, every site server rejection, legacy missions, raw source snapshots, interpreted classification and export. Production HTTP rejection and UI/persistence acceptance supplement these checks. Genuine manual routes remain separately tested by the existing I4A/I4B suites.

To enable a registered research site, obtain independently reproducible source-to-grid control/tie evidence for the selected dataset and a defensible uncertainty budget. Reconcile the exact physical reference point and native frames. Then rerun actual coverage, nodata, slope/corner, bounded snapping, path connectivity, ordered endpoints, return search, stale-result rejection and resource/export tests. Even a passing numerical path and positive conditional EVA margin do not establish astronaut trafficability or operational clearance.

Primary local source hashes, sizes and small original tables/labels are in [source-files.json](evidence/i4d/source-files.json). The full 34.8 MB sample-report volume is retained locally under ignored `output/i4d-sources/`; reproducible URL/hash and narrow coordinate excerpts are delivered. No source ID or page locator was invented.
