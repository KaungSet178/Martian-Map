"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderOpen,
  Save,
  PanelLeftClose,
  Download,
  Upload,
  Globe2,
  CircleHelp,
} from "lucide-react";
import { regionIdSchema, type RegionId, type MarsGeographicCoordinates } from "@/lib/contracts/region";
import { regions, regionIds } from "@/lib/regions/registry";
import {
  updateLayerState,
  type LayerStates,
  type LayerState,
} from "@/lib/map/region-layers";
import {
  newMission,
  parseMission,
  readMissions,
  saveMission,
  missionSchema,
  type Mission,
} from "@/lib/mission/model";
import {
  Badge,
  Dialog,
  Notice,
  downloadFile,
} from "@/components/ui/primitives";
import { TargetCatalog, TargetDetails } from "@/components/science/catalog";
import { EvidenceDetails, LayerManager } from "@/components/science/evidence";
import { MissionEditor } from "@/components/mission/editor";
import { RouteComparison } from "@/components/mission/analysis";
import { MissionBrief } from "@/components/mission/brief";
import { WaypointEditor } from "@/components/mission/waypoint-editor";
import {
  initWaypointPlanFromMission,
  syncMissionWithWaypointPlan,
  syncWaypointPlanWithMission,
} from "@/lib/mission/waypoint-bridge";
import {
  addWaypoint,
  createWaypoint,
  type MarsWaypoint,
  type WaypointRole,
  moveWaypoint,
  removeWaypoint,
  updateWaypoint,
  setOrigin,
  setDestination,
  setTrajectoryMode,
} from "@/lib/mission/waypoint-planning";

const MapWorkspace = dynamic(() => import("@/components/map/map-workspace"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      Loading map renderer…
    </div>
  ),
});
type Panel = "science" | "plan" | "compare" | "layers" | "evidence";
type Modal = "sites" | "saved" | "brief" | "target" | null;
const subscribeOnline = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};
const onlineSnapshot = () => navigator.onLine;

export function Planner() {
  const [regionId, setRegionId] = useState<RegionId>("jezero");
  const [mission, setMission] = useState<Mission>(() =>
    newMission(regions.jezero),
  );
  const drafts = useRef<Partial<Record<RegionId, Mission>>>({});
  const [panel, setPanel] = useState<Panel>("science");
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [contours, setContours] = useState(true);
  const [markers, setMarkers] = useState(true);
  const [opacity, setOpacity] = useState(70);
  const [layerStates, setLayerStates] = useState<LayerStates>({});
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [saved, setSaved] = useState<Mission[]>([]);
  const [dirty, setDirty] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("");
  const online = useSyncExternalStore(
    subscribeOnline,
    onlineSnapshot,
    () => true,
  );
  const region = regions[regionId];
  const target = region.targets.find((t) => t.id === selected);
  const stale = mission.dataset_version !== region.dataset_version;

  const [planSubView, setPlanSubView] = useState<"objectives" | "waypoints">("objectives");
  const [editingWaypointId, setEditingWaypointId] = useState<string | null>(null);
  const [isPlacingOnMap, setIsPlacingOnMap] = useState(false);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);

  const activePlan = useMemo(
    () => initWaypointPlanFromMission(mission, region),
    [mission, region],
  );

  const updateMission = useCallback(
    (change: Partial<Mission>) => {
      setMission((m) => {
        const nextMission: Mission = { ...m, ...change };
        if (!change.waypoint_plan) {
          nextMission.waypoint_plan = syncWaypointPlanWithMission(nextMission, region);
        }
        return nextMission;
      });
      setDirty(true);
      setMessage(
        "Draft updated. Route and feasibility results remain unavailable.",
      );
    },
    [region],
  );

  const inspect = useCallback((id: string) => {
    setSelected(id);
    setModal("target");
  }, []);

  const handlePlaceWaypoint = useCallback(
    (coords: MarsGeographicCoordinates) => {
      const isFirst = activePlan.waypoints.length === 0;
      const role: WaypointRole = isFirst ? "base" : "intermediate";
      const defaultLabel = isFirst
        ? "Base Camp"
        : `Waypoint ${activePlan.waypoints.length + 1}`;
      const newWp = createWaypoint({
        coordinates: coords,
        role,
        label: defaultLabel,
        provenance: "user_planning_input",
      });
      const updatedPlan = addWaypoint(activePlan, newWp);
      const updatedMission = syncMissionWithWaypointPlan(
        mission,
        updatedPlan,
        region,
      );
      updateMission(updatedMission);
      setSelectedWaypointId(newWp.id);
      setMessage(
        `${isFirst ? "Base Camp" : newWp.label} placed at ${coords.latitude >= 0 ? "+" : ""}${coords.latitude.toFixed(4)}°N, ${coords.longitude_east.toFixed(4)}°E.`,
      );
    },
    [activePlan, mission, region, updateMission],
  );

  const handleWaypointAdd = useCallback(
    (waypoint: MarsWaypoint, index?: number) => {
      const updatedPlan = addWaypoint(activePlan, waypoint, index);
      const updatedMission = syncMissionWithWaypointPlan(
        mission,
        updatedPlan,
        region,
      );
      updateMission(updatedMission);
      setSelectedWaypointId(waypoint.id);
      setMessage(`Added waypoint "${waypoint.label || waypoint.id}".`);
    },
    [activePlan, mission, region, updateMission],
  );

  const handleSelectWaypoint = useCallback(
    (id: string) => {
      setSelectedWaypointId(id);
      setPanel("plan");
      setExpanded(true);
      setCollapsed(false);
      setPlanSubView("waypoints");
      const wp = activePlan.waypoints.find((w) => w.id === id);
      if (wp) {
        setMessage(`Selected waypoint: ${wp.label || wp.id}`);
      }
    },
    [activePlan.waypoints],
  );

  const handlePlacementError = useCallback((err: string) => {
    setMessage(err);
  }, []);

  const handleRequestMapPlacement = useCallback(() => {
    if (region.map.visualization.status !== "available") {
      setMessage(
        "Interactive map placement requires georeferenced scientific map coverage.",
      );
      return;
    }
    setIsPlacingOnMap((prev) => {
      const next = !prev;
      if (next) {
        setExpanded(false);
      }
      setMessage(
        next
          ? "Waypoint placement active. Click on the map to place a waypoint. Press Escape to cancel."
          : "Waypoint placement canceled.",
      );
      return next;
    });
  }, [region.map.visualization.status]);

  const handleCancelPlacement = useCallback(() => {
    setIsPlacingOnMap(false);
    setMessage("Waypoint placement canceled.");
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const parsed = regionIdSchema.safeParse(
        new URLSearchParams(location.search).get("region"),
      );
      const initial = parsed.success ? parsed.data : "jezero";
      setRegionId(initial);
      try {
        const stored = readMissions(localStorage);
        const latest = stored.find((m) => m.region === initial);
        setMission(
          latest
            ? parseMission(latest, regions[initial])
            : newMission(regions[initial]),
        );
      } catch {
        setStorageError(
          "Saved mission data could not be read. Existing browser data has been left untouched. Import a valid backup or export your current draft.",
        );
        setMission(newMission(regions[initial]));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  function changeRegion(id: RegionId) {
    drafts.current[regionId] = mission;
    let next = drafts.current[id];
    if (!next) {
      try {
        const stored = readMissions(localStorage).find((m) => m.region === id);
        if (stored) next = parseMission(stored, regions[id]);
      } catch {
        setStorageError(
          "Saved plans could not be read. Existing storage has not been overwritten.",
        );
      }
    }
    setRegionId(id);
    setMission(next ?? newMission(regions[id]));
    setSelected(null);
    setModal(null);
    setPreview(false);
    setIsPlacingOnMap(false);
    setSelectedWaypointId(null);
    setPanel("science");
    setPlanSubView("objectives");
    setEditingWaypointId(null);
    setExpanded(false);
    history.replaceState(null, "", `?region=${id}`);
    setMessage(
      `${regions[id].name} opened. Regional drafts are retained during this session.`,
    );
  }
  function toggleStop(id: string) {
    updateMission({
      target_ids: mission.target_ids.includes(id)
        ? mission.target_ids.filter((t) => t !== id)
        : [...mission.target_ids, id],
    });
    setMessage(
      mission.target_ids.includes(id)
        ? "Objective removed from mission."
        : "Objective added to draft. Location verification required.",
    );
  }
  function showPanel(next: Panel) {
    setPanel(next);
    setExpanded(true);
    setCollapsed(false);
  }
  function save() {
    if (!mission.name.trim()) {
      showPanel("plan");
      setMessage("Enter a mission name before saving.");
      requestAnimationFrame(() =>
        document.getElementById("mission-name")?.focus(),
      );
      return;
    }
    try {
      const plans = saveMission(localStorage, mission);
      setSaved(plans);
      setMission(plans[0]);
      setDirty(false);
      setStorageError("");
      setMessage(
        "Mission saved in this browser. Scientific status remains Unverified.",
      );
    } catch {
      setStorageError(
        "Could not save this mission. Browser storage may be full, blocked or contain unreadable records. Export JSON to keep your draft; existing data has not been deleted.",
      );
    }
  }
  function openSaved() {
    try {
      setSaved(readMissions(localStorage));
      setStorageError("");
    } catch {
      setSaved([]);
      setStorageError(
        "Saved mission records are unreadable. Existing data has not been changed. You can import a valid JSON backup.",
      );
    }
    setModal("saved");
  }
  function openMission(value: unknown) {
    try {
      const parsed = missionSchema.parse(value);
      const validated = parseMission(parsed, regions[parsed.region]);
      drafts.current[regionId] = mission;
      setRegionId(validated.region);
      setMission(validated);
      setSelected(null);
      setPreview(false);
      setIsPlacingOnMap(false);
      setSelectedWaypointId(null);
      setModal(null);
      setPanel("plan");
      setPlanSubView("objectives");
      setEditingWaypointId(null);
      setExpanded(true);
      setCollapsed(false);
      setDirty(true);
      setStorageError("");
      history.replaceState(null, "", `?region=${validated.region}`);
      setMessage(
        "Mission opened. Check dataset versions and evidence before calculation.",
      );
    } catch {
      setStorageError(
        "This file is not a supported Marswalk mission, or its objectives are missing from the current catalog. The current draft was preserved.",
      );
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setStorageError("Mission JSON must be smaller than 1 MB.");
      return;
    }
    try {
      openMission(JSON.parse(await file.text()));
    } catch {
      setStorageError(
        "The selected file is not valid JSON. Your current draft was preserved.",
      );
    }
  }
  const exportJson = () =>
    downloadFile(
      `marswalk-${regionId}-mission.json`,
      JSON.stringify(mission, null, 2),
      "application/json",
    );
  const openBrief = () => {
    setGeneratedAt(new Date().toISOString());
    setModal("brief");
  };

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#task-content"
        onClick={() => {
          setExpanded(true);
          setCollapsed(false);
        }}
      >
        Skip to planning controls
      </a>
      <header className="app-header">
        <a className="brand" href="?region=jezero" aria-label="Marswalk home">
          <span className="brand-symbol" aria-hidden="true">
            M
          </span>
          <span>
            Marswalk
            <span className="brand-subtitle">Surface mission planner</span>
          </span>
        </a>
        <div className="header-divider" />
        <div className="region-picker">
          <label className="eyebrow" htmlFor="region">
            Mission region
          </label>
          <select
            id="region"
            name="region"
            value={regionId}
            onChange={(e) => changeRegion(e.target.value as RegionId)}
          >
            {regionIds.map((id) => (
              <option key={id} value={id}>
                {regions[id].name}
              </option>
            ))}
          </select>
        </div>
        <div className="header-status">
          <span className="status-dot" />
          <span>
            Research interface
            <span className="supporting">
              {online
                ? region.map.visualization.status === "available"
                  ? "Map available · Planning unverified"
                  : "Scientific data pending"
                : "Offline · Local plans available"}
            </span>
          </span>
        </div>
        <nav className="header-actions" aria-label="Mission files">
          <button onClick={openSaved} aria-label="Open saved missions">
            <FolderOpen size={18} />
            <span>Open</span>
          </button>
          <button onClick={save} aria-label="Save mission">
            <Save size={18} />
            <span>Save</span>
          </button>
          <button onClick={openBrief} aria-label="Open mission brief">
            <FileText size={18} />
            <span>Brief</span>
          </button>
        </nav>
      </header>
      <main
        className={`workspace ${expanded ? "sheet-expanded" : ""} ${collapsed ? "panel-collapsed" : ""} ${target ? "has-selection" : ""}`}
      >
        <aside className="task-panel" aria-label="Mission planning">
          <button
            className="sheet-handle"
            aria-expanded={expanded}
            aria-controls="task-content"
            onClick={() => setExpanded((v) => !v)}
          >
            <span className="handle-bar" />
            <span>
              {expanded
                ? "Collapse planning panel"
                : `Plan · ${mission.target_ids.length} ${mission.target_ids.length === 1 ? "objective" : "objectives"}`}
            </span>
            {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <div className="panel-top">
            <button
              className="region-overview-button"
              onClick={() => setModal("sites")}
            >
              <Globe2 size={16} />
              Region overview
              <ArrowUpRight size={16} />
            </button>
            <button
              className="icon-button collapse-desktop"
              aria-label="Collapse planning panel"
              onClick={() => {
                setCollapsed(true);
                requestAnimationFrame(() =>
                  document
                    .querySelector<HTMLElement>(
                      '[aria-label="Open planning panel"]',
                    )
                    ?.focus(),
                );
              }}
            >
              <PanelLeftClose size={19} />
            </button>
          </div>
          <nav className="panel-tabs" aria-label="Planning views">
            {(
              [
                ["science", "Science"],
                ["plan", "Plan"],
                ["compare", "Review"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                aria-current={panel === key ? "page" : undefined}
                onClick={() => showPanel(key)}
              >
                {label}
                {key === "plan" && (
                  <span className="tab-count mono">
                    {mission.target_ids.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="panel-scroll" id="task-content" tabIndex={-1}>
            {!online && (
              <Notice title="Offline">
                Saved plans remain available. New calculations and uncached
                scientific layers are unavailable.
              </Notice>
            )}
            {storageError && (
              <div className="error-notice" role="alert">
                {storageError}
                <button onClick={exportJson}>Export current draft JSON</button>
              </div>
            )}
            {stale && (
              <Notice title="Revalidation required">
                This plan uses {mission.dataset_version}; the current catalog is{" "}
                {region.dataset_version}. Previous scientific results must not
                be reused.
              </Notice>
            )}
            {panel === "science" && (
              <>
                <details className="science-question">
                  <summary>The science question</summary>
                  <p>{region.scientific_context.question}</p>
                </details>
                <TargetCatalog
                  region={region}
                  selected={selected}
                  stops={mission.target_ids}
                  onInspect={inspect}
                  onToggle={toggleStop}
                />
              </>
            )}
            {panel === "plan" && (
              <>
                <div
                  className="segmented"
                  style={{ marginBottom: "1rem" }}
                  role="tablist"
                  aria-label="Planning views sub-navigation"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={planSubView === "objectives"}
                    className={planSubView === "objectives" ? "active" : ""}
                    onClick={() => setPlanSubView("objectives")}
                  >
                    Science Objectives ({mission.target_ids.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={planSubView === "waypoints"}
                    className={planSubView === "waypoints" ? "active" : ""}
                    onClick={() => setPlanSubView("waypoints")}
                  >
                    Surface Waypoints ({activePlan.waypoints.length})
                  </button>
                </div>
                {planSubView === "objectives" ? (
                  <MissionEditor
                    mission={mission}
                    region={region}
                    onChange={updateMission}
                    onScience={() => showPanel("science")}
                    onSwitchToWaypoints={() => setPlanSubView("waypoints")}
                  />
                ) : (
                  <WaypointEditor
                    plan={activePlan}
                    regionName={region.name}
                    hasScientificMap={region.map.visualization.status === "available"}
                    editingWaypointId={editingWaypointId}
                    selectedWaypointId={selectedWaypointId}
                    isPlacingOnMap={isPlacingOnMap}
                    onRequestMapPlacement={handleRequestMapPlacement}
                    onSelectWaypoint={handleSelectWaypoint}
                    onWaypointAdd={handleWaypointAdd}
                    onPlanNameChange={(name) => {
                      const updatedPlan = { ...activePlan, name };
                      const updatedMission = syncMissionWithWaypointPlan(
                        mission,
                        updatedPlan,
                        region,
                      );
                      updateMission(updatedMission);
                    }}
                    onModeChange={(mode, recoveryAssumption) => {
                      const updatedPlan = setTrajectoryMode(
                        activePlan,
                        mode,
                        recoveryAssumption,
                      );
                      const updatedMission = syncMissionWithWaypointPlan(
                        mission,
                        updatedPlan,
                        region,
                      );
                      updateMission(updatedMission);
                    }}
                    onRecoveryAssumptionChange={(recoveryAssumption) => {
                      const updatedPlan = {
                        ...activePlan,
                        recovery_assumption: recoveryAssumption,
                      };
                      const updatedMission = syncMissionWithWaypointPlan(
                        mission,
                        updatedPlan,
                        region,
                      );
                      updateMission(updatedMission);
                    }}
                    onWaypointMove={(waypointId, delta) => {
                      const updatedPlan = moveWaypoint(
                        activePlan,
                        waypointId,
                        delta,
                      );
                      const updatedMission = syncMissionWithWaypointPlan(
                        mission,
                        updatedPlan,
                        region,
                      );
                      updateMission(updatedMission);
                    }}
                    onWaypointRemove={(waypointId) => {
                      const updatedPlan = removeWaypoint(
                        activePlan,
                        waypointId,
                      );
                      const updatedMission = syncMissionWithWaypointPlan(
                        mission,
                        updatedPlan,
                        region,
                      );
                      updateMission(updatedMission);
                    }}
                    onWaypointUpdate={(waypointId, patch) => {
                      const updatedPlan = updateWaypoint(
                        activePlan,
                        waypointId,
                        patch,
                      );
                      const updatedMission = syncMissionWithWaypointPlan(
                        mission,
                        updatedPlan,
                        region,
                      );
                      updateMission(updatedMission);
                    }}
                    onStartEditing={(waypointId) =>
                      setEditingWaypointId(waypointId)
                    }
                    onStopEditing={() => setEditingWaypointId(null)}
                    onSetOrigin={(waypoint) => {
                      const updatedPlan = setOrigin(activePlan, waypoint);
                      const updatedMission = syncMissionWithWaypointPlan(
                        mission,
                        updatedPlan,
                        region,
                      );
                      updateMission(updatedMission);
                    }}
                    onSetDestination={(waypoint) => {
                      const updatedPlan = setDestination(activePlan, waypoint);
                      const updatedMission = syncMissionWithWaypointPlan(
                        mission,
                        updatedPlan,
                        region,
                      );
                      updateMission(updatedMission);
                    }}
                    onExploreScience={() => showPanel("science")}
                  />
                )}
              </>
            )}
            {panel === "compare" && (
              <RouteComparison
                mission={mission}
                region={region}
                online={online}
                onEvidence={() => showPanel("evidence")}
              />
            )}
            {panel === "layers" && (
              <LayerManager
                region={region}
                layerStates={layerStates}
                onLayerChange={(id: string, change: Partial<LayerState>) =>
                  setLayerStates((current) =>
                    updateLayerState(region, current, id, change),
                  )
                }
                preview={preview}
                setPreview={setPreview}
                contours={contours}
                setContours={setContours}
                markers={markers}
                setMarkers={setMarkers}
                opacity={opacity}
                setOpacity={setOpacity}
                onEvidence={() => showPanel("evidence")}
              />
            )}
            {panel === "evidence" && <EvidenceDetails region={region} />}
          </div>
          <div className="mission-summary">
            <div className="summary-line">
              <span>
                <strong>
                  {mission.target_ids.length}{" "}
                  {mission.target_ids.length === 1 ? "objective" : "objectives"}
                </strong>
                <span className="supporting">Return margin unavailable</span>
                {target && (
                  <span className="supporting" title={target.title}>
                    Selected: {target.title}
                  </span>
                )}
              </span>
              <Badge tone="caution">Unverified</Badge>
            </div>
            <button
              className="primary full"
              onClick={() =>
                showPanel(panel === "compare" ? "plan" : "compare")
              }
            >
              {panel === "compare" ? "Edit mission plan" : "Review mission"}
              <ArrowUpRight size={18} />
            </button>
          </div>
        </aside>
        <MapWorkspace
          region={region}
          preview={preview}
          setPreview={setPreview}
          selected={selected}
          stops={mission.target_ids}
          onInspect={inspect}
          onLayers={() => showPanel("layers")}
          onEvidence={() => showPanel("evidence")}
          onExpand={() => {
            setCollapsed(false);
            setExpanded(true);
          }}
          collapsed={collapsed}
          contours={contours}
          showMarkers={markers}
          opacity={opacity}
          layerStates={layerStates}
          plan={activePlan}
          isPlacingOnMap={isPlacingOnMap}
          onPlaceWaypoint={handlePlaceWaypoint}
          onCancelPlacement={handleCancelPlacement}
          selectedWaypointId={selectedWaypointId}
          onSelectWaypoint={handleSelectWaypoint}
          onPlacementError={handlePlacementError}
        />
      </main>
      <footer className="app-status">
        <span>
          <span className="status-dot" />
          {dirty ? "Unsaved draft" : "Draft workspace"}
          <span className="status-separator">/</span>Pre-mission planning only
        </span>
        <button onClick={() => showPanel("evidence")}>
          <CircleHelp size={14} />
          Data and limitations
        </button>
      </footer>
      <div className="sr-only" role="status" aria-live="polite">
        {message}
      </div>
      {modal === "target" && target && (
        <Dialog title={target.title} onClose={() => setModal(null)}>
          <TargetDetails
            target={target}
            region={region}
            added={mission.target_ids.includes(target.id)}
            onToggle={() => toggleStop(target.id)}
          />
        </Dialog>
      )}
      {modal === "sites" && (
        <Dialog title="Exploration regions" onClose={() => setModal(null)} wide>
          <p>One mission-planning workspace. Three scientific contexts.</p>
          <div className="region-cards">
            {regionIds.map((id) => (
              <button
                className="region-card"
                key={id}
                onClick={() => changeRegion(id)}
              >
                <span className="eyebrow">
                  {regions[id].scientific_context.mission}
                </span>
                <h3>{regions[id].name}</h3>
                <p>{regions[id].scientific_context.question}</p>
                <Badge>
                  {regions[id].region_status === "planned"
                    ? "Planned mission area"
                    : "Exploration context"}
                </Badge>
                <span className="region-open">
                  Open workspace <ArrowUpRight size={18} />
                </span>
              </button>
            ))}
          </div>
          {regionIds.every(
            (id) => regions[id].map.visualization.status === "unavailable",
          ) && (
            <Notice title="Scientific map integration pending">
              No source-verified orbital image, target coordinates or routing
              coverage is bundled for any region.
            </Notice>
          )}
        </Dialog>
      )}
      {modal === "saved" && (
        <Dialog title="Saved missions" onClose={() => setModal(null)}>
          <p>
            Plans are stored in this browser without an account. Export a JSON
            backup to move between devices.
          </p>
          {storageError && (
            <p role="alert" className="error-notice">
              {storageError}
            </p>
          )}
          <div className="file-actions">
            <button onClick={exportJson}>
              <Download size={17} />
              Export draft JSON
            </button>
            <label className="file-button">
              <Upload size={17} />
              Import mission
              <input
                type="file"
                accept=".json,application/json"
                aria-label="Import mission JSON"
                onChange={(e) => void importFile(e.target.files?.[0])}
              />
            </label>
          </div>
          {saved.length ? (
            <ul className="saved-list">
              {saved.map((plan) => (
                <li key={plan.id}>
                  <div>
                    <strong>{plan.name}</strong>
                    <p>
                      {regions[plan.region].name} · {plan.target_ids.length}{" "}
                      objectives
                    </p>
                    <span className="supporting">
                      {plan.saved_at
                        ? new Date(plan.saved_at).toLocaleString()
                        : "Not saved"}
                    </span>
                    {plan.dataset_version !==
                      regions[plan.region].dataset_version && (
                      <Badge tone="caution">Revalidation required</Badge>
                    )}
                  </div>
                  <button
                    onClick={() => openMission(plan)}
                    aria-label={`Open ${plan.name}`}
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-list">
              <h3>No saved missions available</h3>
              <p>
                Save a draft from the workspace, or import a mission JSON file.
              </p>
            </div>
          )}
        </Dialog>
      )}
      {modal === "brief" && (
        <Dialog title="Mission brief" onClose={() => setModal(null)} wide>
          <MissionBrief
            mission={mission}
            region={region}
            generatedAt={generatedAt}
          />
        </Dialog>
      )}
    </div>
  );
}
