"""Independent I4A path audit: no routing algorithms imported; original native validation equations reused."""
import importlib.util,json,shutil
from pathlib import Path
spec=importlib.util.spec_from_file_location("independent",Path(__file__).with_name("verify-routing-independent.py"))
independent=importlib.util.module_from_spec(spec)
spec.loader.exec_module(independent)
Path("output/routing-qa").mkdir(parents=True,exist_ok=True)
for region in ["gale","jezero"]:
    shutil.copyfile(f"docs/evidence/i4a/{region}-routes.json",f"output/routing-qa/{region}.json")
report={region:independent.check_region(region) for region in ["gale","jezero"]}
report["native_source_reaggregation"]="Not repeated: committed genuine numeric grids preserved; full-resolution native Jezero source not required for runtime/path validation."
Path("docs/evidence/i4a/independent-numerical.json").write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(report,indent=2))
